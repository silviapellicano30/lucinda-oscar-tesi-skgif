// Searches (aut_free_text, doc_free_text, venue_free_text, org_free_text) and search by ID (a single record opens its page).

// Search by identifier (home ID panel): {scheme, id}, null for a free-text search.
function _skgifIdQuery(query) {
  if (!query.startsWith('scheme=')) return null;
  const params = new URLSearchParams(query);
  return { scheme: (params.get('scheme') || "").toLowerCase(), id: (params.get('id') || "").trim() };
}

// Filter field holding the ID value: identifiers.id, identifiers.value for venues.
const SKGIF_ID_FIELD = { products: 'identifiers.id', persons: 'identifiers.id', organisations: 'identifiers.id', venues: 'identifiers.value' };

// Search URL built from search_query ({ label, source } or { label, omidUrl }), shared by #preprocess and #callfun.
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
    return { label, fields, source: filters.length ? `${SKGIF_API}/persons?filter=${filters.join(',')}` : '' }; // comma = AND
  }
  const { text, type } = _skgifTextQuery(query);
  const term = _skgifSafeTerm(text);
  const field = entity === 'products' ? SKGIF_FILTER.title : SKGIF_FILTER.name;
  const filters = [`${field}:${encodeURIComponent(term)}`];
  if (entity === 'venues' && SKGIF_VENUE_TYPES[type]) filters.push(`type:${type}`); // the chosen type is shown in the Type menu
  return { label: term, text, type, source: term ? `${SKGIF_API}/${entity}?filter=${filters.join(',')}` : '' }; // comma = AND
}

// Venue search: free name or "text=...&type=..." (Type filter of the home page).
function _skgifTextQuery(query) {
  if (!/^text=/.test(query)) return { text: query, type: '' };
  const params = new URLSearchParams(query);
  return { text: params.get('text') || '', type: params.get('type') || '' };
}
// The opposite: search_query from { text, type }.
function _skgifBuildTextQuery({ text, type = '' }) {
  return type ? new URLSearchParams({ text, type }).toString() : text;
}
// Venue types accepted by the `type` filter of /venues.
const SKGIF_VENUE_TYPES = { journal: 'Journal', book: 'Book', conference: 'Conference', repository: 'Repository', other: 'Other', unknown: 'Unknown' };

// Type filter above the venue results: changing it runs the search again.
function _skgifSearchRefine(category, plan) {
  const box = document.getElementById('search-refine');
  if (!box || plan.omidUrl || !plan.source) return; // search by ID: no filters
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

// Lucinda #preprocess for searches: search_url ("" = no call) and search_label.
function pre_skgif_search(entity, searchQuery) {
  let query = String(searchQuery || '');
  try { query = decodeURIComponent(query); } catch (e) { /* keep as is */ }
  const plan = _skgifSearchPlan(entity, query);
  const url = plan.omidUrl || (plan.source ? `${plan.source}&page=1&page_size=${SKGIF_DEFAULT_PAGE_SIZE}` : '');
  if (plan.isId && url) document.documentElement.classList.add('skgif-id-pending'); // page hidden: the record page may open straight away
  return { search_url: url, search_label: plan.label };
}

// Lucinda #postprocess for searches: [total, label] for the title ("–" if the call failed).
function post_skgif_search(res, searchUrl, searchLabel) {
  let total;
  if (!searchUrl) total = 0;
  else if (!searchUrl.includes('?')) total = res.ok && (res.json?.['@graph'] || [])[0]?.local_identifier ? 1 : (res.ok || res.status === 404 ? 0 : '–'); // search by OMID: the record itself
  else total = post_skgif_total(res)[1][0];
  return [['total', 'label'], [String(total), searchLabel]];
}

// Runs the search of a page (#callfun): builds the cards page by page.
// Search by ID with a single record: opens its page directly; with several records (duplicates) shows the list.
function _skgifRunSearch(plan, renderItem, rankItems) {
  if (plan.isId && (plan.omidUrl || plan.source)) {
    return _skgifOpenSingleRecord(plan).then(opened => {
      if (opened) return;
      document.documentElement.classList.remove('skgif-id-pending'); // several records (or none): the results page is shown
      _skgifRunSearch({ ...plan, isId: false }, renderItem, rankItems);
    });
  }
  if (plan.omidUrl) return _skgifShowByOmid(plan.omidUrl, renderItem);
  if (!plan.source) return _skgifShowMessage('No results found.');
  skgifPaginatedSearch({ sources: [plan.source], rankItems, renderItem }).search();
}

// First page of the search by ID (same URL as Lucinda, no extra call): if there is a single record,
// opens its page; replace = "Back" returns to the home page, not to this page.
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

// Search by OMID: a single record, shown without pagination (404 = not found).
function _skgifShowByOmid(url, renderItem) {
  const container = document.getElementById('search-results-container');
  skgifHoldPage();
  skgifFetch(url)
    .then(data => {
      if (!data) return void (container.innerHTML = _skgifUnavailableHtml());
      const record = (data['@graph'] || [])[0];
      if (record) container.innerHTML = renderItem(record);
      else _skgifShowMessage('No results found.');
    })
    .finally(skgifReleasePage);
}

// Author search: search_query = "given=...&family=..." or "scheme=...&id=..."; the name is searched as typed.
function api_search_author_skgif(...args) {
  const plan = _skgifSearchPlan('persons', _skgifUrlParam(args[1], 'search_query')); // URL and title, as in the #preprocess
  _skgifRunSearch(plan, _renderAuthorCard, plan.fields && (items => _rankAuthorsByQuery(items, plan.fields))); // exact matches first
}

// Reads {given, family} from search_query.
function _authorSearchFields(query) {
  if (!query.includes('=')) { // free text: last word = family name, the others = given name
    const words = query.normalize('NFC').trim().split(/\s+/).filter(Boolean);
    return { given: words.slice(0, -1).join(' '), family: words[words.length - 1] || "" };
  }
  const params = new URLSearchParams(query);
  const get = key => (params.get(key) || "").normalize('NFC').trim();
  return { given: get('given'), family: get('family') };
}

// Lower-case name, with apostrophes and hyphens as spaces, to compare it with the query.
function _normName(s) {
  return String(s || "").toLowerCase()
    .replace(/[,"'\\*&#%\u2019-]/g, ' ') // apostrophes, hyphens and characters removed from URLs
    .split(/\s+/).filter(Boolean).join(' ');
}

// Moves to the top the people whose name exactly matches the query.
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

// Card of a person in the results.
function _renderAuthorCard(person) {
  const omid = _skgifOmid(person.local_identifier);
  if (!omid) return "";

  const identifiers = _skgifArray(person.identifiers);
  const orcid = _skgifEscape(identifiers.find(i => i.scheme === "orcid")?.value || "");

  const fullname = (person.name || "").trim()
    || `${person.given_name || ""} ${person.family_name || ""}`.trim()
    || "Name not available";

  const orcidHtml = orcid
    ? `<a href="https://orcid.org/${orcid}" target="_blank" class="text-dark text-decoration-none">${orcid}</a>`
    : '<span class="skgif-none">Not available</span>';

  return `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <h5 class="card-title mb-2">
            <a href="browser.html?value=${omid}">${_skgifEscape(fullname)}</a>
          </h5>
          <hr>

          <!-- on phones ORCID and other IDs on one line, without labels (prefixed by "orcid:") -->
          <div class="skgif-person-ids">
          <div class="mb-2${orcid ? '' : ' skgif-line-none'}">
            <span class="metadata-label fw-bold">ORCID:</span><br>
            <span><span class="skgif-phone-only">orcid:</span>${orcidHtml}</span>
          </div>

          <div class="mb-2">
            <span class="metadata-label fw-bold">Other identifiers:</span><br>
            <span>${_skgifIdList(identifiers.filter(i => i.scheme !== "orcid"), omid)}</span>
          </div>
          </div>
        </div>
      </div>
    </div>`;
}

// Document search: a single call /products?filter=cf.search.title:...
function api_search_doc_skgif(...args) {
  _skgifRunSearch(_skgifSearchPlan('products', _skgifUrlParam(args[1], 'search_query')), _skgifDocumentCard);
}

// Venue search: /venues?filter=cf.search.name:...; publishers and editors from _loadVenueAgents().
function api_search_venue_skgif(...args) {
  const plan = _skgifSearchPlan('venues', _skgifUrlParam(args[1], 'search_query'));
  _skgifSearchRefine('venue', plan);
  _skgifRunSearch(plan, _renderVenueCard);
}

// Card of a venue in the results; publishers and editors are added later in the .venue-agents box.
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
            <a href="browser.html?value=${omid}">${_skgifEscape(venue.name || 'Name not available')}</a>
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

// Publishers and editors of a venue: /products with the same OMID (/venues does not have them).
function _loadVenueAgents(omid) {
  skgifFetch(`${SKGIF_API}/products/${skgifFullId(omid)}`).then(data => { // one call per venue
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

// Organisation search: /organisations?filter=cf.search.name:...
function api_search_org_skgif(...args) {
  _skgifRunSearch(_skgifSearchPlan('organisations', _skgifUrlParam(args[1], 'search_query')), _renderOrgCard);
}

// Card of an organisation in the results; the name links to its page.
function _renderOrgCard(org) {
  const omid = _skgifOmid(org.local_identifier);
  if (!omid) return "";

  return `
    <div class="col-12 mb-3">
      <div class="card shadow-sm p-2">
        <div class="card-body p-3 d-flex flex-column">
          <h5 class="card-title mb-2">
            <a href="browser.html?value=${omid}">${_skgifEscape(org.name || 'Name not available')}</a>
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
