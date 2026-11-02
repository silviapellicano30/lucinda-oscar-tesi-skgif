// SILVIA - MIGRAZIONE SKG-IF
// Scheda organizzazione (new_org_browser): nome, ID, pubblicazioni, grafico/filtri fino a SKGIF_ORG_CHART_MAX.

// Scheda organizzazione (ra/ non in /persons): /organisations/<omid> e le pubblicazioni;
// grafico, filtri e Sort by fino a SKGIF_ORG_CHART_MAX.

// Oltre questo numero di pubblicazioni niente grafico, filtri e ordinamento.
const SKGIF_ORG_CHART_MAX = 1500; // come la scheda documento

// #postprocess di Lucinda per org_meta: dati dell'organizzazione (l'HTML lo fanno le view functions).
function post_skgif_org(res, id) {
  const header = ['found', 'message', 'omid', 'head', 'name', 'crossref', 'ids'];
  const omid = `ra/${id}`;
  const org = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = nessuna organizzazione, null = chiamata fallita
  if (!org?.local_identifier) {
    const message = org ? `No author or organisation with OMID ${omid} available.` : SKGIF_UNAVAILABLE_MESSAGE;
    return [header, ['', message, omid, omid, '', [], []]];
  }
  const ids = _skgifArray(org.identifiers).map(i => ({ scheme: i.scheme, value: i.value }));
  const name = (org.name || '').trim() || 'Unknown Organisation';
  return [header, ['true', '', omid, name, name, ids.filter(i => i.scheme === 'crossref'), ids.filter(i => i.scheme !== 'crossref')]];
}

// #callfun: mostra il record, la lista, il grafico e la ricerca nei titoli.
function api_org_record_skgif(...args) {
  if (!_lucindaValue('org_meta', 'found')) return; // messaggio già scritto da Lucinda
  const id = _skgifUrlParam(args[1], 'id').trim();
  const omidUrl = skgifFullId(`ra/${id}`);
  const works = skgifFilterUrl('products', SKGIF_FILTER.contributor, `ra/${id}`);
  _raPersonOmid = omidUrl; // per il ruolo dell'organizzazione in ogni pubblicazione
  document.getElementById('org-record')?.classList.remove('d-none');
  _initAuthorListUi('org-pubs');
  _skgifSetField('org-chart', '<em>Loading publications…</em>');

  skgifFirstPage(works, SKGIF_DEFAULT_PAGE_SIZE).then(first => {
    if (first) _skgifFallbackCount('org-count', first.total);
    const allPublications = _orgList(works, first);
    const filters = _skgifListTools({
      prefix: 'org-pubs', list: allPublications, source: works, autoLoad: SKGIF_CHART_AUTO_LOAD, maxLoad: SKGIF_ORG_CHART_MAX, noun: 'publication',
      search: { noun: 'publication', statusNoun: 'publication', scrollId: 'org-pubs', renderCard: _orgCard }
    });
    _skgifListChart(allPublications, { boxId: 'org-chart', noun: 'publication', owner: 'organisation', label: '# Publications',
      maxLoad: SKGIF_ORG_CHART_MAX, buttonText: 'Load all publications',
      buttonNote: 'Load them all to see the chart and to sort and filter the list.',
      onYear: year => { // clic su un anno: le pubblicazioni di quell'anno
        if (filters.select('year', year)) document.getElementById('org-pubs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } });
    filters.onYears((from, to) => _skgifChartYears('org-chart', from, to, filters.clearYears));
  });
}

// Tutte le pubblicazioni dell'organizzazione.
function _orgList(source, first) {
  return _skgifPagedList({
    prefix: 'org-pubs', source, first, emptyMessage: '',
    statusText: n => _skgifPlural(n, 'publication'),
    noun: 'publication',
    scrollId: 'org-pubs',
    renderCard: _orgCard
  });
}

// Card di una pubblicazione, con il ruolo dell'organizzazione.
function _orgCard(product) {
  return _skgifWorkCard(product, _orgRoleBadge);
}

// Badge con i ruoli dell'organizzazione ("Author", "Publisher & Author"...).
function _orgRoleBadge(roles) {
  const labels = { author: 'Author', editor: 'Editor' }; // "Publisher" no: lo sono quasi tutte
  return Object.keys(labels).filter(role => roles.has(role)).map(role => labels[role]).join(' &amp; ');
}
