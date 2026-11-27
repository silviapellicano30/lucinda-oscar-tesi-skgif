// Load-time measurement (test tool; remove it by deleting its line in browser.html).
// Off by default: switched on only from tools/measurements.html (sessionStorage 'skgifTiming', valid for the browser tab).
// Every measure is also recorded as a W3C User Timing mark (performance.mark, same name as in the CSV; measures taken
// from a "Load all" click also as performance.measure from the click), visible in the Performance panel of DevTools.
// When on: every SKG-IF call bypasses the server cache (&preview=true), SKG-IF and Index calls bypass the browser
// cache (no-store), and the Console shows the times: page/results shown, all citations/references/publications
// downloaded, person citations and their chart, citation record charts.
// Inside measurements.html (iframe) it presses the "Load all" buttons by itself and sends the times to the measurement page.
// It does not touch the other files: it wraps fetch and _skgifPagedList, and detects page changes with a
// MutationObserver (not throttled by Chrome in hidden tabs, unlike setInterval).
// Every time carries the problems of its run (server error, items not downloaded, hidden tab, browser offline) and
// the counters of the API calls made so far (calls and their types, HTTP errors, network errors and timeouts, cut answers,
// pages split into smaller ones), the time spent waiting for the API (at least one call open) and the work of the page itself
// (time the code kept the page busy, longest block, memory): together they separate the time of the interface from
// the time of the API.

(function () {
  let conf = null;
  try { conf = JSON.parse(sessionStorage.getItem('skgifTiming') || 'null'); } catch (e) { conf = null; }
  if (!conf) return;

  const embedded = window.parent !== window; // page opened by measurements.html
  const now = () => performance.now(); // ms since the page was opened
  const sec = ms => Math.round(ms / 100) / 10;
  const apiBase = typeof SKGIF_API === 'string' ? SKGIF_API : 'https://api.opencitations.net/skg-if/';
  const indexBase = typeof OC_INDEX_API === 'string' ? OC_INDEX_API : 'https://api.opencitations.net/index/';
  // Counters since the page was opened. http_404 is not an error: it means "no results" (SKG-IF standard).
  // truncated_responses = answers with status 200 whose JSON is incomplete (the server cut the response).
  const stats = { skgif_calls: 0, index_calls: 0, http_404: 0, http_429: 0, http_other_errors: 0, network_errors: 0, truncated_responses: 0,
    page_splits: 0, api_wait_ms: 0, long_tasks_ms: 0, longest_task_ms: 0, heap_peak_mb: null, calls_by_type: {} };

  // Type of an API call, named as in the API: endpoint and filter names exactly as they appear in the URL, e.g.
  // "products/{id}" (one record), "products?cf.cites" (citations of a product), "persons?cf.search.given_name,
  // cf.search.family_name"; " [page_size=1]" is added to calls that read only the total; Index calls as "index/<operation>".
  const callType = url => {
    const [path, query = ''] = url.slice(url.startsWith(indexBase) ? indexBase.length : apiBase.length).split('?');
    const parts = path.split('/').filter(Boolean);
    if (url.startsWith(indexBase)) return `index/${parts[0] || ''}`;
    if (parts.length > 1) return `${parts[0]}/{id}`;
    const params = new URLSearchParams(query);
    const filters = (params.get('filter') || '').split(',').map(f => f.split(':')[0]).filter(Boolean);
    return `${parts[0] || ''}${filters.length ? '?' + filters.join(',') : ''}${params.get('page_size') === '1' ? ' [page_size=1]' : ''}`;
  };
  // "products?cf.cites [page_size=1]: 10; products/{id}: 1", most frequent types first.
  const typesText = types => Object.entries(types).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([type, n]) => `${type}: ${n}`).join('; ');

  // Time spent waiting for the API: periods in which at least one SKG-IF or Index call is open, from the request to
  // the end of the reading of its answer (overlapping calls are counted once). The rest of the measured time belongs
  // to the interface (code, drawing of the page, its own files).
  let openCalls = 0, waitStart = 0;
  const apiWait = () => stats.api_wait_ms + (openCalls ? now() - waitStart : 0);
  const callOpened = () => { if (openCalls++ === 0) waitStart = now(); };
  const callClosed = () => { if (--openCalls === 0) stats.api_wait_ms += now() - waitStart; };

  // Work of the page itself (Long Tasks API, W3C): every block of more than 50 ms in which the code kept the page
  // busy (the page does not react to clicks meanwhile). long_tasks_ms = sum of the blocks, longest_task_ms = longest one.
  // Shorter work is not reported by the browser, so long_tasks_ms slightly underestimates the time of the code; the rest
  // of the measured time is spent waiting for the API. buffered: also the blocks before this script was loaded.
  try {
    new PerformanceObserver(list => list.getEntries().forEach(task => {
      stats.long_tasks_ms += Math.round(task.duration);
      stats.longest_task_ms = Math.max(stats.longest_task_ms, Math.round(task.duration));
    })).observe({ type: 'longtask', buffered: true });
  } catch (e) { stats.long_tasks_ms = stats.longest_task_ms = null; } // browser without the Long Tasks API
  // Highest JavaScript memory of the page, sampled every second (performance.memory: Chrome only, else null).
  const sampleHeap = () => {
    if (!performance.memory) return;
    stats.heap_peak_mb = Math.max(stats.heap_peak_mb || 0, Math.round(performance.memory.usedJSHeapSize / 1e5) / 10);
  };
  sampleHeap();
  setInterval(sampleHeap, 1000);
  const clickTimes = {}; // list (prefix) -> time of the click on its "Load all" button
  const clickStats = {}; // list (prefix) -> API waiting and busy time at that click
  let wasHidden = document.hidden; // tab hidden during the run: Chrome slows the page down, times not reliable
  document.addEventListener('visibilitychange', () => { if (document.hidden) wasHidden = true; });
  // Browser offline during the run (local network down): a problem of the measuring computer, not of the API.
  let wasOffline = !navigator.onLine;
  window.addEventListener('offline', () => { wasOffline = true; });

  // Every SKG-IF and Index call: &preview=true (no server cache, SKG-IF only) and no-store (no browser cache);
  // the answer is counted by status (network_errors = no answer at all, including the calls aborted by a timeout).
  // A call stays open until its answer is read; an error answer (often not read) closes it when it arrives.
  // After a 429 the interface waits before asking again: that pause is caused by the API, so the call stays open
  // until the same URL is requested again (or at most RETRY_PAUSE_MS, when no retry follows).
  const RETRY_PAUSE_MS = 12000;
  const waitingRetry = {}; // url -> function that closes the call answered with 429
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input && input.url;
    const skgif = url && url.startsWith(apiBase);
    const index = url && url.startsWith(indexBase);
    if (!skgif && !index) return originalFetch(input, init);
    stats[skgif ? 'skgif_calls' : 'index_calls']++;
    const type = callType(url);
    stats.calls_by_type[type] = (stats.calls_by_type[type] || 0) + 1;
    callOpened();
    if (waitingRetry[url]) waitingRetry[url](); // the retry is open: the pause before it ends here
    let open = true;
    const close = () => {
      if (!open) return;
      open = false;
      if (waitingRetry[url] === close) delete waitingRetry[url];
      callClosed();
    };
    const finalUrl = skgif && conf.preview ? `${url}${url.includes('?') ? '&' : '?'}preview=true` : url;
    return originalFetch(finalUrl, { ...(init || {}), cache: 'no-store' }).then(response => {
      if (response.status === 404) stats.http_404++;
      else if (response.status === 429) stats.http_429++;
      else if (!response.ok) stats.http_other_errors++;
      if (response.status === 429) {
        waitingRetry[url] = close;
        setTimeout(close, RETRY_PAUSE_MS);
      } else if (!response.ok) close();
      // Body that cannot be read as JSON: cut by the server (a timeout while reading it is a network error).
      const readJson = response.json.bind(response);
      response.json = () => readJson().then(data => { close(); return data; }, error => {
        close();
        stats[error && error.name === 'AbortError' ? 'network_errors' : 'truncated_responses']++;
        throw error;
      });
      const readText = response.text.bind(response);
      response.text = () => readText().finally(close);
      return response;
    }, error => {
      close();
      stats.network_errors++;
      throw error;
    });
  };

  // A page that did not arrive and is requested again in smaller pages (50 -> 10 -> 1, core.js).
  if (typeof skgifSplitRange === 'function') {
    const originalSplit = skgifSplitRange;
    window.skgifSplitRange = (...args) => {
      stats.page_splits++;
      return originalSplit(...args);
    };
  }

  // Problems visible in the page: service unavailable message or Lucinda error.
  const unavailableText = typeof SKGIF_UNAVAILABLE_TEXT === 'string' ? SKGIF_UNAVAILABLE_TEXT : 'temporarily unable to answer';
  const pageProblems = () => {
    const problems = [];
    if ((document.body.innerText || '').includes(unavailableText)) problems.push('server unavailable');
    if (document.querySelector('.lucinda-error-msg')) problems.push('error: ' + document.querySelector('.lucinda-error-msg').textContent.trim().slice(0, 80));
    return problems;
  };

  const done = {};
  const report = (event, data = {}, problems = []) => {
    if (done[event]) return;
    done[event] = true;
    problems = [...problems, ...pageProblems()];
    sampleHeap();
    const entry = { event, ms: Math.round(now()), stats: { ...stats, api_wait_ms: Math.round(apiWait()), calls_by_type: typesText(stats.calls_by_type) }, hidden: wasHidden,
      offline: wasOffline, problems, ...data };
    const waited = data.apiWaitFromClickMs != null ? data.apiWaitFromClickMs : entry.stats.api_wait_ms;
    const extra = [data.total != null ? `${data.total} items` : '', data.fromClickMs != null ? `${sec(data.fromClickMs)} s from the click` : '',
      `${sec(waited)} s waiting for the API`, `${stats.skgif_calls} SKG-IF calls`, stats.index_calls ? `${stats.index_calls} Index calls` : '',
      ...problems.map(p => '⚠ ' + p), wasHidden ? '⚠ tab hidden during the run' : '', wasOffline ? '⚠ browser offline during the run' : ''].filter(Boolean).join(', ');
    try {
      performance.mark(event, { detail: { total: data.total ?? null, problems } });
      if (data.fromClickMs != null) performance.measure(`${event} (from the click)`, { start: entry.ms - data.fromClickMs, end: entry.ms });
    } catch (e) { /* browser without User Timing Level 3 */ }
    console.log(`[SKG-IF timing] ${event}: ${sec(entry.ms)} s (${extra}) [calls: ${entry.stats.calls_by_type}]`);
    if (embedded) window.parent.postMessage({ skgifTiming: entry, href: location.href }, '*');
  };
  if (embedded) window.parent.postMessage({ skgifTiming: { event: 'start' } }, '*'); // the measurement page knows the tool is active

  // Paged lists (citations, references, publications): end of the full download.
  const listNames = { 'br-cits': 'all_citations', 'br-refs': 'all_references', 'org-pubs': 'all_publications' };
  const loading = new Set(); // lists currently downloading
  if (typeof _skgifPagedList === 'function') {
    const originalPagedList = _skgifPagedList;
    window._skgifPagedList = options => {
      const list = originalPagedList(options);
      const event = listNames[options.prefix];
      if (!event) return list;
      if (list.failed || !list.total) {
        report(event, { total: list.total || 0 }, list.failed ? ['list not downloaded'] : []);
        return list;
      }
      let started = null, clicked = null, atClick = null;
      const originalLoadAll = list.loadAll;
      list.loadAll = (...args) => {
        if (started === null) {
          started = now();
          const click = clickTimes[options.prefix];
          clicked = click !== undefined && started - click < 1000 ? click : null; // started from its own button
          atClick = clicked !== null ? clickStats[options.prefix] : null;
          loading.add(event);
        }
        return originalLoadAll(...args);
      };
      list.onLoaded(() => {
        loading.delete(event);
        const missing = list.missing();
        // Measured from the click: waiting and busy time also counted from the click.
        const fromClick = clicked === null ? {} : {
          fromClickMs: Math.round(now() - clicked),
          apiWaitFromClickMs: Math.round(apiWait() - atClick.wait),
          busyFromClickMs: stats.long_tasks_ms === null ? null : stats.long_tasks_ms - atClick.busy
        };
        report(event, { total: list.total, ...fromClick }, missing ? [`${missing} not downloaded`] : []);
        queueMicrotask(check); // now the button of the next list can be pressed
      });
      return list;
    };
  }

  // "Load all" buttons (chart and lists); the "Search" buttons have the same class but are type=submit.
  const LOAD_BUTTONS = 'button.br-load-chart[type=button]';

  // Time of the click on a "Load all" button (manual or automatic), for its list: the list button (<prefix>-load)
  // or the chart button (#br-cits-chart = citations, #org-chart = publications).
  const chartLists = { 'br-cits-chart': 'br-cits', 'org-chart': 'org-pubs' };
  document.addEventListener('click', e => {
    const button = e.target.closest && e.target.closest(LOAD_BUTTONS);
    if (!button) return;
    const chart = button.closest('[id]');
    const prefix = button.id.endsWith('-load') ? button.id.slice(0, -'-load'.length) : chartLists[chart && chart.id];
    if (prefix) {
      clickTimes[prefix] = now();
      clickStats[prefix] = { wait: apiWait(), busy: stats.long_tasks_ms };
    }
  }, true);

  // One "Load all" button at a time (chart or list; also in the hidden tab), only when no list is downloading;
  // each button only once.
  const clicked = new WeakSet();
  const autoClick = () => {
    if (!embedded || !conf.autoClick || loading.size) return;
    const button = [...document.querySelectorAll(LOAD_BUTTONS)].find(b => !b.classList.contains('d-none') && !b.disabled && !clicked.has(b));
    if (!button) return;
    clicked.add(button);
    button.click();
  };

  const count = id => Number((document.getElementById(id)?.textContent || '').replace(/\D/g, '')) || null;

  // Check of the page at every change.
  let finished = false;
  function check() {
    if (finished) return;
    const root = document.getElementById('__lucinda__');
    const ready = root && root.children.length && !document.getElementById('lucinda_pendinghtml_main_loading')
      && !document.documentElement.classList.contains('skgif-id-pending');
    if (!ready) return;
    if (document.querySelector('.skgif-id-loading')) { // search page: first page of results
      const results = document.getElementById('search-results-container');
      if (results && results.children.length && !results.querySelector('.skgif-page-loading')) {
        report('first_results', { total: count('search-total-count') });
        finished = true;
        observer.disconnect();
      }
      return;
    }
    report('page_shown');
    const sortButton = document.querySelector('#ra-sort button'); // person record: Sort by enabled = all publications arrived
    if (sortButton && !sortButton.disabled && !done.all_person_publications) {
      const missing = Number(((document.getElementById('ra-pubs-chart')?.textContent || '').match(/(\d+) publications? could not be loaded/) || [])[1]) || 0;
      report('all_person_publications', { total: count('search-total-count') }, missing ? [`${missing} not downloaded`] : []);
    }
    // Person record, citations received (after all publications): total count (SKG-IF), then per-year chart (Index);
    // total = number of publications, which drives the number of calls.
    const citeCount = document.getElementById('ra-cits-count');
    const citeNote = document.getElementById('ra-cits-note');
    if (citeCount && /\d/.test(citeCount.textContent) && !citeNote?.querySelector('.skgif-loading-note')) {
      const notCounted = /could not be counted/.test(citeNote?.textContent || '') ? ['publications not counted'] : [];
      report('person_citations', { total: count('search-total-count') }, notCounted);
      const citeChart = document.getElementById('ra-cits-chart');
      if (citeChart && citeChart.innerHTML.trim() && !citeChart.querySelector('.skgif-loading-note')) {
        report('person_citation_chart', { total: count('search-total-count') }, /could not be loaded|not available/.test(citeChart.textContent) ? ['citation dates not loaded'] : []);
      }
    }
    // Citation record: the two "Citations per year" charts (Index API).
    const ciCharts = ['ci-citing-chart', 'ci-cited-chart'].map(id => document.getElementById(id));
    if (ciCharts.every(box => box && box.innerHTML.trim() && !/Loading/.test(box.textContent))) {
      report('ci_year_charts', {}, ciCharts.some(box => /not available/.test(box.textContent)) ? ['Index response cut'] : []);
    }
    autoClick();
  }
  const observer = new MutationObserver(check);
  const start = () => {
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled', 'style'] });
    check();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
