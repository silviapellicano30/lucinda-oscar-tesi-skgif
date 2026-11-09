// Load-time measurement (test tool; remove it by deleting its line in browser.html).
// Off by default: switched on only from tools/misure.html (sessionStorage 'skgifTiming', valid for the browser tab).
// When on: every SKG-IF call bypasses the server cache (&preview=true) and the browser cache (no-store), and the
// Console shows the times: page/results shown, all citations/references/publications/works downloaded.
// Inside misure.html (iframe) it presses the "Load all" buttons by itself and sends the times to the measurement page.
// It does not touch the other files: it wraps fetch and _skgifPagedList, and detects page changes with a
// MutationObserver (not throttled by Chrome in hidden tabs, unlike setInterval).
// Every time carries the problems of its run (server error, items not downloaded, hidden tab).

(function () {
  let conf = null;
  try { conf = JSON.parse(sessionStorage.getItem('skgifTiming') || 'null'); } catch (e) { conf = null; }
  if (!conf) return;

  const embedded = window.parent !== window; // page opened by misure.html
  const now = () => performance.now(); // ms since the page was opened
  const sec = ms => Math.round(ms / 100) / 10;
  const apiBase = typeof SKGIF_API === 'string' ? SKGIF_API : 'https://api.opencitations.net/skg-if/';
  let calls = 0; // SKG-IF calls made so far
  const clickTimes = {}; // list (prefix) -> time of the click on its "Load all" button
  let wasHidden = document.hidden; // tab hidden during the run: Chrome slows the page down, times not reliable
  document.addEventListener('visibilitychange', () => { if (document.hidden) wasHidden = true; });

  // Every SKG-IF call: &preview=true (no server cache) and no-store (no browser cache).
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input && input.url;
    if (!url || !url.startsWith(apiBase)) return originalFetch(input, init);
    calls++;
    const finalUrl = conf.preview ? `${url}${url.includes('?') ? '&' : '?'}preview=true` : url;
    return originalFetch(finalUrl, { ...(init || {}), cache: 'no-store' });
  };

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
    if (wasHidden) problems.push('tab hidden during the run');
    const entry = { event, ms: Math.round(now()), calls, problems, ...data };
    const extra = [data.total != null ? `${data.total} items` : '', data.fromClickMs != null ? `${sec(data.fromClickMs)} s from the click` : '',
      `${calls} API calls`, ...problems.map(p => '⚠ ' + p)].filter(Boolean).join(', ');
    console.log(`[SKG-IF timing] ${event}: ${sec(entry.ms)} s (${extra})`);
    if (embedded) window.parent.postMessage({ skgifTiming: entry, href: location.href }, '*');
  };
  if (embedded) window.parent.postMessage({ skgifTiming: { event: 'start' } }, '*'); // the measurement page knows the tool is active

  // Paged lists (citations, references, publications): end of the full download.
  const listNames = { 'br-cits': 'citations', 'br-refs': 'references', 'org-pubs': 'publications' };
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
      let started = null, clicked = null;
      const originalLoadAll = list.loadAll;
      list.loadAll = (...args) => {
        if (started === null) {
          started = now();
          const click = clickTimes[options.prefix];
          clicked = click !== undefined && started - click < 1000 ? click : null; // started from its own button
          loading.add(event);
        }
        return originalLoadAll(...args);
      };
      list.onLoaded(() => {
        loading.delete(event);
        const missing = list.missing();
        report(event, { total: list.total, fromClickMs: clicked !== null ? Math.round(now() - clicked) : null },
          missing ? [`${missing} not downloaded`] : []);
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
    if (prefix) clickTimes[prefix] = now();
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
        report('results', { total: count('search-total-count') });
        finished = true;
        observer.disconnect();
      }
      return;
    }
    report('page');
    const sortButton = document.querySelector('#ra-sort button'); // author profile: Sort by enabled = all works arrived
    if (sortButton && !sortButton.disabled && !done.works) {
      const missing = Number(((document.getElementById('ra-pubs-chart')?.textContent || '').match(/(\d+) publications? could not be loaded/) || [])[1]) || 0;
      report('works', { total: count('search-total-count') }, missing ? [`${missing} not downloaded`] : []);
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
