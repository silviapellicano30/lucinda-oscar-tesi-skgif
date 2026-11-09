// Organisation page (new_org_browser): a ra/ not found in /persons. Data from /organisations/<omid>, list of
// publications; chart, filters and Sort by automatic up to SKGIF_CHART_AUTO_LOAD, above it with a button (no limit).

// Lucinda #postprocess for org_meta: organisation data (the HTML is built by the view functions).
function post_skgif_org(res, id) {
  const header = ['found', 'message', 'omid', 'head', 'name', 'crossref', 'ids'];
  const omid = `ra/${id}`;
  const org = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = no organisation, null = failed call
  if (!org?.local_identifier) {
    const message = org ? `No record with OMID ${omid} was found.` : SKGIF_UNAVAILABLE_MESSAGE;
    return [header, ['', message, omid, omid, '', [], []]];
  }
  const ids = _skgifArray(org.identifiers).map(i => ({ scheme: i.scheme, value: i.value }));
  const name = (org.name || '').trim() || 'Name not available';
  return [header, ['true', '', omid, name, name, ids.filter(i => i.scheme === 'crossref'), ids.filter(i => i.scheme !== 'crossref')]];
}

// #callfun: shows the record, the list, the chart and the title search.
function api_org_record_skgif(...args) {
  if (!_lucindaValue('org_meta', 'found')) return; // message already written by Lucinda
  const id = _skgifUrlParam(args[1], 'id').trim();
  const omidUrl = skgifFullId(`ra/${id}`);
  const works = skgifFilterUrl('products', SKGIF_FILTER.contributor, `ra/${id}`);
  _skgifProfileOmid = omidUrl; // used for the role of the organisation in each publication
  document.getElementById('org-record')?.classList.remove('d-none');
  _skgifInitListUi('org-pubs');
  _skgifSetField('org-chart', '<em>Loading publications…</em>');

  skgifFirstPage(works, SKGIF_DEFAULT_PAGE_SIZE).then(first => {
    if (first) _skgifFallbackCount('org-count', first.total);
    const allPublications = _orgList(works, first);
    const filters = _skgifListTools({
      prefix: 'org-pubs', list: allPublications, source: works, autoLoad: SKGIF_CHART_AUTO_LOAD, noun: 'publication',
      search: { noun: 'publication', statusNoun: 'publication', scrollId: 'org-pubs', renderCard: _orgCard }
    });
    _skgifListChart(allPublications, { boxId: 'org-chart', noun: 'publication', owner: 'organisation', label: '# Publications',
      buttonText: 'Load all publications',
      buttonNote: 'Load them all to see the chart and to sort and filter the list.',
      onYear: year => { // click on a year: the publications of that year
        if (filters.select('year', year)) document.getElementById('org-pubs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } });
    filters.onYears((from, to) => _skgifChartYears('org-chart', from, to, filters.clearYears));
  });
}

// All publications of the organisation.
function _orgList(source, first) {
  return _skgifPagedList({
    prefix: 'org-pubs', source, first, emptyMessage: '',
    statusText: n => _skgifPlural(n, 'publication'),
    noun: 'publication',
    scrollId: 'org-pubs',
    renderCard: _orgCard
  });
}

// Card of a publication, with the role of the organisation.
function _orgCard(product) {
  return _skgifWorkCard(product, _orgRoleBadge);
}

// Badge with the roles of the organisation ("Author", "Publisher & Author"...).
function _orgRoleBadge(roles) {
  const labels = { author: 'Author', editor: 'Editor' }; // no "Publisher" badge: almost every publication would have it
  return Object.keys(labels).filter(role => roles.has(role)).map(role => labels[role]).join(' &amp; ');
}
