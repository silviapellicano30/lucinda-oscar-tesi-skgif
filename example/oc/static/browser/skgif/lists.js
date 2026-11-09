// Paged lists: searches, Citations/References, lists of the record pages
// (Show N entries, "1–10 of N" status, Search in titles, Sort by).

// Scrolls back to the top of the list, if the user has scrolled past it:
// (1) the page keeps its height (_skgifKeepScroll), so a short result does not make it jump up;
// (2) it scrolls only if the top of the list is hidden (above the screen or under the sticky filter bar):
// when the filter bar is on screen nothing moves.
function _skgifScrollToList(el) {
  if (!el) return;
  _skgifKeepScroll();
  const visible = sel => [...el.querySelectorAll(sel)].find(e => e.offsetParent); // hidden tabs excluded (document page)
  const bar = visible('.ra-toolbar');
  const list = visible('[id$="-list"], #search-results-container');
  const hidden = bar && list
    ? list.getBoundingClientRect().top < Math.max(0, bar.getBoundingClientRect().bottom) - 1
    : el.getBoundingClientRect().top < 0;
  if (hidden) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Note under the list bar ('' = hidden); loading = purple with animated dots.
function _skgifSetNote(id, text, loading = false) {
  const note = document.getElementById(id);
  if (!note) return;
  if (loading) note.innerHTML = _skgifEscape(text).replace('…', '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>');
  else note.textContent = text;
  note.classList.toggle('skgif-loading-note', loading);
  note.classList.toggle('text-muted', !loading);
  note.classList.toggle('small', !loading);
  note.classList.toggle('d-none', !text);
}

// Keeps the height of the list while it loads, so the page does not jump.
function _skgifHoldHeight(container) {
  if (container && !container.style.minHeight) container.style.minHeight = `${container.offsetHeight}px`;
}

// Status text of a list and its progress bar (null = hidden).
function _skgifListStatus(statusId, barId, text, fraction) {
  _skgifSetField(statusId, _skgifEscape(text));
  const bar = document.getElementById(barId);
  if (!bar) return;
  bar.classList.toggle('d-none', fraction === null);
  const inner = bar.querySelector('.progress-bar');
  if (inner && fraction !== null) inner.style.width = `${Math.round(fraction * 100)}%`;
}

// Status row with the range shown ("11–20 of 240 citations") when the list has more than one page.
// single = text for a single page; phrase = text for `count` results; from = total before filtering.
function _skgifRangeStatus(page, size, { count, single, phrase = single, from = null }) {
  if (count <= size) return single;
  const range = `${_skgifNum((page - 1) * size + 1)}–${_skgifNum(Math.min(page * size, count))}`;
  return `${range} of ${phrase}${from === null ? '' : ` (filtered from ${_skgifNum(from)})`}`;
}

// Paged lists: size of the pages requested to the API and number of parallel calls.
const SKGIF_LIST_PAGE_SIZE = 50;
const SKGIF_LIST_PARALLEL = 4;
// Up to this number of results the chart loads automatically; above it a button is needed.
const SKGIF_CHART_AUTO_LOAD = 500;
// Results per page chosen with "Show [N] entries", for each list.
const _skgifPageSizes = {};

// Paged list: downloads pages of 50 and shows 10/20/50/100; loadAll() downloads everything (chart, filters, Sort by).
function _skgifPagedList({ prefix, source, first, emptyMessage, noun, statusText, scrollId, renderCard, showTotal = true }) {
  const containerId = `${prefix}-list`;
  const total = first ? first.total : 0;
  const blockCount = Math.ceil(total / SKGIF_LIST_PAGE_SIZE);
  const blocks = {}; // page of 50 -> promise of its results
  const arrived = {}; // page of 50 -> results received
  const firstFull = first && first.items.length >= Math.min(SKGIF_LIST_PAGE_SIZE, total);
  if (firstFull) blocks[1] = Promise.resolve(first.items);
  const block = n => blocks[n] || (blocks[n] = skgifFetchRange(source, (n - 1) * SKGIF_LIST_PAGE_SIZE,
    Math.min(SKGIF_LIST_PAGE_SIZE, total - (n - 1) * SKGIF_LIST_PAGE_SIZE), SKGIF_LIST_PAGE_SIZE));
  const progressListeners = []; // download progress listeners (chart)
  const loadedListeners = []; // listeners waiting for the whole list
  let ordered = null; // sorted/filtered results, null = API order
  let inOrder = null; // all results in API order
  let all = null; // only the results received so far
  let loading = null;
  let page = 1;
  const pageSize = () => _skgifPageSizes[containerId] || SKGIF_DEFAULT_PAGE_SIZE;

  const paginator = { goToPage: p => show(p, true), refresh: () => show(1, true) };
  const active = () => _skgifPaginators[containerId] === paginator;
  let lastStatus = ['', null];
  const status = (text, fraction = null) => {
    lastStatus = [text, fraction];
    if (active()) _skgifListStatus(`${prefix}-status`, `${prefix}-progress`, text, fraction);
  };
  let info = null; // status row: { count, single, phrase, from } (_skgifRangeStatus)
  const showStatus = () => status(info ? _skgifRangeStatus(page, pageSize(), info) : '');
  const setStatus = newInfo => { info = newInfo; showStatus(); };
  _skgifPaginators[containerId] = paginator;
  if (showTotal) _skgifSetField(`${prefix}-total`, _skgifNum(_skgifCount(first ? total : null))); // during a title search the total stays the one of the whole list
  setStatus(first ? { count: total, single: statusText(total) } : null);

  const renderItems = items => items.map(item => item._skgifMissing ? _skgifMissingCard(noun) : renderCard(item)).join('');

  // Results of page p.
  function itemsOfPage(p) {
    const size = pageSize();
    const list = ordered || inOrder;
    if (list) return Promise.resolve(list.slice((p - 1) * size, p * size));
    if (p === 1 && first && first.items.length >= Math.min(size, total)) return Promise.resolve(first.items.slice(0, size));
    const from = (p - 1) * size;
    const to = Math.min(from + size, total);
    const firstBlock = Math.floor(from / SKGIF_LIST_PAGE_SIZE) + 1;
    const lastBlock = Math.floor((to - 1) / SKGIF_LIST_PAGE_SIZE) + 1;
    const needed = [];
    for (let n = firstBlock; n <= lastBlock; n++) needed.push(block(n));
    return Promise.all(needed).then(lists => {
      const skip = from - (firstBlock - 1) * SKGIF_LIST_PAGE_SIZE;
      return lists.flat().slice(skip, skip + (to - from));
    });
  }

  function show(p, scroll) {
    page = p;
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!active()) return; // another list is shown in the same place
    showStatus();
    _skgifTogglePerPage(prefix, first ? (ordered || inOrder || { length: total }).length : 0);
    if (!first || !total) container.style.minHeight = '';
    if (!first) return void (container.innerHTML = _skgifUnavailableHtml());
    if (!total) return void (container.innerHTML = emptyMessage ? `<div class="col-12"><p class="fst-italic text-muted">${_skgifEscape(emptyMessage)}</p></div>` : '');
    if (scroll) _skgifScrollToList(document.getElementById(scrollId));
    const render = items => {
      container.style.minHeight = '';
      const pageCount = Math.max(1, Math.ceil((ordered || inOrder || { length: total }).length / pageSize()));
      const cards = order === 'newest' || order === 'oldest' ? _skgifRenderWorks(items, order, renderCard) : renderItems(items); // by date: one heading per year
      container.innerHTML = items.length ? cards + _skgifPaginationBar(containerId, p, pageCount) : '';
    };
    const inMemory = ordered || inOrder;
    const pageItems = inMemory && inMemory.slice((p - 1) * pageSize(), p * pageSize());
    if (inMemory && _skgifFirstCountsReady(pageItems)) return render(pageItems); // list already downloaded: shown immediately
    _skgifHoldHeight(container);
    container.innerHTML = SKGIF_LOADING_HTML;
    // the first cards already include their citation count (_skgifWithFirstCounts, cards.js)
    (inMemory ? Promise.resolve(pageItems) : itemsOfPage(p))
      .then(items => _skgifWithFirstCounts({ items }).then(() => items)).then(items => {
      if (page !== p || !active()) return; // another page was requested in the meantime
      render(items);
    });
  }

  // Downloads all pages of 50; false if the list cannot be read.
  function loadAll() {
    if (loading) return loading;
    if (!first) return loading = Promise.resolve(false);
    const report = () => {
      const loaded = Math.min(Object.values(arrived).reduce((n, items) => n + items.length, 0), total);
      progressListeners.forEach(listener => listener(loaded, total));
    };
    const todo = Array.from({ length: blockCount }, (_, i) => i + 1);
    report();
    loading = _skgifPool(todo, SKGIF_LIST_PARALLEL, n => block(n).then(items => {
      arrived[n] = items;
      report();
    })).then(() => {
      inOrder = _skgifDedupe(Object.keys(arrived).sort((a, b) => a - b).flatMap(n => arrived[n]));
      all = inOrder.filter(item => !item._skgifMissing);
      const missing = inOrder.length - all.length;
      fullStatus = statusText(all.length) + (missing ? ` (${_skgifNum(missing)} could not be loaded)` : '');
      setStatus({ count: inOrder.length, single: fullStatus });
      loadedListeners.forEach(listener => listener());
      return true;
    });
    return loading;
  }

  // Applies sorting, filters and title search (only after loadAll()).
  let order = 'default';
  let keep = null; // filter: function on the product, null = none
  let term = ''; // words searched in the titles
  let fullStatus = '';
  function arrange() {
    if (!inOrder) return 0;
    const base = keep || term ? all.filter(p => (!keep || keep(p)) && (!term || _skgifTitleHas(p, term)))
      : order === 'default' ? null : all;
    ordered = base && _skgifSortWorks(base, order);
    const found = n => `${statusText(n)} with “${term}” in the title`;
    const count = (ordered || inOrder).length;
    if (term && keep) {
      const withTerm = all.filter(p => _skgifTitleHas(p, term)).length;
      info = { count, single: `${_skgifNum(count)} of ${found(withTerm)}`, phrase: found(count), from: withTerm };
    } else if (term) info = { count, single: found(count) };
    else if (keep) info = { count, single: `${_skgifNum(count)} of ${fullStatus}`, phrase: statusText(count), from: all.length };
    else info = { count, single: fullStatus };
    show(1, true);
    return (ordered || inOrder).length;
  }

  show(1, true);

  return {
    total,
    failed: !first,
    loadAll,
    items: () => all,
    shown: () => ordered || inOrder || [], // the list as currently shown (filters, search, order), used by Export
    missing: () => inOrder ? inOrder.length - all.length : 0,
    onProgress: listener => progressListeners.push(listener),
    onLoaded: listener => loadedListeners.push(listener),
    sort: newOrder => {
      order = newOrder;
      arrange();
    },
    filter: newKeep => {
      keep = newKeep;
      arrange();
    },
    search: newTerm => {
      term = newTerm;
      return arrange();
    },
    activate: () => { // shows this list again
      _skgifPaginators[containerId] = paginator;
      status(...lastStatus);
      show(1, true);
    }
  };
}

// Per-year chart of a list: automatic up to autoLoad, above it with a button; onYear = click on a bar.
function _skgifListChart(list, { boxId, noun, owner, label, autoLoad = SKGIF_CHART_AUTO_LOAD,
  after = Promise.resolve(), buttonText = 'Load chart', buttonNote = '', onYear }) {
  const box = document.getElementById(boxId);
  if (!box) return;
  if (list.failed) return void (box.innerHTML = '<em>Chart not available.</em>');
  if (!list.total) return void (box.innerHTML = `<em>No ${noun}s found.</em>`);

  let drawing = false;
  const draw = () => {
    if (drawing) return;
    drawing = true;
    box.innerHTML = `<div class="mb-2">Loading ${noun}s…</div>`;
    list.onProgress((loaded, total) => {
      box.innerHTML = `<div class="mb-2 skgif-loading-note">Loading ${noun}s<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span> ${_skgifNum(loaded)}/${_skgifNum(total)}</div>
        <div class="progress br-chart-progress" style="height: 6px; width: 100%;"><div class="progress-bar" style="width: ${Math.round(loaded / total * 100)}%"></div></div>`;
    });
    list.loadAll().then(() => {
      _skgifYearChart(box, list.items().map(_skgifProductRawDate), label, `No ${noun}s found.`, 200, onYear);
      const missing = list.missing();
      if (missing) box.insertAdjacentHTML('beforeend', `<div class="mt-2">${_skgifPlural(missing, noun)} could not be loaded.</div>`);
    });
  };
  if (list.total <= autoLoad) return void after.then(draw);
  box.innerHTML = `<p class="mb-3">This ${owner} has ${_skgifNum(list.total)} ${noun}s.${buttonNote ? ' ' + buttonNote : ''}</p>
    <button type="button" class="btn btn-sm br-load-chart">${buttonText}</button>`;
  box.querySelector('button').addEventListener('click', draw);
  list.onProgress(draw); // follows a download started by another button
}

// "Show [N] entries" menu (10, 20, 50, 100), hidden when one page is enough.
const SKGIF_PER_PAGE = [10, 20, 50, 100];
// Searches and Go to pages: one page = one call, and the API returns at most 50 results.
const SKGIF_SEARCH_PER_PAGE = [10, 20, 50];
// Creates the "Show [N] entries" menu of a list (only when it has more than one page).
function _skgifInitPerPage(prefix, list, containerId = `${prefix}-list`, sizes = SKGIF_PER_PAGE) {
  const box = document.getElementById(`${prefix}-perpage`);
  if (!box || box.querySelector('.skgif-dd') || list.failed || list.total <= SKGIF_DEFAULT_PAGE_SIZE) return;
  const dropdown = _skgifDropdown('Results per page', sizes.map(n => ({ value: String(n), text: String(n) })), value => {
    _skgifPageSizes[containerId] = Number(value);
    _skgifPaginators[containerId]?.refresh?.(); // back to page 1
  });
  box.appendChild(dropdown.el);
  box.insertAdjacentHTML('beforeend', '<span class="small fw-bold">entries</span>'); // "Show [10] entries"
  dropdown.enable(true);
  box.classList.remove('d-none');
}

// Shows "Show [N] entries" only when there is more than one page.
function _skgifTogglePerPage(prefix, count) {
  const box = document.getElementById(`${prefix}-perpage`);
  if (box?.querySelector('.skgif-dd')) box.classList.toggle('d-none', count <= SKGIF_DEFAULT_PAGE_SIZE);
}

// Tools of a list: filters, Sort by, Show, Search in titles, "Load all" (filters and Sort by once the list is complete).
function _skgifListTools({ prefix, list, source, autoLoad, noun, search }) {
  const tools = document.getElementById(`${prefix}-tools`);
  const load = document.getElementById(`${prefix}-load`);
  const bar = document.getElementById(`${prefix}-progress`);
  const loadable = !list.failed && list.total >= 1;
  const state = { started: list.total <= autoLoad, loaded: false, searching: false, arrived: 0 }; // download started
  const update = () => {
    const loading = loadable && state.started && !state.loaded && !state.searching;
    tools?.classList.toggle('d-none', !loadable || !state.started || state.searching);
    load?.classList.toggle('d-none', !loadable || state.started || state.searching);
    bar?.classList.toggle('d-none', !loading);
    const text = state.searching ? '' : loading ? `Loading ${noun}s… ${_skgifNum(state.arrived)}/${_skgifNum(list.total)}`
      : loadable && !state.started ? 'Load them all to filter and sort the list.' : '';
    // empty list = "No … found." in the filter row, as tall as the filters of the other tab (no height jump)
    const empty = !list.failed && list.total === 0;
    _skgifSetNote(`${prefix}-note`, empty ? `No ${noun}s found.` : text, loading && !!text);
    document.getElementById(`${prefix}-note`)?.classList.toggle('skgif-empty-note', empty);
  };
  const filters = _skgifListFilters(tools?.querySelector('.skgif-filters'), ['type', 'year', 'source'], keep => list.filter(keep));
  const sortButtons = tools ? [...tools.querySelectorAll('.ra-sort button')] : [];
  sortButtons.forEach(button => button.addEventListener('click', () => {
    sortButtons.forEach(b => b.classList.toggle('active', b === button));
    list.sort(button.dataset.order);
  }));
  list.onProgress((loaded, total) => {
    state.started = true;
    state.arrived = loaded;
    update();
    bar?.querySelector('.progress-bar')?.style.setProperty('width', `${Math.round(loaded / total * 100)}%`);
  });
  load?.addEventListener('click', () => list.loadAll());
  update();
  if (loadable) list.onLoaded(() => {
    state.loaded = true;
    update();
    filters.fill(list.items());
    sortButtons.forEach(button => { button.disabled = list.items().length < 2; }); // Sort by enabled from 2 items
  });
  _skgifInitPerPage(prefix, list);
  // Export next to filters and Sort by (shown once the list is complete)
  const exportControl = _skgifExportControl(() => list.shown(), `${noun}s`, false);
  tools?.appendChild(exportControl);
  if (loadable) list.onLoaded(() => exportControl.querySelectorAll('button').forEach(b => { b.disabled = false; }));
  _skgifListSearch(prefix, source, list, search, filters, searching => {
    state.searching = searching;
    update();
  });
  return filters;
}

// "Search in titles": local when the whole list is downloaded, otherwise cf.search.title.
function _skgifListSearch(prefix, source, list, { noun, statusNoun, scrollId, renderCard }, filters, onSearching) {
  const form = document.getElementById(`${prefix}-search`);
  const input = document.getElementById(`${prefix}-search-input`);
  const reset = document.getElementById(`${prefix}-search-reset`);
  if (!form || !input || !reset) return;
  // with 0-1 results there is nothing to search: hidden, but it keeps its space so that the bars of the
  // two tabs (References / Citations) have the same height
  if (list.failed || list.total < 2) return void form.classList.add('invisible');
  // enabled only when the list is ready
  form.querySelectorAll('input, button').forEach(el => { el.disabled = false; });
  let current = ''; // ignores responses of older searches
  let local = false;
  const showAll = () => {
    current = '';
    input.value = '';
    reset.classList.add('d-none');
    onSearching(false);
    if (local) list.search('');
    else list.activate();
    filters.setMatch(null);
    local = false;
  };
  reset.addEventListener('click', showAll);
  input.addEventListener('input', () => { // text cleared: back to the previous list
    if (!input.value.trim() && !reset.classList.contains('d-none')) showAll();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    _skgifKeepCursor(input);
    _skgifKeepScroll();
    const term = _skgifSafeTerm(input.value);
    if (!term) return showAll();
    current = term;
    reset.classList.remove('d-none');
    if (list.items()) { // whole list downloaded: local search
      if (!local) list.activate();
      local = true;
      onSearching(false);
      filters.setMatch(product => _skgifTitleHas(product, term));
      list.search(term);
      return;
    }
    if (local) {
      list.search('');
      filters.setMatch(null);
    }
    local = false;
    onSearching(true);
    delete _skgifPaginators[`${prefix}-list`];
    _skgifListStatus(`${prefix}-status`, `${prefix}-progress`, 'Searching…', null);
    _skgifHoldHeight(document.getElementById(`${prefix}-list`));
    _skgifSetField(`${prefix}-list`, SKGIF_LOADING_HTML);
    const searchSource = `${source},${SKGIF_FILTER.title}:${encodeURIComponent(term)}`;
    skgifFirstPage(searchSource, SKGIF_LIST_PAGE_SIZE).then(first => {
      if (current !== term) return;
      _skgifPagedList({
        prefix, source: searchSource, first, noun, scrollId, renderCard,
        showTotal: false, // the total stays the one of the whole list
        emptyMessage: '',
        statusText: n => `${_skgifPlural(n, statusNoun)} with “${term}” in the title`
      });
    });
  });
}

// After a search the cursor stays in the field, after the last letter.
function _skgifKeepCursor(input) {
  input.focus({ preventScroll: true });
  input.setSelectionRange(input.value.length, input.value.length);
}

// Keeps the page at least as tall as the current scroll position: short results do not make it jump up.
function _skgifKeepScroll() {
  document.body.style.minHeight = `${window.scrollY + window.innerHeight}px`;
}

// Card shown instead of a result the API did not return.
function _skgifMissingCard(noun) {
  return `<div class="col-12 mb-2"><div class="card shadow-sm"><div class="card-body text-muted">1 ${noun} could not be loaded.</div></div></div>`;
}

const _skgifPaginators = {};

/*
Options of skgifPaginatedSearch():
  sources        - SKG-IF search URLs without page/page_size; several sources are
                   shown as a single list, one after the other
  renderItem     - function building the HTML of a card
  rankItems      - (optional) reorders the results of a page
  emptyMessage   - (optional) text shown when there are no results
  pageSize       - (optional) results per page (then "Show [N] entries")
  containerId    - (optional) where to put the cards
  totalCountId   - (optional) where to write the total
  dedupeKey      - (optional) key used to remove duplicates
  missingNoun    - (optional) if set, pages that do not arrive are requested
                   again in smaller pieces (citation/reference lists)
*/
function skgifPaginatedSearch(config) {
  const containerId = config.containerId || 'search-results-container';
  const totalCountId = config.totalCountId || 'search-total-count';
  const dedupeKey = config.dedupeKey || (item => item.local_identifier || JSON.stringify(item));
  let pageSize = _skgifPageSizes[containerId] || config.pageSize || SKGIF_DEFAULT_PAGE_SIZE; // changes with "Show [N] entries"
  const sources = config.sources || [];
  let sourceTotals = null; // total of each source
  let listedTotal = 0; // sum of the totals of the sources
  let firstItems = []; // first page of each source

  const pageUrl = (src, apiPage) => `${src}&page=${apiPage}&page_size=${pageSize}`; // URL of a page

  // Downloads several pages; fails if one fails (so it does not look like an empty page).
  const fetchAll = urls => Promise.all(urls.map(skgifFetch)).then(responses => {
    if (responses.some(r => !r)) throw new Error('The API did not answer.');
    return responses;
  });

  // Writes the total in the title and shows the page.
  function showCount() {
    _skgifFallbackCount(totalCountId, listedTotal);
    skgifReleasePage();
  }

  // Reads the total of each source from its first page.
  function loadTotals() {
    if (sourceTotals) return Promise.resolve();
    if (config.missingNoun) {
      return Promise.all(sources.map(src => skgifFirstPage(src, pageSize))).then(firsts => {
        if (firsts.some(f => !f)) throw new Error('The API did not answer.');
        firstItems = firsts.map(f => f.items);
        sourceTotals = firsts.map(f => f.total);
        listedTotal = sourceTotals.reduce((a, b) => a + b, 0);
      });
    }
    return fetchAll(sources.map(src => pageUrl(src, 1))).then(responses => {
      sourceTotals = responses.map(skgifTotal);
      listedTotal = sourceTotals.reduce((a, b) => a + b, 0);
    });
  }

  // Computes which results to show in the page, even across two sources.
  function itemsForPage(page) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const parts = [];
    let offset = 0;
    sources.forEach((src, i) => {
      const total = sourceTotals[i];
      const from = Math.max(start, offset) - offset;
      const to = Math.min(end, offset + total) - offset;
      offset += total;
      if (from >= to) return;
      const firstApiPage = Math.floor(from / pageSize) + 1;
      const lastApiPage = Math.floor((to - 1) / pageSize) + 1;
      const urls = [];
      for (let p = firstApiPage; p <= lastApiPage; p++) urls.push(pageUrl(src, p));
      const pages = config.missingNoun
        ? Promise.all(urls.map((url, k) => {
            const p = firstApiPage + k;
            return p === 1 ? firstItems[i] : skgifFetchRange(src, (p - 1) * pageSize, Math.min(pageSize, total - (p - 1) * pageSize), pageSize);
          })).then(lists => lists.flat())
        : fetchAll(urls).then(responses => responses.flatMap(r => _skgifArray(r["@graph"])));
      parts.push(pages.then(items => {
        const skip = from - (firstApiPage - 1) * pageSize;
        return items.slice(skip, skip + (to - from)); 
      }));
    });
    return Promise.all(parts).then(lists => lists.flat());
  }

  function fetchPage(page) {
    const container = document.getElementById(containerId);
    if (container) {
      _skgifHoldHeight(container); // the list keeps its height during "Loading": the page does not jump
      container.innerHTML = SKGIF_LOADING_HTML;
    }

    loadTotals()
      .then(() => itemsForPage(page))
      .then(pageItems => {
        const seen = new Set();
        const items = pageItems.filter(item => {
          if (item._skgifMissing) return true; // missing result: not a duplicate
          const key = dedupeKey(item); // removes the duplicates of the page
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const ranked = config.rankItems ? config.rankItems(items) : items;
        return _skgifWithFirstCounts({ items: ranked }).then(() => ranked); // first cards with their citation count
      })
      .then(ranked => {
        if (container) container.style.minHeight = '';
        _render(container, ranked, page, listedTotal);
        showCount();
        if (page === 1) _skgifInitPerPage('search', { failed: false, total: listedTotal }, containerId, SKGIF_SEARCH_PER_PAGE);
        // Preloads the next page, so Next is faster.
        if (page * pageSize < listedTotal) itemsForPage(page + 1).catch(() => {});
      })
      .catch(error => {
        console.error("SKG-IF search failed:", error);
        if (container) container.style.minHeight = '';
        if (container) container.innerHTML = _skgifUnavailableHtml(!config.missingNoun); // searches: hint about long queries
        skgifReleasePage(); // the search failed
      });
  }

  function _render(container, items, page, totalItems) { // number of pages
    if (!container) return;

    if (items.length === 0) {
      _skgifShowMessage(config.emptyMessage || 'No results found.', containerId);
      return;
    }

    // The container is already a .row: the cards go directly inside.
    let html = items.map(item => item._skgifMissing ? _skgifMissingCard(config.missingNoun) : config.renderItem(item)).join('');

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    html += _skgifPaginationBar(containerId, page, totalPages);

    container.innerHTML = html; // cards + pagination bar

  }

  // Changing page scrolls back to the top of the results.
  function goToPage(page) {
    const countEl = document.getElementById(totalCountId);
    const target = (countEl && countEl.closest('.card')) || document.getElementById(containerId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    fetchPage(page);
  }

  // "Show [N] entries": new page size, page 1, without scrolling the page.
  const refresh = () => {
    pageSize = _skgifPageSizes[containerId] || SKGIF_DEFAULT_PAGE_SIZE;
    if (config.missingNoun) sourceTotals = null; // the first page of each source must be requested again with the new size
    _skgifKeepScroll();
    fetchPage(1);
  };
  _skgifPaginators[containerId] = { goToPage, refresh };
  // The search keeps the "Loading" banner until the total and the first results arrive.
  return {
    search: () => {
      skgifHoldPage();
      fetchPage(1);
    }
  };
}

// Circular pagination (first, last and neighbouring pages); the "…" become a field to type a page number.
function _skgifPaginationBar(containerId, page, totalPages) {
  if (totalPages <= 1) return ''; // a single page: no lonely "1"
  const btn = (target, label, cls = '') =>
    `<button type="button" class="btn skgif-page-btn ${cls}" data-skgif-page="${target}" data-skgif-container="${containerId}"${target === page ? ' disabled aria-current="page"' : ''}>${label}</button>`;
  const shown = [...new Set([1, page - 1, page, page + 1, totalPages])].filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const dots = `<button type="button" class="btn skgif-page-dots" title="Go to page (1-${_skgifNum(totalPages)})" aria-label="Go to page">…</button>`
    + `<input type="number" class="form-control skgif-page-input" min="1" max="${totalPages}" placeholder="#" aria-label="Go to page (1-${totalPages})" data-skgif-container="${containerId}" hidden>`;
  const numbers = shown.map((n, i) => (i && n - shown[i - 1] > 1 ? dots : '')
    + btn(n, _skgifNum(n), `skgif-page-num${n === page ? ' current' : ''}${String(n).length > 4 ? ' skgif-page-long' : ''}`)).join('');
  return `
    <div class="col-12">
      <nav class="skgif-pagination" aria-label="Search results pages">
        <span class="skgif-page-group">
          ${numbers}
        </span>
      </nav>
    </div>`;
}

// Click on "…": the field appears; leaving it without Enter brings the "…" back.
document.addEventListener('click', function (e) {
  const dots = e.target.closest('.skgif-page-dots');
  if (!dots) return;
  const input = dots.nextElementSibling;
  dots.hidden = true;
  input.hidden = false;
  input.focus();
});

document.addEventListener('focusout', function (e) {
  const input = e.target.closest && e.target.closest('.skgif-page-input');
  if (!input) return;
  input.value = '';
  input.hidden = true;
  input.previousElementSibling.hidden = false;
});

// Click and Enter handlers of the pagination bar, shared by all lists.
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.skgif-page-btn');
  if (!btn || btn.disabled) return;
  const paginator = _skgifPaginators[btn.dataset.skgifContainer];
  const page = parseInt(btn.dataset.skgifPage, 10);
  if (paginator && page >= 1) paginator.goToPage(page);
});

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const input = e.target.closest('.skgif-page-input');
  if (!input) return;
  const paginator = _skgifPaginators[input.dataset.skgifContainer];
  const max = parseInt(input.max, 10);
  const page = parseInt(input.value, 10);
  if (!paginator || isNaN(page)) return;
  paginator.goToPage(Math.min(Math.max(page, 1), max));
});

// Removes works with a repeated OMID.
function _skgifDedupe(products) {
  const seen = new Set();
  return products.filter(p => {
    const key = p.local_identifier;
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// "Back to top" button, visible when the user has scrolled past the top of the list listId.
function _skgifInitListUi(listId) {
  document.querySelectorAll('.ra-sort').forEach(_skgifSortAsDropdown); // "Sort by" as a dropdown menu
  const top = document.getElementById('ra-top');
  const list = document.getElementById(listId);
  if (!top || !list) return;
  top.addEventListener('click', () => list.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  window.addEventListener('scroll', () => top.classList.toggle('d-none', list.getBoundingClientRect().top > -400));
}

// "Sort by" as a dropdown menu: clicks the hidden buttons of the template and copies their state.
function _skgifSortAsDropdown(group) {
  if (!group || group.dataset.skgifDd) return;
  group.dataset.skgifDd = '1';
  const buttons = [...group.querySelectorAll('button')];
  const options = buttons.map(b => ({ value: b.dataset.order, text: b.textContent.trim() }))
    .sort((a, b) => (b.value === 'default') - (a.value === 'default')); // "Default order" first
  const dd = _skgifDropdown(group.getAttribute('aria-label') || 'Sort by', options,
    value => buttons.find(b => b.dataset.order === value)?.click());
  const sync = () => {
    const on = buttons.some(b => !b.disabled);
    // only enabled entries in the menu (e.g. "Most cited" in the author profile arrives later)
    if (on) dd.set(options.filter(o => !buttons.find(b => b.dataset.order === o.value).disabled), dd.value());
    dd.enable(on);
    const active = buttons.find(b => b.classList.contains('active'));
    if (active && active.dataset.order !== dd.value()) dd.select(active.dataset.order);
  };
  new MutationObserver(sync).observe(group, { subtree: true, attributes: true, attributeFilter: ['disabled', 'class'] });
  group.classList.add('d-none');
  group.after(dd.el);
  sync();
}

// --- Work lists: order and title search (author profile, document and organisation pages) ---

// HTML of the list in the chosen order (by date with one heading per year).
function _skgifRenderWorks(works, order, renderCard = _skgifWorkCard) {
  const sorted = _skgifSortWorks(works, order);
  if (order !== 'newest' && order !== 'oldest') return sorted.map(work => renderCard(work)).join('');
  let lastYear = null;
  return sorted.map(work => {
    const year = String(_skgifProductRawDate(work) || '').slice(0, 4) || 'Date not available';
    const heading = year !== lastYear ? `<div class="col-12"><h6 class="ra-year-heading">${_skgifEscape(year)}</h6></div>` : '';
    lastYear = year;
    return heading + renderCard(work);
  }).join('');
}

// The works in the chosen order: API, date (works without a date last), title or citations.
function _skgifSortWorks(works, order) {
  const date = p => _skgifProductRawDate(p) || '';
  const title = p => _skgifProductTitle(p);
  const cites = p => _skgifCitedBy[_skgifOmid(p.local_identifier)] ?? -1; // works not counted go last
  const byDate = dir => (a, b) => (!date(a) - !date(b)) || dir * date(a).localeCompare(date(b));
  const byTitle = dir => (a, b) => dir * title(a).localeCompare(title(b), undefined, { sensitivity: 'base' });
  const compare = { newest: byDate(-1), oldest: byDate(1), 'title-asc': byTitle(1), 'title-desc': byTitle(-1),
    cited: (a, b) => cites(b) - cites(a) }[order];
  return compare ? [...works].sort(compare) : works;
}

// True if every searched word is the start of a word of the title (like the API's cf.search.title).
function _skgifTitleHas(product, term) {
  const words = _skgifProductRawTitle(product).toLowerCase().split(/[^\p{L}\p{N}]+/u);
  return term.toLowerCase().split(' ').filter(Boolean).every(part => words.some(word => word.startsWith(part)));
}
