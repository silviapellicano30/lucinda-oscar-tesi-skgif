// SILVIA - MIGRAZIONE SKG-IF
// Liste a pagine: ricerche, Citations/References, liste delle schede (Show N, stato "1–10 of N", Search in titles, Sort by).

// Riporta la pagina all'inizio della lista, se l'utente l'aveva superata.
function _skgifScrollToList(el) {
  if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Nota sotto la barra della lista ('' = nascosta); loading = viola con i puntini animati.
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

// Mantiene l'altezza della lista mentre carica, così la pagina non salta.
function _skgifHoldHeight(container) {
  if (container && !container.style.minHeight) container.style.minHeight = `${container.offsetHeight}px`;
}

// Testo di stato di una lista e la sua barra di avanzamento (null = nascosta).
function _skgifListStatus(statusId, barId, text, fraction) {
  _skgifSetField(statusId, _skgifEscape(text));
  const bar = document.getElementById(barId);
  if (!bar) return;
  bar.classList.toggle('d-none', fraction === null);
  const inner = bar.querySelector('.progress-bar');
  if (inner && fraction !== null) inner.style.width = `${Math.round(fraction * 100)}%`;
}

// Riga di stato con l'intervallo mostrato ("11–20 of 240 citations") quando la lista ha più pagine.
// single = testo con una sola pagina; phrase = testo per `count` risultati; from = totale prima dei filtri.
function _skgifRangeStatus(page, size, { count, single, phrase = single, from = null }) {
  if (count <= size) return single;
  const range = `${(page - 1) * size + 1}–${Math.min(page * size, count)}`;
  return `${range} of ${phrase}${from === null ? '' : ` (filtered from ${from})`}`;
}

// Liste sfogliabili: dimensione delle pagine chieste all'API e quante chiamate in parallelo.
const SKGIF_LIST_PAGE_SIZE = 50;
const SKGIF_LIST_PARALLEL = 4;
// Fino a questo numero di risultati il grafico si carica da solo; sopra serve il bottone.
const SKGIF_CHART_AUTO_LOAD = 500;
// Risultati per pagina scelti con "Per page", per ogni lista.
const _skgifPageSizes = {};

// Lista sfogliabile: scarica pagine da 50 e ne mostra 10/20/50/100; loadAll() scarica tutto (grafico, filtri, Sort by).
function _skgifPagedList({ prefix, source, first, emptyMessage, noun, statusText, scrollId, renderCard, showTotal = true }) {
  const containerId = `${prefix}-list`;
  const total = first ? first.total : 0;
  const blockCount = Math.ceil(total / SKGIF_LIST_PAGE_SIZE);
  const blocks = {}; // pagina da 50 -> promessa dei risultati
  const arrived = {}; // pagina da 50 -> risultati arrivati
  const firstFull = first && first.items.length >= Math.min(SKGIF_LIST_PAGE_SIZE, total);
  if (firstFull) blocks[1] = Promise.resolve(first.items);
  const block = n => blocks[n] || (blocks[n] = skgifFetchRange(source, (n - 1) * SKGIF_LIST_PAGE_SIZE,
    Math.min(SKGIF_LIST_PAGE_SIZE, total - (n - 1) * SKGIF_LIST_PAGE_SIZE), SKGIF_LIST_PAGE_SIZE));
  const progressListeners = []; // chi segue lo scaricamento (grafico)
  const loadedListeners = []; // chi aspetta che sia tutto scaricato
  let ordered = null; // risultati ordinati/filtrati, null = ordine dell'API
  let inOrder = null; // tutti i risultati nell'ordine dell'API
  let all = null; // solo i risultati arrivati
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
  let info = null; // riga di stato: { count, single, phrase, from } (_skgifRangeStatus)
  const showStatus = () => status(info ? _skgifRangeStatus(page, pageSize(), info) : '');
  const setStatus = newInfo => { info = newInfo; showStatus(); };
  _skgifPaginators[containerId] = paginator;
  if (showTotal) _skgifSetField(`${prefix}-total`, _ciCount(first ? total : null)); // nella ricerca nei titoli il totale resta quello della lista completa
  setStatus(first ? { count: total, single: statusText(total) } : null);

  const renderItems = items => items.map(item => item._skgifMissing ? _skgifMissingCard(noun) : renderCard(item)).join('');

  // I risultati della pagina p.
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
    if (!active()) return; // nello stesso posto è mostrata un'altra lista
    showStatus();
    _skgifTogglePerPage(prefix, first ? (ordered || inOrder || { length: total }).length : 0);
    if (!first || !total) container.style.minHeight = '';
    if (!first) return void (container.innerHTML = _skgifUnavailableHtml());
    if (!total) return void (container.innerHTML = emptyMessage ? `<div class="col-12"><p>${_skgifEscape(emptyMessage)}</p></div>` : '');
    if (scroll) _skgifScrollToList(document.getElementById(scrollId));
    const render = items => {
      container.style.minHeight = '';
      const pageCount = Math.max(1, Math.ceil((ordered || inOrder || { length: total }).length / pageSize()));
      const cards = order === 'newest' || order === 'oldest' ? _renderAuthorWorks(items, order, renderCard) : renderItems(items); // per data: intestazione per anno
      container.innerHTML = items.length ? cards + _skgifPaginationBar(containerId, p, pageCount) : '';
    };
    const inMemory = ordered || inOrder;
    if (inMemory) return render(inMemory.slice((p - 1) * pageSize(), p * pageSize())); // lista già scaricata: mostrata subito
    _skgifHoldHeight(container);
    container.innerHTML = SKGIF_LOADING_HTML;
    itemsOfPage(p).then(items => {
      if (page !== p || !active()) return; // nel frattempo è stata chiesta un'altra pagina
      render(items);
    });
  }

  // Scarica tutte le pagine da 50; false se la lista non si legge.
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
      fullStatus = statusText(all.length) + (missing ? ` (${missing} could not be loaded)` : '');
      setStatus({ count: inOrder.length, single: fullStatus });
      loadedListeners.forEach(listener => listener());
      return true;
    });
    return loading;
  }

  // Applica ordinamento, filtri e ricerca nel titolo (solo dopo loadAll()).
  let order = 'default';
  let keep = null; // filtro: funzione sul prodotto, null = nessuno
  let term = ''; // parole cercate nel titolo
  let fullStatus = '';
  function arrange() {
    if (!inOrder) return 0;
    const base = keep || term ? all.filter(p => (!keep || keep(p)) && (!term || _raTitleHas(p, term)))
      : order === 'default' ? null : all;
    ordered = base && _sortAuthorWorks(base, order);
    const found = n => `${statusText(n)} with “${term}” in the title`;
    const count = (ordered || inOrder).length;
    if (term && keep) {
      const withTerm = all.filter(p => _raTitleHas(p, term)).length;
      info = { count, single: `${count} of ${found(withTerm)}`, phrase: found(count), from: withTerm };
    } else if (term) info = { count, single: found(count) };
    else if (keep) info = { count, single: `${count} of ${fullStatus}`, phrase: statusText(count), from: all.length };
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
    activate: () => { // rimostra questa lista
      _skgifPaginators[containerId] = paginator;
      status(...lastStatus);
      show(1, true);
    }
  };
}

// Grafico per anno di una lista: da solo fino ad autoLoad, col bottone fino a maxLoad; onYear = clic su una barra.
function _skgifListChart(list, { boxId, noun, owner, label, maxLoad = Infinity, autoLoad = SKGIF_CHART_AUTO_LOAD,
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
      box.innerHTML = `<div class="mb-2 skgif-loading-note">Loading ${noun}s<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span> ${loaded}/${total}</div>
        <div class="progress br-chart-progress" style="height: 6px; width: 100%;"><div class="progress-bar" style="width: ${Math.round(loaded / total * 100)}%"></div></div>`;
    });
    list.loadAll().then(() => {
      _skgifYearChart(box, list.items().map(_skgifProductRawDate), label, `No ${noun}s found.`, 200, onYear);
      const missing = list.missing();
      if (missing) box.insertAdjacentHTML('beforeend', `<div class="mt-2">${_skgifPlural(missing, noun)} could not be loaded</div>`);
    });
  };
  if (list.total <= autoLoad) return void after.then(draw);
  if (list.total > maxLoad) return void (box.innerHTML = '<em>Chart not available.</em>');
  box.innerHTML = `<p class="mb-3">This ${owner} has ${list.total} ${noun}s.${buttonNote ? ' ' + buttonNote : ''}</p>
    <button type="button" class="btn btn-sm br-load-chart">${buttonText}</button>`;
  box.querySelector('button').addEventListener('click', draw);
  list.onProgress(draw); // segue lo scaricamento partito da un altro bottone
}

// Menu "Show [N] entries" (10, 20, 50, 100), nascosto se basta una pagina.
const SKGIF_PER_PAGE = [10, 20, 50, 100];
// Ricerche e pagine Go to: una pagina = una chiamata, e l'API dà al massimo 50 risultati.
const SKGIF_SEARCH_PER_PAGE = [10, 20, 50];
function _skgifInitPerPage(prefix, list, containerId = `${prefix}-list`, sizes = SKGIF_PER_PAGE) {
  const box = document.getElementById(`${prefix}-perpage`);
  if (!box || box.querySelector('.skgif-dd') || list.failed || list.total <= SKGIF_DEFAULT_PAGE_SIZE) return;
  const dropdown = _skgifDropdown('Results per page', sizes.map(n => ({ value: String(n), text: String(n) })), value => {
    _skgifPageSizes[containerId] = Number(value);
    _skgifPaginators[containerId]?.refresh?.(); // torna alla pagina 1
  });
  box.appendChild(dropdown.el);
  box.insertAdjacentHTML('beforeend', '<span class="small fw-bold">entries</span>'); // "Show [10] entries"
  dropdown.enable(true);
  box.classList.remove('d-none');
}

// Mostra "Per page" solo se c'è più di una pagina.
function _skgifTogglePerPage(prefix, count) {
  const box = document.getElementById(`${prefix}-perpage`);
  if (box?.querySelector('.skgif-dd')) box.classList.toggle('d-none', count <= SKGIF_DEFAULT_PAGE_SIZE);
}

// Strumenti di una lista: filtri, Sort by, Show, Search in titles, "Load all" (filtri e Sort by a lista completa).
function _skgifListTools({ prefix, list, source, autoLoad, maxLoad, noun, search }) {
  const tools = document.getElementById(`${prefix}-tools`);
  const load = document.getElementById(`${prefix}-load`);
  const bar = document.getElementById(`${prefix}-progress`);
  const loadable = !list.failed && list.total >= 1 && list.total <= maxLoad;
  const state = { started: list.total <= autoLoad, loaded: false, searching: false, arrived: 0 }; // scaricamento partito
  const update = () => {
    const loading = loadable && state.started && !state.loaded && !state.searching;
    tools?.classList.toggle('d-none', !loadable || !state.started || state.searching);
    load?.classList.toggle('d-none', !loadable || state.started || state.searching);
    bar?.classList.toggle('d-none', !loading);
    const text = state.searching ? '' : loading ? `Loading ${noun}s… ${state.arrived}/${list.total}`
      : loadable && !state.started ? 'Load them all to filter and sort the list.'
      : !list.failed && list.total > maxLoad ? 'Filters and sorting are not available.' : '';
    _skgifSetNote(`${prefix}-note`, text, loading && !!text);
  };
  const filters = _skgifListFilters(tools?.querySelector('.skgif-filters'), ['type', 'year'], keep => list.filter(keep));
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
    sortButtons.forEach(button => { button.disabled = false; });
  });
  _skgifInitPerPage(prefix, list);
  _skgifListSearch(prefix, source, list, search, filters, searching => {
    state.searching = searching;
    update();
  });
  return filters;
}

// "Search in titles": locale se la lista è tutta scaricata, altrimenti cf.search.title.
function _skgifListSearch(prefix, source, list, { noun, statusNoun, scrollId, renderCard }, filters, onSearching) {
  const form = document.getElementById(`${prefix}-search`);
  const input = document.getElementById(`${prefix}-search-input`);
  const reset = document.getElementById(`${prefix}-search-reset`);
  if (!form || !input || !reset) return;
  if (list.failed || list.total < 2) return void form.classList.add('d-none'); // con 0-1 risultati non c'è niente da cercare
  // attivato solo quando la lista è pronta
  form.querySelectorAll('input, button').forEach(el => { el.disabled = false; });
  let current = ''; // ignora le risposte di ricerche vecchie
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
  input.addEventListener('input', () => { // testo cancellato: torna la lista di prima
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
    if (list.items()) { // lista tutta scaricata: ricerca locale
      if (!local) list.activate();
      local = true;
      onSearching(false);
      filters.setMatch(product => _raTitleHas(product, term));
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
        showTotal: false, // il totale resta quello della lista completa
        emptyMessage: '',
        statusText: n => `${_skgifPlural(n, statusNoun)} with “${term}” in the title`
      });
    });
  });
}

// Dopo una ricerca il cursore resta nel campo, dopo l'ultima lettera.
function _skgifKeepCursor(input) {
  input.focus({ preventScroll: true });
  input.setSelectionRange(input.value.length, input.value.length);
}

// Tiene la pagina alta almeno fino allo scroll attuale: con pochi risultati non risale.
function _skgifKeepScroll() {
  document.body.style.minHeight = `${window.scrollY + window.innerHeight}px`;
}

// Card al posto di un risultato che l'API non ha restituito.
function _skgifMissingCard(noun) {
  return `<div class="col-12 mb-2"><div class="card shadow-sm"><div class="card-body text-muted">1 ${noun} could not be loaded</div></div></div>`;
}

const _skgifPaginators = {};

/*
Opzioni di createSkgifPaginatedSearch():
  sources        - URL di ricerca SKG-IF senza page/page_size; più fonti vengono
                   mostrate come un'unica lista, una dopo l'altra
  renderItem     - funzione che crea l'HTML di una card
  rankItems      - (facoltativa) riordina i risultati di una pagina
  emptyMessage   - (facoltativo) testo se non ci sono risultati
  pageSize       - (facoltativo) risultati per pagina (poi "Show [N] entries")
  containerId    - (facoltativo) dove mettere le card
  totalCountId   - (facoltativo) dove scrivere il totale
  dedupeKey      - (facoltativa) chiave per togliere i doppioni
  missingNoun    - (facoltativo) se c'è, le pagine che non arrivano vengono
                   richieste in pezzi più piccoli (liste di citazioni/riferimenti)
*/
function createSkgifPaginatedSearch(config) { // Gestisce la paginazione
  const containerId = config.containerId || 'search-results-container';
  const totalCountId = config.totalCountId || 'search-total-count';
  const dedupeKey = config.dedupeKey || (item => item.local_identifier || JSON.stringify(item));
  let pageSize = _skgifPageSizes[containerId] || config.pageSize || SKGIF_DEFAULT_PAGE_SIZE; // cambia con "Show [N] entries"
  const sources = config.sources || [];
  let sourceTotals = null; // totale di ogni fonte
  let listedTotal = 0; // somma dei totali delle fonti
  let firstItems = []; // prima pagina di ogni fonte

  const pageUrl = (src, apiPage) => `${src}&page=${apiPage}&page_size=${pageSize}`; // URL di una pagina

  // Scarica più pagine; se una fallisce dà errore (così non sembra una pagina vuota).
  const fetchAll = urls => Promise.all(urls.map(skgifFetch)).then(responses => {
    if (responses.some(r => !r)) throw new Error('The API did not answer.');
    return responses;
  });

  // Scrive il totale nel titolo e mostra la pagina.
  function showCount() {
    _skgifFallbackCount(totalCountId, listedTotal);
    releaseSkgifPage();
  }

  // Legge il totale di ogni fonte dalla sua prima pagina.
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

  // Calcola quali risultati mostrare nella pagina, anche a cavallo tra due fonti.
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
      _skgifHoldHeight(container); // la lista tiene la sua altezza durante il "Loading": la pagina non sobbalza
      container.innerHTML = SKGIF_LOADING_HTML;
    }

    loadTotals()
      .then(() => itemsForPage(page))
      .then(pageItems => {
        const seen = new Set();
        const items = pageItems.filter(item => {
          if (item._skgifMissing) return true; // risultato mancante: non è un doppione
          const key = dedupeKey(item); // toglie i doppioni della pagina
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const ranked = config.rankItems ? config.rankItems(items) : items;
        if (container) container.style.minHeight = '';
        _render(container, ranked, page, listedTotal);
        showCount();
        if (page === 1) _skgifInitPerPage('search', { failed: false, total: listedTotal }, containerId, SKGIF_SEARCH_PER_PAGE);
        // Precarica la pagina successiva, così Next è più veloce.
        if (page * pageSize < listedTotal) itemsForPage(page + 1).catch(() => {});
      })
      .catch(error => {
        console.error("SKG-IF search failed:", error);
        if (container) container.style.minHeight = '';
        if (container) container.innerHTML = _skgifUnavailableHtml(!config.missingNoun); // ricerche: consiglio sulle query lunghe
        releaseSkgifPage(); // la ricerca non è riuscita
      });
  }

  function _render(container, items, page, totalItems) { // numero di pagine
    if (!container) return;

    if (items.length === 0) {
      _skgifShowMessage(config.emptyMessage || 'No results found.', containerId);
      return;
    }

    // Il contenitore è già una .row: le card vanno messe direttamente.
    let html = items.map(item => item._skgifMissing ? _skgifMissingCard(config.missingNoun) : config.renderItem(item)).join('');

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    html += _skgifPaginationBar(containerId, page, totalPages);

    container.innerHTML = html; // card + barra di paginazione

  }

  // Cambiando pagina si torna all'inizio dei risultati.
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

  // "Show [N] entries": nuova dimensione delle pagine, pagina 1, senza far scorrere la pagina.
  const refresh = () => {
    pageSize = _skgifPageSizes[containerId] || SKGIF_DEFAULT_PAGE_SIZE;
    if (config.missingNoun) sourceTotals = null; // la prima pagina di ogni fonte va richiesta con la nuova dimensione
    _skgifKeepScroll();
    fetchPage(1);
  };
  _skgifPaginators[containerId] = { goToPage, refresh };
  // La ricerca tiene il banner "Loading" finché non arrivano totale e primi risultati.
  return {
    search: () => {
      holdSkgifPage();
      fetchPage(1);
    }
  };
}

// Paginazione a cerchi (prima, ultima e vicine); i "…" diventano un campo per scrivere la pagina.
function _skgifPaginationBar(containerId, page, totalPages) {
  const btn = (target, label, cls = '') =>
    `<button type="button" class="btn skgif-page-btn ${cls}" data-skgif-page="${target}" data-skgif-container="${containerId}"${target === page ? ' disabled aria-current="page"' : ''}>${label}</button>`;
  const shown = [...new Set([1, page - 1, page, page + 1, totalPages])].filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const dots = `<button type="button" class="btn skgif-page-dots" title="Go to page (1-${totalPages})" aria-label="Go to page">…</button>`
    + `<input type="number" class="form-control skgif-page-input" min="1" max="${totalPages}" placeholder="#" aria-label="Go to page (1-${totalPages})" data-skgif-container="${containerId}" hidden>`;
  const numbers = shown.map((n, i) => (i && n - shown[i - 1] > 1 ? dots : '')
    + btn(n, n, `skgif-page-num${n === page ? ' current' : ''}${String(n).length > 4 ? ' skgif-page-long' : ''}`)).join('');
  return `
    <div class="col-12">
      <nav class="skgif-pagination" aria-label="Search results pages">
        <span class="skgif-page-group">
          ${numbers}
        </span>
      </nav>
    </div>`;
}

// Clic sui "…": compare il campo; uscendo senza Invio tornano i "…".
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

// Gestori dei clic e dell'Invio della barra di paginazione, comuni a tutte le liste.
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

// Toglie le opere con OMID ripetuto.
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

// Bottone "Back to top", visibile quando si è superato l'inizio della lista listId.
function _initAuthorListUi(listId) {
  document.querySelectorAll('.ra-sort').forEach(_skgifSortAsDropdown); // "Sort by" come menu a tendina
  const top = document.getElementById('ra-top');
  const list = document.getElementById(listId);
  if (!top || !list) return;
  top.addEventListener('click', () => list.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  window.addEventListener('scroll', () => top.classList.toggle('d-none', list.getBoundingClientRect().top > -400));
}

// "Sort by" come menu a tendina: clicca i bottoni nascosti del template e ne copia lo stato.
function _skgifSortAsDropdown(group) {
  if (!group || group.dataset.skgifDd) return;
  group.dataset.skgifDd = '1';
  const buttons = [...group.querySelectorAll('button')];
  const options = buttons.map(b => ({ value: b.dataset.order, text: b.textContent.trim() }))
    .sort((a, b) => (b.value === 'default') - (a.value === 'default')); // "Default order" per primo
  const dd = _skgifDropdown(group.getAttribute('aria-label') || 'Sort by', options,
    value => buttons.find(b => b.dataset.order === value)?.click());
  const sync = () => {
    dd.enable(buttons.some(b => !b.disabled));
    const active = buttons.find(b => b.classList.contains('active'));
    if (active && active.dataset.order !== dd.value()) dd.select(active.dataset.order);
  };
  new MutationObserver(sync).observe(group, { subtree: true, attributes: true, attributeFilter: ['disabled', 'class'] });
  group.classList.add('d-none');
  group.after(dd.el);
  sync();
}
