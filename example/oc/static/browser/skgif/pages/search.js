// SILVIA - MIGRAZIONE SKG-IF
// Ricerche (aut_free_text, doc_free_text, venue_free_text, org_free_text) e ricerca per ID (1 record = apre la scheda).

// Ricerca per identificativo (pannello ID della home): {scheme, id}, null se è una ricerca libera.
function _skgifIdQuery(query) {
  if (!query.startsWith('scheme=')) return null;
  const params = new URLSearchParams(query);
  return { scheme: (params.get('scheme') || "").toLowerCase(), id: (params.get('id') || "").trim() };
}

// Campo del filtro con il valore dell'ID: identifiers.id, per le riviste identifiers.value.
const SKGIF_ID_FIELD = { products: 'identifiers.id', persons: 'identifiers.id', organisations: 'identifiers.id', venues: 'identifiers.value' };

// URL della ricerca da search_query ({ label, source } o { label, omidUrl }), comune a #preprocess e #callfun.
function _skgifSearchPlan(entity, query) {
  const idQuery = _skgifIdQuery(query);
  if (idQuery) {
    const { scheme, id } = idQuery;
    const label = `${scheme}: ${id}`;
    if (!scheme || !id) return { label, source: '' };
    if (scheme === 'omid') {
      const shortOmid = _skgifOmid(id) || id.replace(/^omid:/i, '');
      return { label, isId: true, omidUrl: `${SKGIF_API}/${entity}/${skgifFullId(shortOmid)}` };
    }
    return { label, isId: true, source: `${SKGIF_API}/${entity}?filter=identifiers.scheme:${encodeURIComponent(scheme)},${SKGIF_ID_FIELD[entity]}:${encodeURIComponent(id)}` };
  }
  const apiTerm = s => encodeURIComponent(_skgifSafeTerm(s));
  if (entity === 'persons') {
    const fields = _authorSearchFields(query);
    const label = [fields.given && `Given name: ${fields.given}`, fields.family && `Family name: ${fields.family}`].filter(Boolean).join(' · ');
    const filters = [];
    if (fields.given) filters.push(`${SKGIF_FILTER.givenName}:${apiTerm(fields.given)}`);
    if (fields.family) filters.push(`${SKGIF_FILTER.familyName}:${apiTerm(fields.family)}`);
    return { label, fields, source: filters.length ? `${SKGIF_API}/persons?filter=${filters.join(',')}` : '' }; // virgola = AND
  }
  const { text, type } = _skgifTextQuery(query);
  const term = _skgifSafeTerm(text);
  const field = entity === 'products' ? SKGIF_FILTER.title : SKGIF_FILTER.name;
  const filters = [`${field}:${encodeURIComponent(term)}`];
  if (entity === 'venues' && SKGIF_VENUE_TYPES[type]) filters.push(`type:${type}`); // il tipo scelto si vede nel menu Type
  return { label: term, text, type, source: term ? `${SKGIF_API}/${entity}?filter=${filters.join(',')}` : '' }; // virgola = AND
}

// Ricerca riviste: nome libero o "text=...&type=..." (filtro Type della home).
function _skgifTextQuery(query) {
  if (!/^text=/.test(query)) return { text: query, type: '' };
  const params = new URLSearchParams(query);
  return { text: params.get('text') || '', type: params.get('type') || '' };
}
function _skgifBuildTextQuery({ text, type = '' }) {
  return type ? new URLSearchParams({ text, type }).toString() : text;
}
// Tipi di venue ammessi dal filtro `type` di /venues.
const SKGIF_VENUE_TYPES = { journal: 'Journal', book: 'Book', conference: 'Conference', repository: 'Repository', other: 'Other', unknown: 'Unknown' };

// Filtro Type sopra i risultati delle riviste: cambiarlo rifà la ricerca.
function _skgifSearchRefine(category, plan) {
  const box = document.getElementById('search-refine');
  if (!box || plan.omidUrl || !plan.source) return; // ricerca per ID: niente filtri
  const go = changes => {
    const query = _skgifBuildTextQuery({ text: plan.text, type: plan.type, ...changes });
    location.href = `browser.html?value=${category}/${encodeURIComponent(query)}`;
  };
  if (category === 'venue') {
    box.innerHTML = '<span class="small fw-bold">Type:</span>';
    const options = [{ value: '', text: 'All types' }, ...Object.entries(SKGIF_VENUE_TYPES).map(([value, text]) => ({ value, text }))];
    const dropdown = _skgifDropdown('Filter by venue type', options, value => go({ type: value }));
    dropdown.select(SKGIF_VENUE_TYPES[plan.type] ? plan.type : '');
    dropdown.enable(true);
    box.appendChild(dropdown.el);
  }
}

// #preprocess di Lucinda per le ricerche: search_url ("" = nessuna chiamata) e search_label.
function pre_skgif_search(entity, searchQuery) {
  let query = String(searchQuery || '');
  try { query = decodeURIComponent(query); } catch (e) { /* keep as is */ }
  const plan = _skgifSearchPlan(entity, query);
  const url = plan.omidUrl || (plan.source ? `${plan.source}&page=1&page_size=${SKGIF_DEFAULT_PAGE_SIZE}` : '');
  if (plan.isId && url) document.documentElement.classList.add('skgif-id-pending'); // pagina nascosta: forse si apre subito la scheda
  return { search_url: url, search_label: plan.label };
}

// #postprocess di Lucinda per le ricerche: [totale, etichetta] per il titolo ("–" se fallita).
function post_skgif_search(res, searchUrl, searchLabel) {
  let total;
  if (!searchUrl) total = 0;
  else if (!searchUrl.includes('?')) total = res.ok && (res.json?.['@graph'] || [])[0]?.local_identifier ? 1 : (res.ok || res.status === 404 ? 0 : '–'); // ricerca per OMID: il record stesso
  else total = post_skgif_total(res)[1][0];
  return [['total', 'label'], [String(total), searchLabel]];
}

// Esegue la ricerca di una pagina (#callfun): crea le card pagina per pagina.
// Ricerca per ID con un solo record: apre direttamente la sua scheda; con più record (duplicati) mostra la lista.
function _skgifRunSearch(plan, renderItem, rankItems) {
  if (plan.isId && (plan.omidUrl || plan.source)) {
    return _skgifOpenSingleRecord(plan).then(opened => {
      if (opened) return;
      document.documentElement.classList.remove('skgif-id-pending'); // più record (o nessuno): si mostra la pagina dei risultati
      _skgifRunSearch({ ...plan, isId: false }, renderItem, rankItems);
    });
  }
  if (plan.omidUrl) return _skgifShowByOmid(plan.omidUrl, renderItem);
  if (!plan.source) return _skgifShowMessage('No results found.');
  createSkgifPaginatedSearch({ sources: [plan.source], rankItems, renderItem }).search();
}

// Prima pagina della ricerca per ID (la stessa URL di Lucinda, nessuna chiamata in più): se il record è uno solo
// apre la sua scheda; replace = "Indietro" riporta alla home e non a questa pagina.
function _skgifOpenSingleRecord(plan) {
  const url = plan.omidUrl || `${plan.source}&page=1&page_size=${SKGIF_DEFAULT_PAGE_SIZE}`;
  return skgifFetch(url).then(data => {
    const items = data?.['@graph'] || [];
    const total = plan.omidUrl ? items.length : skgifTotal(data);
    const omid = total === 1 ? _skgifOmid(items[0]?.local_identifier) : '';
    if (omid) location.replace(`browser.html?value=${omid}`);
    return Boolean(omid);
  });
}

// Ricerca per OMID: un solo record, mostrato senza paginazione (404 = non trovato).
function _skgifShowByOmid(url, renderItem) {
  const container = document.getElementById('search-results-container');
  holdSkgifPage();
  skgifFetch(url)
    .then(data => {
      if (!data) return void (container.innerHTML = _skgifUnavailableHtml());
      const record = (data['@graph'] || [])[0];
      if (record) container.innerHTML = renderItem(record);
      else _skgifShowMessage('No results found.');
    })
    .finally(releaseSkgifPage);
}

// Ricerca autori: search_query = "given=...&family=..." o "scheme=...&id=..."; nome cercato come scritto.
function api_search_author_skgif(...args) {
  const plan = _skgifSearchPlan('persons', _skgifUrlParam(args[1], 'search_query')); // URL e titolo, come il #preprocess
  _skgifRunSearch(plan, _renderAuthorCard, plan.fields && (items => _rankAuthorsByQuery(items, plan.fields))); // match esatti in cima
}

// Legge {given, family} da search_query.
function _authorSearchFields(query) {
  if (!query.includes('=')) { // testo libero: ultima parola = cognome, le altre = nome
    const words = query.normalize('NFC').trim().split(/\s+/).filter(Boolean);
    return { given: words.slice(0, -1).join(' '), family: words[words.length - 1] || "" };
  }
  const params = new URLSearchParams(query);
  const get = key => (params.get(key) || "").normalize('NFC').trim();
  return { given: get('given'), family: get('family') };
}

// Nome in minuscolo, con apostrofi e trattini come spazi, per confrontarlo con la ricerca.
function _normName(s) {
  return String(s || "").toLowerCase()
    .replace(/[,"'\\*&#%\u2019-]/g, ' ') //apostrofi, trattini e caratteri tolti dagli URL
    .split(/\s+/).filter(Boolean).join(' ');
}

// Mette in cima le persone il cui nome corrisponde esattamente a quello cercato.
function _rankAuthorsByQuery(items, fields) {
  const same = (a, b) => _normName(a) === _normName(b);
  const score = person =>
    (fields.family && !same(person.family_name, fields.family) ? 1 : 0) +
    (fields.given && !same(person.given_name, fields.given) ? 1 : 0);
  return items
    .map((item, i) => ({ item, i, s: score(item) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map(x => x.item);
}

// Card di una persona nei risultati.
function _renderAuthorCard(person) {
  const omid = _skgifOmid(person.local_identifier);
  if (!omid) return "";

  const identifiers = _skgifArray(person.identifiers);
  const orcid = _skgifEscape(identifiers.find(i => i.scheme === "orcid")?.value || "");

  const fullname = (person.name || "").trim()
    || `${person.given_name || ""} ${person.family_name || ""}`.trim()
    || "Unknown Name";

  const orcidHtml = orcid
    ? `<a href="https://orcid.org/${orcid}" target="_blank" class="text-dark text-decoration-none">${orcid}</a>`
    : '<span class="skgif-none">No ORCID found</span>';

  return `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <h5 class="card-title mb-2">
            <a href="browser.html?value=${omid}">${_skgifEscape(fullname)}</a>
          </h5>
          <hr>

          <div class="mb-2">
            <span class="metadata-label fw-bold">ORCID:</span><br>
            <span>${orcidHtml}</span>
          </div>

          <div class="mb-2">
            <span class="metadata-label fw-bold">Other identifiers:</span><br>
            <span>${_skgifIdList(identifiers.filter(i => i.scheme !== "orcid"), omid)}</span>
          </div>
        </div>
      </div>
    </div>`;
}

// Ricerca documenti: una sola chiamata /products?filter=cf.search.title:...
function api_search_doc_skgif(...args) {
  _skgifRunSearch(_skgifSearchPlan('products', _skgifUrlParam(args[1], 'search_query')), _renderDocumentCard);
}

// Ricerca riviste: /venues?filter=cf.search.name:...; publisher ed editor da _loadVenueAgents().
function api_search_venue_skgif(...args) {
  const plan = _skgifSearchPlan('venues', _skgifUrlParam(args[1], 'search_query'));
  _skgifSearchRefine('venue', plan);
  _skgifRunSearch(plan, _renderVenueCard);
}

// Card di una rivista nei risultati; publisher ed editor vengono aggiunti dopo nel box .venue-agents.
function _renderVenueCard(venue) {
  const omid = _skgifOmid(venue.local_identifier);
  if (!omid) return "";

  const type = venue.type
    ? `<div class="mb-2"><span class="metadata-label fw-bold">Type:</span><br><span>${_skgifEscape(venue.type)}</span></div>`
    : '';

  const html = `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <h5 class="card-title mb-2">
            <a href="browser.html?value=${omid}">${_skgifEscape(venue.name || 'Unknown Title')}</a>
          </h5>
          <hr>
          ${type}
          <div class="venue-agents" data-venue-omid="${omid}"></div>
          <div class="mb-2">
            <span class="metadata-label fw-bold">Identifiers:</span><br>
            <span>${_skgifIdList(venue.identifiers, omid)}</span>
          </div>
        </div>
      </div>
    </div>`;
  _loadVenueAgents(omid);
  return html;
}

// Publisher ed editor di una rivista: /products con la stessa OMID (/venues non li ha).
function _loadVenueAgents(omid) {
  skgifFetch(`${SKGIF_API}/products/${skgifFullId(omid)}`).then(data => { // una chiamata per ogni rivista
    const contributions = (data?.['@graph'] || [])[0]?.contributions;
    const row = (role, label) => {
      const agents = _skgifAgents(contributions, role);
      return agents
        ? `<div class="mb-2"><span class="metadata-label fw-bold">${label}:</span><br><span>${agents}</span></div>`
        : '';
    };
    const html = row('publisher', 'Publisher') + row('editor', 'Editor');
    document.querySelectorAll(`.venue-agents[data-venue-omid="${omid}"]`)
      .forEach(box => { box.innerHTML = html; });
  });
}

// Ricerca organizzazioni: /organisations?filter=cf.search.name:...
function api_search_org_skgif(...args) {
  _skgifRunSearch(_skgifSearchPlan('organisations', _skgifUrlParam(args[1], 'search_query')), _renderOrgCard);
}

// Card di un'organizzazione nei risultati; il nome porta alla sua scheda.
function _renderOrgCard(org) {
  const omid = _skgifOmid(org.local_identifier);
  if (!omid) return "";

  return `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <h5 class="card-title mb-2">
            <a href="browser.html?value=${omid}">${_skgifEscape(org.name || 'Unknown Name')}</a>
          </h5>
          <hr>
          <div class="mb-2">
            <span class="metadata-label fw-bold">Identifiers:</span><br>
            <span>${_skgifIdList(org.identifiers, omid)}</span>
          </div>
        </div>
      </div>
    </div>`;
}
