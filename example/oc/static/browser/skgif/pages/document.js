// SILVIA - MIGRAZIONE SKG-IF
// Scheda documento (new_br_any_browser): metadati, tab References/Citations, grafico, filtri, Sort by.

// Scheda documento: /products/<omid> (Lucinda) e References/Citations a pagine da 50 (JS: tab, strumenti, grafico).

// #callfun: Lucinda ha già messo dati e conteggi; qui si mostrano il record, le liste e il grafico.
function api_document_record_skgif(...args) {
  if (!_lucindaValue('doc_meta', 'found')) return; // documento mancante o chiamata fallita: il messaggio l'ha già messo Lucinda
  const id = _skgifUrlParam(args[1], 'omid_digit').trim();

  const refsSource = skgifFilterUrl('products', SKGIF_FILTER.citedBy, `br/${id}`);
  const citsSource = skgifFilterUrl('products', SKGIF_FILTER.cites, `br/${id}`);

  _initBrTabs();
  _initAuthorListUi('br-lists');
  _skgifSetField('br-cits-chart', '<em>Loading...</em>');
  document.getElementById('br-record')?.classList.remove('d-none');

  // Prima pagina da Lucinda; scaricamenti automatici in fila, prima le citazioni.
  const tools = (kind, list, source) => _skgifListTools({
    prefix: `br-${kind}`, list, source, autoLoad: SKGIF_DOC_AUTO_LOAD, maxLoad: SKGIF_DOC_MAX_LOAD, noun: kind === 'refs' ? 'reference' : 'citation',
    search: { noun: kind === 'refs' ? 'reference' : 'citation', statusNoun: kind === 'refs' ? 'reference' : 'citation', scrollId: 'br-lists', renderCard: _skgifWorkCard }
  });
  const citsLoaded = skgifFirstPage(citsSource, SKGIF_DEFAULT_PAGE_SIZE).then(citsPage => {
    const cits = _brList('cits', citsSource, citsPage);
    const filters = tools('cits', cits, citsSource);
    _skgifListChart(cits, { boxId: 'br-cits-chart', noun: 'citation', owner: 'document', label: '# Citations',
      autoLoad: SKGIF_DOC_AUTO_LOAD, maxLoad: SKGIF_DOC_MAX_LOAD, buttonText: 'Load all citations',
      buttonNote: 'Load them all to see the chart and to sort and filter the list.', // sotto la soglia scarica tutte le citazioni, sopra aspetta il bottone
      onYear: year => { // clic su un anno: le citazioni di quell'anno
        document.querySelector('[data-br-tab="cits"]')?.click();
        if (filters.select('year', year)) document.getElementById('br-lists')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } });
    filters.onYears((from, to) => _skgifChartYears('br-cits-chart', from, to, filters.clearYears));
    if (!cits.failed && cits.total && cits.total <= SKGIF_DOC_AUTO_LOAD) return new Promise(done => cits.onLoaded(done));
  });
  skgifFirstPage(refsSource, SKGIF_DEFAULT_PAGE_SIZE).then(refsPage => {
    const refs = _brList('refs', refsSource, refsPage);
    tools('refs', refs, refsSource);
    if (refs.total <= SKGIF_DOC_AUTO_LOAD) citsLoaded.then(() => refs.loadAll());
  });
}

// Soglie della scheda documento: scaricamento automatico fino ad AUTO_LOAD, con il bottone fino a MAX_LOAD.
const SKGIF_DOC_AUTO_LOAD = 250; // 250 citazioni + 250 riferimenti = carico di SKGIF_CHART_AUTO_LOAD
const SKGIF_DOC_MAX_LOAD = 1500;

// #postprocess di doc_meta: una riga di dati ("" = campo nascosto).
function post_skgif_document(res, id) {
  const header = ['found', 'message', 'omid', 'title', 'head_line', 'head_meta', 'authors', 'editors', 'publisher',
    'date', 'type', 'volume', 'issue', 'pages', 'source', 'ids'];
  const omid = `br/${id}`;
  const doc = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = nessun documento, null = chiamata fallita
  if (!doc?.local_identifier) {
    const message = doc ? `No document or venue with OMID ${omid} available.` : SKGIF_UNAVAILABLE_MESSAGE;
    return [header, ['', message, omid, '', '', '', [], [], [], '', '', '', '', '', '', []]];
  }
  const manifestation = _skgifArray(doc.manifestations)[0] || {};
  const biblio = manifestation.biblio || {};
  const venue = _skgifProductVenue(doc);
  const head = _skgifHeaderText(doc, omid);
  const agents = role => _skgifContributors(doc.contributions, role).map(by => ({
    name: _skgifAgentPlainName(by),
    omid: _skgifOmid(by.local_identifier),
    orcid: _skgifArray(by.identifiers).find(i => i.scheme === 'orcid')?.value || '' // ID nelle schede (non nelle card)
  }));
  return [header, [
    '1',
    '',
    omid,
    head.title,
    head.line,
    head.meta,
    agents('author'),
    agents('editor'),
    agents('publisher'),
    String(_skgifProductRawDate(doc) || '').slice(0, 10),
    manifestation.type?.labels?.en || '',
    biblio.volume || '',
    biblio.issue || '',
    _skgifPageRange(biblio, '-'),
    venue ? { name: venue.name, omid: _skgifOmid(venue.local_identifier), identifiers: _skgifArray(venue.identifiers) } : '',
    _skgifArray(doc.identifiers).map(i => ({ scheme: i.scheme, value: i.value }))
  ]];
}

// Tab References / Citations.
function _initBrTabs() {
  const tabs = document.querySelectorAll('[data-br-tab]');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    _skgifKeepScroll(); // una tab più corta (es. 0 citazioni) non fa risalire la pagina
    tabs.forEach(t => {
      const active = t === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
      document.getElementById(`br-${t.dataset.brTab}-pane`)?.classList.toggle('d-none', !active);
    });
  }));
}

// Lista References ('refs') o Citations ('cits') della scheda documento.
function _brList(kind, source, first) {
  const noun = kind === 'refs' ? 'reference' : 'citation';
  return _skgifPagedList({
    prefix: `br-${kind}`, source, first, noun,
    emptyMessage: `No ${noun}s found.`,
    statusText: n => _skgifPlural(n, noun),
    scrollId: 'br-lists',
    renderCard: _skgifWorkCard
  });
}
