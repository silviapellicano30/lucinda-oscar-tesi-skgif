// Searches (person_search, product_search, venue_search, organisation_search) and search by ID (a single record opens its page).

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
    const fields = _personSearchFields(query);
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

// Magnifying glass (browser.html does not load Font Awesome).
const SKGIF_SEARCH_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';

// Resources of the search bar above the results (same names, labels and placeholders as the home page).
const SKGIF_SEARCH_RESOURCES = {
  product: { name: 'Research product', label: 'Title', placeholder: 'Enter a title' },
  person: { name: 'Person', label: 'Name' },
  venue: { name: 'Venue', label: 'Name', placeholder: 'Enter a journal, book or conference name' },
  organisation: { name: 'Organisation', label: 'Name', placeholder: 'Enter an organisation name' }
};

// URL of a search, in the same format as the home page: person = given/family, venue = text/type, others = text.
function _skgifSearchHref(category, { text = '', given = '', family = '', type = '' }) {
  let query;
  if (category === 'person') {
    const params = new URLSearchParams();
    if (given) params.set('given', given);
    if (family) params.set('family', family);
    query = params.toString();
  } else {
    query = _skgifBuildTextQuery({ text, type: category === 'venue' ? type : '' });
  }
  return `browser.html?value=${category}/${encodeURIComponent(query)}`;
}

// The same search text moved to another resource: to persons, last word = family name and the others = given
// name (as _personSearchFields); from persons, "given family".
function _skgifCarryText(state, category) {
  const text = state.category === 'person' ? [state.given, state.family].filter(Boolean).join(' ') : state.text;
  if (category !== 'person') return { text };
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  return { given: words.slice(0, -1).join(' '), family: words[words.length - 1] || '' };
}

// Editable search bar above the results (#search-bar), filled with the current search.
// The resource menu changes the fields as on the home page; the venue Type runs the search again at once.
function _skgifSearchBar(category, plan) {
  const form = document.getElementById('search-bar');
  if (!form) return;
  const state = { category, text: '', given: '', family: '', type: SKGIF_VENUE_TYPES[plan.type] ? plan.type : '' };
  if (!plan.isId) { // search by ID: empty fields (identifiers are searched from the home page)
    if (plan.fields) { state.given = plan.fields.given; state.family = plan.fields.family; }
    else state.text = plan.text || '';
  }
  const field = (key, placeholder, aria) =>
    `<input type="text" class="form-control" data-key="${key}" value="${_skgifEscape(state[key])}"` +
    `${placeholder ? ` placeholder="${placeholder}"` : ''}${aria ? ` aria-label="${aria}"` : ''} autocomplete="off">`;

  const resourceMenu = _skgifDropdown('Resource to search', Object.entries(SKGIF_SEARCH_RESOURCES).map(([value, r]) => ({ value, text: r.name })), value => {
    Object.assign(state, _skgifCarryText(state, value), { category: value });
    render();
    form.querySelector('input')?.focus();
  });
  resourceMenu.select(category);
  resourceMenu.enable(true);
  const typeMenu = _skgifDropdown('Venue type', [{ value: '', text: 'All types' }, ...Object.entries(SKGIF_VENUE_TYPES).map(([value, text]) => ({ value, text }))], value => {
    state.type = value;
    if (state.text.trim()) location.href = _skgifSearchHref('venue', { text: state.text.trim(), type: value });
  });
  typeMenu.select(state.type);
  typeMenu.enable(true);

  const labelled = (label, input) => `<div class="skgif-bar-field"><span class="skgif-bar-label">${label}</span>${input}</div>`;

  function render() {
    const resource = SKGIF_SEARCH_RESOURCES[state.category];
    // persons: given and family name, each with its own label (the fields are already filled in)
    const textField = state.category === 'person'
      ? `<div class="skgif-bar-text skgif-bar-names">${labelled('Given name', field('given', 'Enter given name'))}${labelled('Family name', field('family', 'Enter family name'))}</div>`
      : labelled(resource.label, field('text', resource.placeholder, resource.label)).replace('skgif-bar-field', 'skgif-bar-field skgif-bar-text');
    form.innerHTML = `
      <div class="skgif-bar-field skgif-bar-resource"><span class="skgif-bar-label">Search in</span></div>
      ${textField}
      ${state.category === 'venue' ? '<div class="skgif-bar-field skgif-bar-type"><span class="skgif-bar-label">Type</span></div>' : ''}
      <button type="submit" class="skgif-bar-btn">${SKGIF_SEARCH_ICON} Search</button>`;
    form.querySelector('.skgif-bar-resource').appendChild(resourceMenu.el);
    form.querySelector('.skgif-bar-type')?.appendChild(typeMenu.el);
    update();
  }
  // Search button disabled while the fields are empty
  function update() {
    form.querySelectorAll('input[data-key]').forEach(input => { state[input.dataset.key] = input.value; });
    const empty = state.category === 'person' ? !state.given.trim() && !state.family.trim() : !state.text.trim();
    form.querySelector('.skgif-bar-btn').disabled = empty;
  }
  form.addEventListener('input', update);
  form.addEventListener('submit', e => {
    e.preventDefault();
    update();
    const trimmed = Object.fromEntries(['text', 'given', 'family', 'type'].map(k => [k, state[k].trim()]));
    if (state.category === 'person' ? trimmed.given || trimmed.family : trimmed.text) location.href = _skgifSearchHref(state.category, trimmed);
  });
  render();
}

// Suggestions shown instead of the results when a search finds nothing (view function skgif_search_cards).
// They follow how the SKG-IF search works: every word is required, accents count.
const SKGIF_EMPTY_SEARCH = {
  products: { category: 'product', noun: 'research products', ids: 'DOI, PMID or ISBN' },
  persons: { category: 'person', noun: 'persons', ids: 'ORCID' },
  venues: { category: 'venue', noun: 'venues', ids: 'ISSN or ISBN' },
  organisations: { category: 'organisation', noun: 'organisations', ids: 'ROR or Crossref ID' }
};
function _skgifEmptySearchHtml(entity, label) {
  const value = new URLSearchParams(location.search).get('value') || '';
  const query = value.slice(value.indexOf('/') + 1); // search_query of the page
  const info = SKGIF_EMPTY_SEARCH[entity];
  if (!info || !label) return _skgifMessageHtml('No results found.');
  const plan = _skgifSearchPlan(entity, query);
  if (plan.isId) {
    return _skgifMessageHtml(`No ${info.noun} found for ${_skgifEscape(label)}. Check the identifier, or try another identifier type from the <a href="home.html">home page</a>.`);
  }
  const tips = [
    'Check the spelling.',
    entity === 'persons' ? 'Use fewer words, or the family name only.' : 'Use fewer words.',
    'Try with and without accents.',
    `Search by ${info.ids} from the <a href="home.html">home page</a>.`
  ];
  const state = plan.fields
    ? { category: 'person', given: plan.fields.given, family: plan.fields.family }
    : { category: info.category, text: plan.text || '' };
  const links = Object.entries(SKGIF_SEARCH_RESOURCES).filter(([category]) => category !== info.category)
    .map(([category, r]) => {
      const href = _skgifSearchHref(category, _skgifCarryText(state, category));
      return `<a class="skgif-empty-link" href="${_skgifEscape(href)}" data-category="${category}">${r.name}s <span class="skgif-empty-count">…</span></a>`;
    })
    .join('');
  return `
    <div class="col-12">
      <div class="skgif-empty">
        <div class="skgif-empty-icon">${SKGIF_SEARCH_ICON}</div>
        <div>
          <h4>No ${info.noun} match “${_skgifEscape(label)}”</h4>
          <ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul>
          <div class="skgif-empty-links"><span>Search the same text in:</span>${links}</div>
        </div>
      </div>
    </div>`;
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

// Lucinda #postprocess for searches: total and label for the title ("–" if the call failed), entity and
// results of the first page (duplicates removed; for persons, exact name matches first) for the cards.
function post_skgif_search(res, searchUrl, searchLabel, entity, searchQuery) {
  let total;
  let items = res.ok ? _skgifArray(res.json?.['@graph']) : [];
  if (!searchUrl) total = 0;
  else if (!searchUrl.includes('?')) { // search by OMID: the record itself
    items = items.filter(item => item?.local_identifier).slice(0, 1);
    total = items.length ? 1 : (res.ok || res.status === 404 ? 0 : '–');
  }
  else total = post_skgif_total(res)[1][0];
  const seen = new Set();
  items = items.filter(item => {
    const key = item.local_identifier || JSON.stringify(item);
    return !seen.has(key) && seen.add(key);
  });
  if (entity === 'persons') {
    let query = String(searchQuery || '');
    try { query = decodeURIComponent(query); } catch (e) { /* keep as is */ }
    const fields = _skgifSearchPlan('persons', query).fields;
    if (fields) items = _rankPersonsByQuery(items, fields);
  }
  return [['total', 'label', 'entity', 'items'], [String(total), searchLabel, entity, items]];
}

// Card function of each entity: first page (view function skgif_search_cards) and next pages (skgifPaginatedSearch).
const SKGIF_SEARCH_CARDS = {
  products: product => _skgifProductCardAiry(product),
  persons: person => _renderPersonCard(person),
  venues: venue => _renderVenueCard(venue),
  organisations: org => _renderOrgCard(org)
};

// Entity of the API for each resource of the search bar.
const SKGIF_SEARCH_ENTITIES = { product: 'products', person: 'persons', venue: 'venues', organisation: 'organisations' };

// Number of results of the same text in the other resources, in the links of the "no results" box:
// one call with page_size=1 per link (the total is in meta.part_of.total_items); "…" until it arrives.
function _skgifLoadEmptyCounts() {
  document.querySelectorAll('.skgif-empty-link[data-category]').forEach(link => {
    const category = link.dataset.category;
    const value = new URLSearchParams(link.getAttribute('href').split('?')[1]).get('value') || '';
    const plan = _skgifSearchPlan(SKGIF_SEARCH_ENTITIES[category], value.slice(value.indexOf('/') + 1));
    const count = link.querySelector('.skgif-empty-count');
    if (!plan.source) { count.remove(); return; }
    skgifFetch(`${plan.source}&page=1&page_size=1`).then(data => {
      if (!data) { count.remove(); return; } // failed call: the link stays, without a number
      const total = skgifTotal(data);
      count.textContent = `(${_skgifNum(total)})`;
      link.classList.toggle('skgif-empty-zero', total === 0);
    });
  });
}

// Runs the search of a page (#callfun). Lucinda has already shown the first page of results;
// this adds the pagination bar and "Show [N] entries" and builds the next pages.
// Search by ID with a single record: opens its page directly; with several records (duplicates) shows the list.
function _skgifRunSearch(plan, renderItem, rankItems) {
  if (plan.isId && (plan.omidUrl || plan.source)) {
    return _skgifOpenSingleRecord(plan).then(opened => {
      if (opened) return;
      document.documentElement.classList.remove('skgif-id-pending'); // several records (or none): the results page is shown
      _skgifRunSearch({ ...plan, isId: false }, renderItem, rankItems);
    });
  }
  if (plan.omidUrl || !plan.source) return; // single record or empty query: no other pages
  if (_lucindaValue('search_count', 'total') === '–') return; // failed call: Lucinda has shown the message
  _skgifLoadEmptyCounts(); // no results: numbers of the other resources
  skgifPaginatedSearch({ sources: [plan.source], rankItems, renderItem })
    .firstPageShown(_lucindaValue('search_count', 'items'));
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

// Person search: search_query = "given=...&family=..." or "scheme=...&id=..."; the name is searched as typed.
function api_search_person_skgif(...args) {
  const plan = _skgifSearchPlan('persons', _skgifUrlParam(args[1], 'search_query')); // URL and title, as in the #preprocess
  _skgifSearchBar('person', plan);
  _skgifRunSearch(plan, _renderPersonCard, plan.fields && (items => _rankPersonsByQuery(items, plan.fields))); // exact matches first
}

// Reads {given, family} from search_query.
function _personSearchFields(query) {
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

// Moves to the top the persons whose name exactly matches the query.
function _rankPersonsByQuery(items, fields) {
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
function _renderPersonCard(person) {
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

// Research product search: a single call /products?filter=cf.search.title:...
function api_search_product_skgif(...args) {
  const plan = _skgifSearchPlan('products', _skgifUrlParam(args[1], 'search_query'));
  _skgifSearchBar('product', plan);
  _skgifRunSearch(plan, _skgifProductCardAiry);
}

// Venue search: /venues?filter=cf.search.name:... (publishers and editors only in the venue record).
function api_search_venue_skgif(...args) {
  const plan = _skgifSearchPlan('venues', _skgifUrlParam(args[1], 'search_query'));
  _skgifSearchBar('venue', plan);
  _skgifRunSearch(plan, _renderVenueCard);
}

// Card of a venue in the results: name, type and IDs.
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
          <div class="mb-2">
            <span class="metadata-label fw-bold">Identifiers:</span><br>
            <span>${_skgifIdList(venue.identifiers, omid)}</span>
          </div>
        </div>
      </div>
    </div>`;
  return html;
}

// Organisation search: /organisations?filter=cf.search.name:...
function api_search_org_skgif(...args) {
  const plan = _skgifSearchPlan('organisations', _skgifUrlParam(args[1], 'search_query'));
  _skgifSearchBar('organisation', plan);
  _skgifRunSearch(plan, _renderOrgCard);
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
