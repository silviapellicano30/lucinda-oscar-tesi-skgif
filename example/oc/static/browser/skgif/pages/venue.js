// Venue page (new_venue_browser): a br/ found in /venues. Name, type and IDs from /venues,
// publishers/editors from /products; publications not available (SKG-IF has no venue filter).

// Lucinda #postprocess for venue_meta: venue data (the HTML is built by the view functions).
function post_skgif_venue(res, id) {
  const header = ['found', 'message', 'omid', 'head', 'type', 'ids'];
  const omid = `br/${id}`;
  const venue = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = no venue, null = failed call
  if (!venue?.local_identifier) {
    const message = venue ? `No record with OMID ${omid} was found.` : SKGIF_UNAVAILABLE_MESSAGE;
    return [header, ['', message, omid, omid, '', []]];
  }
  const ids = _skgifArray(venue.identifiers).map(i => ({ scheme: i.scheme, value: i.value }));
  return [header, ['true', '', omid, (venue.name || '').trim() || omid, venue.type || '', ids]];
}

// Lucinda #postprocess for venue_agents: publishers and editors (empty if the call fails).
function post_skgif_venue_agents(res) {
  const product = res.ok ? (res.json?.['@graph'] || [])[0] : null;
  const agents = role => _skgifContributors(product?.contributions, role).map(by => ({ name: _skgifAgentPlainName(by), omid: _skgifOmid(by.local_identifier) }));
  return [['publisher', 'editors'], [agents('publisher'), agents('editor')]];
}

// #callfun: shows the record if the venue exists.
function api_venue_record_skgif() {
  if (_lucindaValue('venue_meta', 'found')) document.getElementById('venue-record')?.classList.remove('d-none');
}
