// Research product record (product_record): metadata from /products/<omid> (Lucinda); References/Citations in pages
// of 50, chart, filters, Sort by.

// Automatic download of References/Citations up to this number each; above it with the button (everything, no limit).
const SKGIF_PRODUCT_AUTO_LOAD = 250; // 250 citations + 250 references = same load as SKGIF_CHART_AUTO_LOAD

// #callfun: Lucinda has already set data and counts; this shows the record, the lists and the chart.
function api_product_record_skgif(...args) {
  if (!_lucindaValue('product_meta', 'found')) return; // missing research product or failed call: Lucinda has already written the message
  const id = _skgifUrlParam(args[1], 'omid_digit').trim();

  const refsSource = skgifFilterUrl('products', SKGIF_FILTER.citedBy, `br/${id}`);
  const citsSource = skgifFilterUrl('products', SKGIF_FILTER.cites, `br/${id}`);

  _skgifInitTabs();
  _skgifInitListUi('br-lists');
  _brOpenTabFromHash();
  _skgifSetField('br-cits-chart', '<em>Loading…</em>');
  document.getElementById('br-record')?.classList.remove('d-none');
  // "Open at publisher" next to the header (same URL as product_meta = response already downloaded by Lucinda)
  skgifFetch(`${SKGIF_API}/products/${skgifFullId(`br/${id}`)}`)
    .then(data => _skgifProductActions((data?.['@graph'] || [])[0], document.querySelector('.skgif-head')));

  // Cards with a "Citation details" link: in References this research product cites the publication, in Citations the publication cites it.
  const cardOf = kind => product => {
    const other = _skgifOmid(product.local_identifier);
    return _skgifProductCard(product, undefined, false,
      kind === 'refs' ? { citing: `br/${id}`, cited: other } : { citing: other, cited: `br/${id}` });
  };
  // First page from Lucinda; automatic downloads one after the other, citations first.
  const tools = (kind, list, source) => _skgifListTools({
    prefix: `br-${kind}`, list, source, autoLoad: SKGIF_PRODUCT_AUTO_LOAD, noun: kind === 'refs' ? 'reference' : 'citation',
    search: { scrollId: 'br-lists', renderCard: cardOf(kind) }
  });
  const citsLoaded = skgifFirstPage(citsSource, SKGIF_DEFAULT_PAGE_SIZE).then(citsPage => {
    const cits = _brList('cits', citsSource, citsPage, cardOf('cits'));
    const filters = tools('cits', cits, citsSource);
    _skgifListChart(cits, { boxId: 'br-cits-chart', noun: 'citation', owner: 'research product', label: '# Citations',
      autoLoad: SKGIF_PRODUCT_AUTO_LOAD, buttonText: 'Load all citations',
      buttonNote: 'Load them all to see the chart and to sort and filter the list.', // below the threshold all citations are downloaded, above it the button is needed
      onYear: year => { // click on a year: the citations of that year
        document.querySelector('[data-br-tab="cits"]')?.click();
        if (filters.select('year', year)) document.getElementById('br-lists')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } });
    filters.onYears((from, to, pending) => _skgifChartYears('br-cits-chart', from, to, filters.clearYears, pending));
    if (!cits.failed && cits.total && cits.total <= SKGIF_PRODUCT_AUTO_LOAD) return new Promise(done => cits.onLoaded(done));
  });
  skgifFirstPage(refsSource, SKGIF_DEFAULT_PAGE_SIZE).then(refsPage => {
    const refs = _brList('refs', refsSource, refsPage, cardOf('refs'));
    tools('refs', refs, refsSource);
    if (refs.total <= SKGIF_PRODUCT_AUTO_LOAD) citsLoaded.then(() => refs.loadAll());
  });
}

// Lucinda #postprocess for product_meta: one row of data ("" = hidden field).
function post_skgif_product(res, id) {
  const header = ['found', 'message', 'omid', 'title', 'head_line', 'head_meta', 'authors', 'editors', 'publisher',
    'date', 'type', 'volume', 'issue', 'pages', 'venue', 'ids'];
  const omid = `br/${id}`;
  const product = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = no research product, null = failed call
  if (!product?.local_identifier) {
    const message = product ? `No record with OMID ${omid} was found.` : SKGIF_UNAVAILABLE_MESSAGE;
    return [header, ['', message, omid, '', '', '', [], [], [], '', '', '', '', '', '', []]];
  }
  const biblio = (_skgifArray(product.manifestations)[0] || {}).biblio || {};
  const head = _skgifHeaderText(product, omid);
  const agents = role => _skgifRecordAgents(product, role);
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
    String(_skgifProductRawDate(product) || '').slice(0, 10),
    _skgifProductRawType(product),
    biblio.volume || '',
    biblio.issue || '',
    _skgifPageRange(biblio, '-'),
    _skgifRecordVenue(product),
    _skgifRecordIds(product)
  ]];
}

// References ('refs') or Citations ('cits') list of the research product record.
function _brList(kind, source, first, renderCard) {
  const noun = kind === 'refs' ? 'reference' : 'citation';
  return _skgifPagedList({
    prefix: `br-${kind}`, source, first, noun,
    emptyMessage: '', // "No … found." is written by _skgifListTools in the filter row
    statusText: n => _skgifPlural(n, noun),
    scrollId: 'br-lists',
    renderCard
  });
}

// #citations / #references in the URL (links from the citation record): opens that tab and keeps the lists
// at the top of the screen while the content above them loads, until the user scrolls (at most 15 s).
function _brOpenTabFromHash() {
  const tab = { '#citations': 'cits', '#references': 'refs' }[location.hash];
  const lists = document.getElementById('br-lists');
  if (!tab || !lists) return;
  document.querySelector(`[data-br-tab="${tab}"]`)?.click();
  const keep = () => lists.scrollIntoView({ block: 'start' });
  const observer = new ResizeObserver(keep);
  const stop = () => {
    observer.disconnect();
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(type => window.removeEventListener(type, stop));
  };
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(type => window.addEventListener(type, stop, { passive: true }));
  observer.observe(document.body);
  keep();
  setTimeout(stop, 15000);
}
