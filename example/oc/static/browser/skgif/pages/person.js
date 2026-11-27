// Person record (person_record): data from /persons/<omid> (Lucinda); all publications, in any role, through
// contributions.by.local_identifier, all downloaded; filters, Sort by, per-year charts.

// Lucinda #postprocess for person_meta: person data (the HTML is built by the view functions).
function post_skgif_person(res, id) {
  const header = ['found', 'message', 'omid', 'head', 'name', 'orcid', 'ids'];
  const omid = `ra/${id}`;
  const person = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = no person, null = failed call
  if (!person?.local_identifier) {
    const message = person ? `No record with OMID ${omid} was found.` : SKGIF_UNAVAILABLE_MESSAGE;
    return [header, ['', message, omid, omid, '', '', []]];
  }
  const identifiers = _skgifArray(person.identifiers);
  const name = `${person.given_name || ''} ${person.family_name || ''}`.trim() || (person.name || '').trim() || 'Name not available';
  return [header, ['true', '', omid, name, name,
    identifiers.find(i => i.scheme === 'orcid')?.value || '',
    identifiers.filter(i => i.scheme !== 'orcid').map(i => ({ scheme: i.scheme, value: i.value }))]];
}

// #callfun: shows the record and loads all the publications.
function api_person_record_skgif(...args) {
  if (!_lucindaValue('person_meta', 'found')) return; // message already written by Lucinda
  const id = _skgifUrlParam(args[1], 'id').trim();
  const omidUrl = skgifFullId(`ra/${id}`);
  const source = skgifFilterUrl('products', SKGIF_FILTER.contributor, `ra/${id}`);

  document.getElementById('ra-record')?.classList.remove('d-none');
  _skgifInitTabs(); // chart tabs: Publications per year / Citations per year / Publications per venue
  _skgifSetField('ra-pubs-chart', '<em>Loading…</em>');
  _skgifSetField('ra-cits-chart', '<em>Loading…</em>');
  _skgifSetField('ra-cits-note', '<em>Loading…</em>'); // visible even when the chart tab is closed
  skgifFirstPage(source, SKGIF_DEFAULT_PAGE_SIZE) // first page: already downloaded by Lucinda
    .then(page => _loadPersonProducts(source, page, omidUrl));
}

// Citations received by the person, once all the publications have arrived:
// count = sum of the SKG-IF totals of each publication (cf.cites, page_size=1, 404 = 0 citations);
// per-year chart = OpenCitations Index, one call per publication (citation date in `creation`; SKG-IF has no dates
// without downloading every citing publication). A citation is a pair: a publication citing 3 publications of the person counts 3.
// Few calls at a time: with too many the server answers 429 (skgifFetchPatient retries). For the Index step this is
// the maximum: _skgifAdaptivePool lowers it after a 429.
const SKGIF_PERSON_CITATION_PARALLEL = 3;

function _loadPersonCitations(products) {
  const chart = document.getElementById('ra-cits-chart');
  const setChart = html => { if (chart) chart.innerHTML = html; };
  const omids = [...new Set(products.map(p => _skgifOmid(p.local_identifier)).filter(Boolean))];
  if (!omids.length) {
    _skgifSetField('ra-cits-count', '0');
    _skgifSetField('ra-cits-note', '');
    return setChart('<em>No citations found.</em>');
  }
  const n = omids.length;
  const progress = done => `${SKGIF_LOADING_DOTS} ${_skgifNum(done)}/${_skgifNum(n)} publications`;
  const loading = (done, what) => _skgifProgressHtml(`Loading ${what}${progress(done)}`, done / n);
  const indexes = omids.map((_, i) => i);
  // A single progress bar in the chart tab for both steps (SKG-IF count, then Index dates):
  // half each, so it does not restart from 0 when the count is ready.
  const chartLoading = (step, done) => _skgifProgressHtml(
    `Step ${step} of 2: ${step === 1 ? 'counting citations' : 'loading citation dates'}${progress(done)}`, ((step - 1) * n + done) / (2 * n));

  // 1. Count (SKG-IF). The two steps run one after the other: in parallel they are slower and the
  // server's 429 responses make some citations get lost.
  let total = 0, counted = 0, notCounted = 0;
  const counts = []; // citations of each publication (null = not counted)
  // progress also under the Citations box (the chart tab is usually closed)
  const setCounting = done => { setChart(chartLoading(1, done)); _skgifSetField('ra-cits-note', loading(done, 'citation counts')); };
  setCounting(0);
  _skgifPool(indexes, SKGIF_PERSON_CITATION_PARALLEL, i =>
    _skgifCountCitations(omids[i], true).then(count => { // same number as "Citations: N" in the cards (cards.js)
      counts[i] = count;
      if (count !== null) total += count;
      else notCounted++;
      setCounting(++counted);
    })
  ).then(() => {
    _skgifSetField('ra-cits-count', _skgifNum(total));
    _skgifSetField('ra-cits-note', notCounted ? `${_skgifPlural(notCounted, 'publication')} could not be counted.` : '');
    // "Most cited" in Sort by, now that the counts are known (publications not counted go last)
    const cited = document.querySelector('#ra-sort [data-order="cited"]');
    if (cited && notCounted < n && n >= 2) cited.disabled = false;

    // 2. Chart (Index): publications with 0 citations in step 1 are not requested (no dates to read)
    const dates = [];
    const toRead = indexes.filter(i => counts[i] !== 0);
    let read = n - toRead.length, notRead = 0;
    setChart(chartLoading(2, read));
    return _skgifAdaptivePool(toRead, SKGIF_PERSON_CITATION_PARALLEL, 'index', i =>
      skgifFetchPatient(`${OC_INDEX_API}/citations/omid:${omids[i]}`).then(data => {
        if (Array.isArray(data)) data.forEach(c => dates.push(c.creation));
        else if (!data || Object.keys(data).length) notRead++; // {} = 404, no citations
        setChart(chartLoading(2, ++read));
      })
    ).then(() => {
      // no dates but failed calls = unknown, not "no citations"
      if (!dates.length && notRead) {
        return setChart(`<em>Chart not available.</em><div class="mt-2">The citations of ${_skgifPlural(notRead, 'publication')} could not be loaded.</div>`);
      }
      _skgifYearChart(chart, dates, '# Citations', 'No citations found.', 200);
      // invisible line as tall as "Click a bar..." under the publications chart: keeps the two charts aligned
      if (dates.length) chart.insertAdjacentHTML('beforeend', '<div class="mt-2 small invisible" aria-hidden="true">Click a bar to filter the list by that year.</div>');
      if (notRead) chart.insertAdjacentHTML('beforeend', `<div class="mt-2">The citations of ${_skgifPlural(notRead, 'publication')} could not be loaded.</div>`);
    });
  });
}

// Number of pages of publications requested in parallel.
const SKGIF_PERSON_PARALLEL_PAGES = 6;

// Downloads all the publications and shows them as they arrive; once the list is complete enables Sort by, filters and chart.
function _loadPersonProducts(source, firstPage, personOmid) {
  _skgifProfileOmid = personOmid;
  const container = document.getElementById('search-results-container');
  const chart = document.getElementById('ra-pubs-chart');
  const setChart = html => { if (chart) chart.innerHTML = html; };
  _skgifInitListUi('ra-pubs');
  let order = 'default', keep = null, term = ''; // sorting, filters and words searched in the titles
  let show = () => {};
  let downloaded = false;
  const filters = _skgifListFilters(document.getElementById('ra-filters'), ['type', 'year', 'venue', 'role'], newKeep => { keep = newKeep; show(); });
  filters.onYears((from, to, pending) => _skgifChartYears('ra-pubs-chart', from, to, filters.clearYears, pending));

  const hideTools = () => { // no publications: no filters, Sort by or search
    document.getElementById('ra-filters')?.parentElement.classList.add('d-none');
    document.getElementById('ra-search')?.classList.add('d-none');
  };
  if (!firstPage || !firstPage.total) hideTools();
  else if (firstPage.total < 2) document.getElementById('ra-search')?.classList.add('d-none'); // "Search in titles" from 2 publications
  if (!firstPage) {
    _skgifFallbackCount('search-total-count', '–');
    if (container) container.innerHTML = _skgifUnavailableHtml();
    setChart('<em>Chart not available.</em>');
    _skgifSetField('ra-cits-count', '–');
    _skgifSetField('ra-cits-note', '');
    _skgifSetField('ra-cits-chart', '<em>Chart not available.</em>');
    return _setPersonListStatus('', null);
  }
  const total = firstPage.total;
  _skgifFallbackCount('search-total-count', total);
  if (!total) {
    if (container) container.innerHTML = _skgifMessageHtml('No publications found.');
    setChart('<em>No publications found.</em>');
    _loadPersonCitations([]);
    return _setPersonListStatus('No publications', null);
  }

  const pageCount = Math.ceil(total / SKGIF_DEFAULT_PAGE_SIZE);
  const pages = new Array(pageCount); // publications of each page
  pages[0] = firstPage.items;
  setChart('<em>Loading…</em>');

  // Client-side pagination: all publications are downloaded, one page at a time is shown.
  const listId = 'search-results-container';
  const pageSize = () => _skgifPageSizes[listId] || SKGIF_DEFAULT_PAGE_SIZE;
  const cards = items => items.map(_renderPersonProductOrMissing).join('');
  let current = 1; // page shown
  let view = () => {}; // shows page `current` of the current list
  let shown = ''; // page already on screen, so it is not redrawn at every arrival
  let info = null, fraction = null; // status row (_skgifRangeStatus) and progress bar
  const showStatus = () => { if (info) _setPersonListStatus(_skgifRangeStatus(current, pageSize(), info), fraction); };
  const setStatus = (newInfo, newFraction = null) => { info = newInfo; fraction = newFraction; showStatus(); };
  // Page `current` of list; count = how many publications the list will have (including those not yet arrived).
  const showPage = (list, count, render) => {
    const size = pageSize();
    const pageTotal = Math.max(1, Math.ceil(count / size));
    current = Math.min(current, pageTotal);
    showStatus();
    const items = list.slice((current - 1) * size, current * size);
    const key = `${current}/${size}/${items.length}/${count}`;
    if (key === shown) return;
    _skgifTogglePerPage('ra', count);
    if (!container) return;
    if (!_skgifFirstCountsReady(items)) { // the first cards appear with their citation count (cards.js)
      shown = '';
      _skgifHoldHeight(container); // the page does not jump while waiting
      container.innerHTML = SKGIF_LOADING_HTML;
      return void _skgifWithFirstCounts({ items }).then(() => view());
    }
    shown = key;
    container.style.minHeight = '';
    container.innerHTML = items.length ? render(items) + _skgifPaginationBar(listId, current, pageTotal)
      : list.length < count ? SKGIF_LOADING_HTML : ''; // page not arrived yet
  };
  const goToPage = p => {
    current = p;
    shown = '';
    _skgifScrollToList(document.getElementById('ra-pubs'));
    view();
  };
  _skgifPaginators[listId] = { goToPage, refresh: () => goToPage(1) };
  _skgifInitPerPage('ra', { failed: false, total }, listId);

  const loadedCount = () => pages.reduce((n, page) => n + (page ? page.length : 0), 0);
  const arrived = () => { // the pages arrived in sequence, without gaps
    const list = [];
    for (let i = 0; i < pageCount && pages[i]; i++) list.push(...pages[i]);
    return list;
  };
  const showArrived = () => {
    const loaded = Math.min(loadedCount(), total);
    _skgifSetNote('ra-note', loaded < total ? `Loading publications… ${_skgifNum(loaded)}/${_skgifNum(total)}` : '', loaded < total);
    if (term) return;
    view = () => showPage(arrived(), total, cards);
    view();
    setStatus({ count: total, single: _skgifPlural(total, 'publication') }, loaded / total);
  };
  if (container) container.innerHTML = '';
  showArrived();

  // Title search while publications are still arriving: done by the API.
  const searchApi = value => {
    term = value;
    current = 1;
    shown = '';
    if (!term) return showArrived();
    info = null;
    _setPersonListStatus('Searching…', null);
    if (container) container.innerHTML = SKGIF_LOADING_HTML;
    const titleSource = `${source},${SKGIF_FILTER.title}:${encodeURIComponent(term)}`;
    const found = n => `${_skgifPlural(n, 'publication')} with “${value}” in the title`;
    skgifFirstPage(titleSource, SKGIF_DEFAULT_PAGE_SIZE).then(first => {
      if (term !== value || downloaded) return;
      if (!first) {
        if (container) container.innerHTML = _skgifUnavailableHtml(); // same box as the other lists
        info = null;
        return _setPersonListStatus('', null);
      }
      const foundPages = [first.items];
      skgifFetchAllPages(titleSource, first.total, SKGIF_DEFAULT_PAGE_SIZE, SKGIF_PERSON_PARALLEL_PAGES, (n, items) => { foundPages[n - 1] = items; }, { 1: first.items }).then(() => {
        if (term !== value || downloaded) return;
        const results = _skgifDedupe(foundPages.flat());
        setStatus({ count: results.length, single: found(first.total) });
        view = () => showPage(results, results.length, cards);
        view();
      });
    });
  };
  _initPersonSearch(value => downloaded ? null : searchApi(value));

  const onPage = (n, items) => { pages[n - 1] = items; showArrived(); };
  skgifFetchAllPages(source, total, SKGIF_DEFAULT_PAGE_SIZE, SKGIF_PERSON_PARALLEL_PAGES, onPage, { 1: pages[0] }).then(() => {
    const inOrder = _skgifDedupe(pages.flat());
    const all = inOrder.filter(w => !w._skgifMissing);
    const missing = inOrder.length - all.length;
    const missingNote = missing ? ` (${_skgifNum(missing)} could not be loaded)` : '';
    _skgifYearChart(chart, all.map(_skgifProductRawDate), '# Publications', 'No publications found.', 200, year => {
      if (filters.select('year', year)) document.getElementById('ra-pubs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); // click on a year: the publications of that year
    });
    if (missing) chart.insertAdjacentHTML('beforeend', `<div class="mt-2">${_skgifPlural(missing, 'publication')} could not be loaded.</div>`);
    const plural = n => _skgifPlural(n, 'publication');
    _skgifSetNote('ra-note', '');
    downloaded = true;
    _loadPersonCitations(all);
    _raYearsActive(all);
    let listed = all; // the list as currently shown (filters, search, order), used by Export
    const toolbar = document.getElementById('ra-filters')?.parentElement;
    toolbar?.insertBefore(_skgifExportControl(() => listed, 'publications'), document.getElementById('ra-perpage'));

    show = keepPage => { // keepPage: stays on the page shown (end of the download)
      if (!keepPage) {
        current = 1;
        _skgifScrollToList(document.getElementById('ra-pubs'));
      }
      shown = '';
      let products = keep ? all.filter(keep) : order === 'default' && !term ? inOrder : all;
      if (term) products = products.filter(p => _skgifTitleHas(p, term));
      products = _skgifSortProducts(products, order); // all sorted, then split into pages
      listed = products.filter(p => !p._skgifMissing);
      const found = n => `${plural(n)} with “${term}” in the title`;
      const count = products.length;
      if (term && keep) {
        const withTerm = all.filter(w => _skgifTitleHas(w, term)).length;
        info = { count, single: `${_skgifNum(count)} of ${found(withTerm)}`, phrase: found(count), from: withTerm };
      } else if (term) info = { count, single: found(count) };
      else if (keep) info = { count, single: `${_skgifNum(count)} of ${plural(all.length)}`, phrase: plural(count), from: all.length };
      else info = { count, single: plural(all.length) + missingNote };
      fraction = null;
      view = () => showPage(products, products.length, items => _skgifRenderProducts(items, order, _renderPersonProductOrMissing)); // by date: one heading per year
      view();
      showStatus();
    };
    filters.fill(all); // Role only if the person is author of some publications and editor of others
    _raTopVenues(all, name => { // click on a venue = Venue filter
      if (filters.select('venue', name)) document.getElementById('ra-pubs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    _onPersonSearch = value => {
      term = value;
      filters.setMatch(term ? w => _skgifTitleHas(w, term) : null);
      show();
    };
    if (term) _onPersonSearch(term);
    else show(true);
    document.querySelectorAll('#ra-sort button').forEach(button => {
      if (button.dataset.order !== 'cited') button.disabled = all.length < 2; // "Most cited" is enabled by _loadPersonCitations; Sort by from 2 publications
      button.addEventListener('click', () => {
        document.querySelectorAll('#ra-sort button').forEach(b => b.classList.toggle('active', b === button));
        order = button.dataset.order;
        show();
      });
    });
  });
}

// "Search in titles" of the person record: the API while publications are arriving, then the downloaded list.
let _onPersonSearch = null;

// Connects the "Search in titles" form of the person record (search, clear, Enter).
function _initPersonSearch(onSearch) {
  const form = document.getElementById('ra-search');
  const input = document.getElementById('ra-search-input');
  const reset = document.getElementById('ra-search-reset');
  _onPersonSearch = onSearch;
  if (!form || !input || !reset) return;
  form.querySelectorAll('input, button').forEach(el => { el.disabled = false; });
  const search = value => {
    reset.classList.toggle('d-none', !value);
    _onPersonSearch(value);
  };
  reset.addEventListener('click', () => {
    input.value = '';
    search('');
  });
  input.addEventListener('input', () => { // text cleared: back to the previous list
    if (!input.value.trim() && !reset.classList.contains('d-none')) search('');
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    _skgifKeepCursor(input);
    _skgifKeepScroll();
    search(_skgifSafeTerm(input.value));
  });
}

// Status text and progress bar of the person record.
function _setPersonListStatus(text, fraction) {
  _skgifListStatus('ra-sort-status', 'ra-progress', text, fraction);
}

// Card of a publication, or "could not be loaded" card.
function _renderPersonProductOrMissing(product) {
  return product._skgifMissing ? _skgifMissingCard('publication') : _skgifProductCard(product);
}

// "Years active" in the Overview: first and last year of the publications, with the dates as given by SKG-IF.
function _raYearsActive(products) {
  const years = products.map(p => String(_skgifProductRawDate(p) || '').slice(0, 4)).filter(y => /^\d{4}$/.test(y)).sort();
  if (!years.length) return;
  const first = years[0], last = years[years.length - 1];
  _skgifSetField('ra-active', first === last ? first : `${first}–${last}`);
  document.getElementById('ra-active-field')?.classList.remove('d-none');
}

// "Publications per venue" tab: the SKGIF_TOP_VENUES venues with most publications (name as given by the API), as
// horizontal bars (name above, bar as long as the number of publications); onPick(name) = filter.
const SKGIF_TOP_VENUES = 5;
function _raTopVenues(products, onPick) {
  const tab = document.getElementById('ra-venues-tab');
  const list = document.getElementById('ra-top-venues-list');
  if (!tab || !list) return;
  const counts = {};
  products.forEach(p => { const name = _skgifProductVenue(p)?.name; if (name) counts[name] = (counts[name] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, SKGIF_TOP_VENUES);
  if (!top.length) return;
  const max = top[0][1];
  list.innerHTML = top.map(([name, n]) => `<li><button type="button" class="skgif-venue-bar" data-venue="${_skgifEscape(name)}" aria-label="${_skgifEscape(name)}: ${_skgifPlural(n, 'publication')}">
      <span class="skgif-venue-bar-name">${_skgifEscape(name)}</span>
      <span class="skgif-venue-bar-row"><span class="skgif-venue-bar-fill" style="width: ${n / max * 85}%"></span><span class="skgif-venue-bar-n">${_skgifNum(n)}</span></span>
    </button></li>`).join('');
  list.addEventListener('click', e => {
    const item = e.target.closest('[data-venue]');
    if (item) onPick(item.dataset.venue);
  });
  tab.classList.remove('d-none');
}
