// SILVIA - MIGRAZIONE SKG-IF
// Scheda rivista (new_venue_browser): nome, tipo, ID, publisher/editor.

// Scheda rivista (br/ in /venues): nome/tipo/ID da /venues, publisher/editor da /products;
// pubblicazioni non disponibili (nessun filtro per rivista).

// #postprocess di Lucinda per venue_meta: dati della rivista (l'HTML lo fanno le view functions).
function post_skgif_venue(res, id) {
  const header = ['found', 'message', 'omid', 'head', 'type', 'ids'];
  const omid = `br/${id}`;
  const venue = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null; // {} = nessuna rivista, null = chiamata fallita
  if (!venue?.local_identifier) {
    const message = venue ? `No venue with OMID ${omid} available.` : SKGIF_UNAVAILABLE_MESSAGE;
    return [header, ['', message, omid, omid, '', []]];
  }
  const ids = _skgifArray(venue.identifiers).map(i => ({ scheme: i.scheme, value: i.value }));
  return [header, ['true', '', omid, (venue.name || '').trim() || omid, venue.type || '', ids]];
}

// #postprocess di Lucinda per venue_agents: publisher ed editor (vuoti se la chiamata fallisce).
function post_skgif_venue_agents(res) {
  const product = res.ok ? (res.json?.['@graph'] || [])[0] : null;
  const agents = role => _skgifContributors(product?.contributions, role).map(by => ({ name: _skgifAgentPlainName(by), omid: _skgifOmid(by.local_identifier) }));
  return [['publisher', 'editors'], [agents('publisher'), agents('editor')]];
}

// #callfun: mostra il record se la rivista esiste.
function api_venue_record_skgif() {
  if (_lucindaValue('venue_meta', 'found')) document.getElementById('venue-record')?.classList.remove('d-none');
}
