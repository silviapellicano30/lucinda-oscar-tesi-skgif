// SILVIA - MIGRAZIONE SKG-IF
// Profilo autore (new_ra_browser): opere di tutti i ruoli, tutte scaricate, filtri, Sort by, grafico per anno.

// Profilo autore: /persons/<omid> (Lucinda) e tutte le opere via contributions.by.local_identifier
// (JS: lista, Sort by, filtri, grafico).

// #postprocess di Lucinda per author_meta: dati della persona (l'HTML lo fanno le view functions).
function post_skgif_person(res, id) {
  const header = ['found', 'message', 'omid', 'head', 'name', 'orcid', 'ids'];
  const omid = `ra/${id}`;
  const person = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = nessuna persona, null = chiamata fallita
  if (!person?.local_identifier) {
    const message = person ? `No author or organisation with OMID ${omid} available.` : SKGIF_UNAVAILABLE_MESSAGE;
    return [header, ['', message, omid, omid, '', '', []]];
  }
  const identifiers = _skgifArray(person.identifiers);
  const name = `${person.given_name || ''} ${person.family_name || ''}`.trim() || (person.name || '').trim() || 'Unknown Author';
  return [header, ['true', '', omid, name, name,
    identifiers.find(i => i.scheme === 'orcid')?.value || '',
    identifiers.filter(i => i.scheme !== 'orcid').map(i => ({ scheme: i.scheme, value: i.value }))]];
}

// #callfun: mostra il record e carica tutte le opere.
function api_author_record_skgif(...args) {
  if (!_lucindaValue('author_meta', 'found')) return; // messaggio già scritto da Lucinda
  const id = _skgifUrlParam(args[1], 'id').trim();
  const omidUrl = skgifFullId(`ra/${id}`);
  const works = skgifFilterUrl('products', SKGIF_FILTER.contributor, `ra/${id}`);

  document.getElementById('ra-record')?.classList.remove('d-none');
  _skgifSetField('ra-pubs-chart', '<em>Loading...</em>');
  skgifFirstPage(works, SKGIF_DEFAULT_PAGE_SIZE) // prima pagina: già scaricata da Lucinda
    .then(page => _loadAuthorWorks(works, page, omidUrl));
}

// Quante pagine di opere chiedere in parallelo.
const SKGIF_AUTHOR_PARALLEL_PAGES = 6;

function _loadAuthorWorks(works, firstPage, personOmid) {
  _raPersonOmid = personOmid;
  const container = document.getElementById('search-results-container');
  const chart = document.getElementById('ra-pubs-chart');
  const setChart = html => { if (chart) chart.innerHTML = html; };
  _initAuthorListUi('ra-pubs');
  let order = 'default', keep = null, term = ''; // ordinamento, filtri e parole cercate nel titolo
  let show = () => {};
  let downloaded = false;
  const filters = _skgifListFilters(document.getElementById('ra-filters'), ['type', 'year', 'role'], newKeep => { keep = newKeep; show(); });
  filters.onYears((from, to) => _skgifChartYears('ra-pubs-chart', from, to, filters.clearYears));

  const hideTools = () => { // nessuna opera: niente filtri, Sort by e ricerca
    document.getElementById('ra-filters')?.parentElement.classList.add('d-none');
    document.getElementById('ra-search')?.classList.add('d-none');
  };
  if (!firstPage || !firstPage.total) hideTools();
  if (!firstPage) {
    _skgifFallbackCount('search-total-count', '–');
    if (container) container.innerHTML = _skgifUnavailableHtml();
    setChart('<em>Chart not available.</em>');
    return _setAuthorListStatus('', null);
  }
  const total = firstPage.total;
  _skgifFallbackCount('search-total-count', total);
  if (!total) {
    if (container) container.innerHTML = '<div class="col-12"><p>No publications found.</p></div>';
    setChart('<em>No publications found.</em>');
    return _setAuthorListStatus('No publications', null);
  }

  const pageCount = Math.ceil(total / SKGIF_DEFAULT_PAGE_SIZE);
  const pages = new Array(pageCount); // opere di ogni pagina
  pages[0] = firstPage.items;
  setChart('<em>Loading...</em>');

  // Paginazione lato client: tutte le opere sono scaricate, a schermo una pagina alla volta.
  const listId = 'search-results-container';
  const pageSize = () => _skgifPageSizes[listId] || SKGIF_DEFAULT_PAGE_SIZE;
  const cards = items => items.map(_renderAuthorWorkOrMissing).join('');
  let current = 1; // pagina mostrata
  let view = () => {}; // mostra la pagina `current` della lista attuale
  let shown = ''; // pagina già sullo schermo, per non ridisegnarla a ogni arrivo
  let info = null, fraction = null; // riga di stato (_skgifRangeStatus) e barra di avanzamento
  const showStatus = () => { if (info) _setAuthorListStatus(_skgifRangeStatus(current, pageSize(), info), fraction); };
  const setStatus = (newInfo, newFraction = null) => { info = newInfo; fraction = newFraction; showStatus(); };
  // Pagina `current` di list; count = quante opere avrà la lista (anche non ancora arrivate).
  const showPage = (list, count, render) => {
    const size = pageSize();
    const pageTotal = Math.max(1, Math.ceil(count / size));
    current = Math.min(current, pageTotal);
    showStatus();
    const items = list.slice((current - 1) * size, current * size);
    const key = `${current}/${size}/${items.length}/${count}`;
    if (key === shown) return;
    shown = key;
    _skgifTogglePerPage('ra', count);
    if (!container) return;
    container.innerHTML = items.length ? render(items) + _skgifPaginationBar(listId, current, pageTotal)
      : list.length < count ? SKGIF_LOADING_HTML : ''; // pagina non ancora arrivata
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
  const arrived = () => { // le pagine arrivate in fila, senza buchi
    const list = [];
    for (let i = 0; i < pageCount && pages[i]; i++) list.push(...pages[i]);
    return list;
  };
  const showArrived = () => {
    const loaded = Math.min(loadedCount(), total);
    _skgifSetNote('ra-note', loaded < total ? `Loading publications… ${loaded}/${total}` : '', loaded < total);
    if (term) return;
    view = () => showPage(arrived(), total, cards);
    view();
    setStatus({ count: total, single: _skgifPlural(total, 'publication') }, loaded / total);
  };
  if (container) container.innerHTML = '';
  showArrived();

  // Ricerca nel titolo mentre le opere arrivano ancora: la fa l'API.
  const searchApi = value => {
    term = value;
    current = 1;
    shown = '';
    if (!term) return showArrived();
    info = null;
    _setAuthorListStatus('Searching…', null);
    if (container) container.innerHTML = SKGIF_LOADING_HTML;
    const source = `${works},${SKGIF_FILTER.title}:${encodeURIComponent(term)}`;
    const found = n => `${_skgifPlural(n, 'publication')} with “${value}” in the title`;
    skgifFirstPage(source, SKGIF_DEFAULT_PAGE_SIZE).then(first => {
      if (term !== value || downloaded) return;
      if (!first) {
        if (container) container.innerHTML = '';
        info = null;
        return _setAuthorListStatus('Service unavailable. Please try again later.', null);
      }
      const foundPages = [first.items];
      skgifFetchAllPages(source, first.total, SKGIF_DEFAULT_PAGE_SIZE, SKGIF_AUTHOR_PARALLEL_PAGES, (n, items) => { foundPages[n - 1] = items; }, { 1: first.items }).then(() => {
        if (term !== value || downloaded) return;
        const results = _skgifDedupe(foundPages.flat());
        setStatus({ count: results.length, single: found(first.total) });
        view = () => showPage(results, results.length, cards);
        view();
      });
    });
  };
  _initAuthorSearch(value => downloaded ? null : searchApi(value));

  const onPage = (n, items) => { pages[n - 1] = items; showArrived(); };
  skgifFetchAllPages(works, total, SKGIF_DEFAULT_PAGE_SIZE, SKGIF_AUTHOR_PARALLEL_PAGES, onPage, { 1: pages[0] }).then(() => {
    const inOrder = _skgifDedupe(pages.flat());
    const all = inOrder.filter(w => !w._skgifMissing);
    const missing = inOrder.length - all.length;
    const missingNote = missing ? ` (${missing} could not be loaded)` : '';
    _skgifYearChart(chart, all.map(_skgifProductRawDate), '# Publications', 'No publications found.', 200, year => {
      if (filters.select('year', year)) document.getElementById('ra-pubs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); // clic su un anno: le opere di quell'anno
    });
    if (missing) chart.insertAdjacentHTML('beforeend', `<div class="mt-2">${_skgifPlural(missing, 'publication')} could not be loaded</div>`);
    const plural = n => _skgifPlural(n, 'publication');
    _skgifSetNote('ra-note', '');
    downloaded = true;

    show = keepPage => { // keepPage: resta sulla pagina mostrata (fine dello scaricamento)
      if (!keepPage) {
        current = 1;
        _skgifScrollToList(document.getElementById('ra-pubs'));
      }
      shown = '';
      let works = keep ? all.filter(keep) : order === 'default' && !term ? inOrder : all;
      if (term) works = works.filter(w => _raTitleHas(w, term));
      works = _sortAuthorWorks(works, order); // ordinate tutte, poi divise in pagine
      const found = n => `${plural(n)} with “${term}” in the title`;
      const count = works.length;
      if (term && keep) {
        const withTerm = all.filter(w => _raTitleHas(w, term)).length;
        info = { count, single: `${count} of ${found(withTerm)}`, phrase: found(count), from: withTerm };
      } else if (term) info = { count, single: found(count) };
      else if (keep) info = { count, single: `${count} of ${plural(all.length)}`, phrase: plural(count), from: all.length };
      else info = { count, single: plural(all.length) + missingNote };
      fraction = null;
      view = () => showPage(works, works.length, items => _renderAuthorWorks(items, order, _renderAuthorWorkOrMissing)); // per data: intestazione per anno
      view();
      showStatus();
    };
    filters.fill(all); // Role solo se è autore di alcune opere ed editor di altre
    _onAuthorSearch = value => {
      term = value;
      filters.setMatch(term ? w => _raTitleHas(w, term) : null);
      show();
    };
    if (term) _onAuthorSearch(term);
    else show(true);
    document.querySelectorAll('#ra-sort button').forEach(button => {
      button.disabled = false;
      button.addEventListener('click', () => {
        document.querySelectorAll('#ra-sort button').forEach(b => b.classList.toggle('active', b === button));
        order = button.dataset.order;
        show();
      });
    });
  });
}

// "Search in titles" del profilo autore: filtra le opere già scaricate, senza chiamate.
let _onAuthorSearch = null;

function _initAuthorSearch(onSearch) {
  const form = document.getElementById('ra-search');
  const input = document.getElementById('ra-search-input');
  const reset = document.getElementById('ra-search-reset');
  _onAuthorSearch = onSearch;
  if (!form || !input || !reset) return;
  form.querySelectorAll('input, button').forEach(el => { el.disabled = false; });
  const search = value => {
    reset.classList.toggle('d-none', !value);
    _onAuthorSearch(value);
  };
  reset.addEventListener('click', () => {
    input.value = '';
    search('');
  });
  input.addEventListener('input', () => { // testo cancellato: torna la lista di prima
    if (!input.value.trim() && !reset.classList.contains('d-none')) search('');
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    _skgifKeepCursor(input);
    _skgifKeepScroll();
    search(_skgifSafeTerm(input.value));
  });
}

// Vero se ogni parola cercata è l'inizio di una parola del titolo (come cf.search.title dell'API).
function _raTitleHas(product, term) {
  const words = _skgifProductRawTitle(product).toLowerCase().split(/[^\p{L}\p{N}]+/u);
  return term.toLowerCase().split(' ').filter(Boolean).every(part => words.some(word => word.startsWith(part)));
}

// Testo di stato e barra di avanzamento del profilo autore.
function _setAuthorListStatus(text, fraction) {
  _skgifListStatus('ra-sort-status', 'ra-progress', text, fraction);
}

// Badge "Editor" del profilo autore.
function _raEditorBadge(roles) {
  return !roles.has('editor') ? '' : roles.has('author') ? 'Author &amp; Editor' : 'Editor';
}

// Card di un'opera, o card "could not be loaded".
function _renderAuthorWorkOrMissing(work) {
  return work._skgifMissing ? _skgifMissingCard('publication') : _skgifWorkCard(work);
}

// HTML della lista nell'ordine scelto (per data con un'intestazione per anno).
function _renderAuthorWorks(works, order, renderCard = _skgifWorkCard) {
  const sorted = _sortAuthorWorks(works, order);
  if (order !== 'newest' && order !== 'oldest') return sorted.map(work => renderCard(work)).join('');
  let lastYear = null;
  return sorted.map(work => {
    const year = String(_skgifProductRawDate(work) || '').slice(0, 4) || 'No date';
    const heading = year !== lastYear ? `<div class="col-12"><h6 class="ra-year-heading">${_skgifEscape(year)}</h6></div>` : '';
    lastYear = year;
    return heading + renderCard(work);
  }).join('');
}

// Le opere nell'ordine scelto: API, data (senza data in fondo) o titolo.
function _sortAuthorWorks(works, order) {
  const date = p => _skgifProductRawDate(p) || '';
  const title = p => _skgifProductTitle(p);
  const byDate = dir => (a, b) => (!date(a) - !date(b)) || dir * date(a).localeCompare(date(b));
  const byTitle = dir => (a, b) => dir * title(a).localeCompare(title(b), undefined, { sensitivity: 'base' });
  const compare = { newest: byDate(-1), oldest: byDate(1), 'title-asc': byTitle(1), 'title-desc': byTitle(-1) }[order];
  return compare ? [...works].sort(compare) : works;
}
