// Document page (new_br_any_browser): metadata from /products/<omid> (Lucinda); References/Citations in pages
// of 50, chart, filters, Sort by.

// #callfun: Lucinda has already set data and counts; this shows the record, the lists and the chart.
function api_document_record_skgif(...args) {
  if (!_lucindaValue('doc_meta', 'found')) return; // missing document or failed call: Lucinda has already written the message
  const id = _skgifUrlParam(args[1], 'omid_digit').trim();

  const refsSource = skgifFilterUrl('products', SKGIF_FILTER.citedBy, `br/${id}`);
  const citsSource = skgifFilterUrl('products', SKGIF_FILTER.cites, `br/${id}`);

  _skgifInitTabs();
  _skgifInitListUi('br-lists');
  _skgifSetField('br-cits-chart', '<em>Loading…</em>');
  document.getElementById('br-record')?.classList.remove('d-none');
  // "Open at publisher" and "Cite" under the header (same URL as doc_meta = response already downloaded by Lucinda)
  skgifFetch(`${SKGIF_API}/products/${skgifFullId(`br/${id}`)}`)
    .then(data => _skgifDocActions((data?.['@graph'] || [])[0], document.querySelector('.skgif-head')));

  // First page from Lucinda; automatic downloads one after the other, citations first.
  const tools = (kind, list, source) => _skgifListTools({
    prefix: `br-${kind}`, list, source, autoLoad: SKGIF_DOC_AUTO_LOAD, noun: kind === 'refs' ? 'reference' : 'citation',
    search: { noun: kind === 'refs' ? 'reference' : 'citation', statusNoun: kind === 'refs' ? 'reference' : 'citation', scrollId: 'br-lists', renderCard: _skgifWorkCard }
  });
  const citsLoaded = skgifFirstPage(citsSource, SKGIF_DEFAULT_PAGE_SIZE).then(citsPage => {
    const cits = _brList('cits', citsSource, citsPage);
    const filters = tools('cits', cits, citsSource);
    _skgifListChart(cits, { boxId: 'br-cits-chart', noun: 'citation', owner: 'document', label: '# Citations',
      autoLoad: SKGIF_DOC_AUTO_LOAD, buttonText: 'Load all citations',
      buttonNote: 'Load them all to see the chart and to sort and filter the list.', // below the threshold all citations are downloaded, above it the button is needed
      onYear: year => { // click on a year: the citations of that year
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

// Document page threshold: automatic download up to this number, above it with the button (everything, no limit).
const SKGIF_DOC_AUTO_LOAD = 250; // 250 citations + 250 references = same load as SKGIF_CHART_AUTO_LOAD

// #postprocess of doc_meta: one row of data ("" = hidden field).
function post_skgif_document(res, id) {
  const header = ['found', 'message', 'omid', 'title', 'head_line', 'head_meta', 'authors', 'editors', 'publisher',
    'date', 'type', 'volume', 'issue', 'pages', 'source', 'ids'];
  const omid = `br/${id}`;
  const doc = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = no document, null = failed call
  if (!doc?.local_identifier) {
    const message = doc ? `No record with OMID ${omid} was found.` : SKGIF_UNAVAILABLE_MESSAGE;
    return [header, ['', message, omid, '', '', '', [], [], [], '', '', '', '', '', '', []]];
  }
  const manifestation = _skgifArray(doc.manifestations)[0] || {};
  const biblio = manifestation.biblio || {};
  const venue = _skgifProductVenue(doc);
  const head = _skgifHeaderText(doc, omid);
  const agents = role => _skgifContributors(doc.contributions, role).map(by => ({
    name: _skgifAgentPlainName(by),
    omid: _skgifOmid(by.local_identifier),
    orcid: _skgifArray(by.identifiers).find(i => i.scheme === 'orcid')?.value || '' // IDs in record pages (not in cards)
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

// References ('refs') or Citations ('cits') list of the document page.
function _brList(kind, source, first) {
  const noun = kind === 'refs' ? 'reference' : 'citation';
  return _skgifPagedList({
    prefix: `br-${kind}`, source, first, noun,
    emptyMessage: '', // "No … found." is written by _skgifListTools in the filter row
    statusText: n => _skgifPlural(n, noun),
    scrollId: 'br-lists',
    renderCard: _skgifWorkCard
  });
}
