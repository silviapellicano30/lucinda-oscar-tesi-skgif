// Research product cards, identifiers with links, names (authors, editors, publishers), citation counts,
// record page headers, list export.

// --- Identifiers ---

// Link to the external page of each ID scheme ("" = no link).
const _skgifUrlPart = v => encodeURI(v).replace(/[?#]/g, encodeURIComponent);
const _skgifHttpUrl = v => /^https?:\/\//i.test(v) ? encodeURI(v) : "";
const SKGIF_ID_URLS = {
  doi: v => `https://doi.org/${_skgifUrlPart(v)}`,
  pmid: v => `https://pubmed.ncbi.nlm.nih.gov/${_skgifUrlPart(v)}/`,
  issn: v => `https://portal.issn.org/resource/ISSN/${_skgifUrlPart(v)}`,
  openalex: v => `https://openalex.org/${_skgifUrlPart(v)}`,
  orcid: v => `https://orcid.org/${_skgifUrlPart(v)}`,
  omid: v => skgifFullId(_skgifUrlPart(v)),
  pmcid: v => `https://pmc.ncbi.nlm.nih.gov/articles/${_skgifUrlPart(v)}/`,
  arxiv: v => `https://arxiv.org/abs/${_skgifUrlPart(v)}`,
  crossref: v => `https://www.crossref.org/members/prep/${_skgifUrlPart(v)}`,
  ror: v => `https://ror.org/${_skgifUrlPart(v)}`,
  viaf: v => `https://viaf.org/viaf/${_skgifUrlPart(v)}`,
  handle: v => `https://hdl.handle.net/${_skgifUrlPart(v)}`,
  bibcode: v => `https://ui.adsabs.harvard.edu/abs/${_skgifUrlPart(v)}`,
  isbn: v => `https://search.worldcat.org/isbn/${_skgifUrlPart(v)}`,
  eissn: v => `https://portal.issn.org/resource/ISSN/${_skgifUrlPart(v)}`,
  lissn: v => `https://portal.issn.org/resource/ISSN-L/${_skgifUrlPart(v)}`,
  jid: v => `https://www.jstage.jst.go.jp/browse/${_skgifUrlPart(v)}`,
  ivoid: v => `https://dc.g-vo.org/I/${_skgifUrlPart(v)}`,
  spase: v => /^spase:\/\//i.test(v) ? `https://spase-metadata.org/${_skgifUrlPart(v.replace(/^spase:\/\//i, ''))}` : "",
  urn: v => /^urn:nbn:/i.test(v) ? `https://nbn-resolving.org/${_skgifUrlPart(v)}` : "",
  url: _skgifHttpUrl,
  w3id: v => _skgifHttpUrl(v) || `https://w3id.org/${_skgifUrlPart(v.replace(/^\/+/, ''))}`,
  opendoar: v => `https://v2.sherpa.ac.uk/id/repository/${_skgifUrlPart(v)}`
};

// Order in which identifiers are shown (unknown schemes after the listed ones, omid last).
const SKGIF_ID_ORDER = ['doi', 'pmid', 'pmcid', 'arxiv', 'isbn', 'issn', 'openalex'];
// IDs a person recognises; on phones a card shows only the first of these.
const SKGIF_MAIN_IDS = ['doi', 'pmid', 'pmcid', 'arxiv', 'isbn', 'issn', 'crossref'];

// Position of a scheme in SKGIF_ID_ORDER.
function _skgifIdRank(scheme) {
  if (scheme === 'omid') return SKGIF_ID_ORDER.length + 1;
  const i = SKGIF_ID_ORDER.indexOf(scheme);
  return i === -1 ? SKGIF_ID_ORDER.length : i;
}

// "scheme:value", linking to the external page when there is one (in a new tab).
function _skgifIdLink(scheme, value) {
  const s = String(scheme || "").toLowerCase();
  const label = _skgifEscape(`${s}:${value}`);
  const url = SKGIF_ID_URLS[s] ? SKGIF_ID_URLS[s](String(value)) : "";
  return url ? `<a href="${_skgifEscape(url)}" target="_blank" class="text-dark text-decoration-none">${label}</a>` : label;
}

// Identifier line ("doi:... • omid:br/...").
// copy = record pages: copy icon after each ID; brackets = "(" and ")" around the list, on the same line as the first and last ID.
// Cards (copy = false): on phones only the main human-readable ID and the omid are shown (classes read by the CSS).
function _skgifIdList(identifiers, omid, copy = false, brackets = false) {
  const ids = _skgifArray(identifiers)
    .filter(i => i && i.scheme && i.value)
    .map(i => ({ scheme: String(i.scheme).toLowerCase(), value: i.value }));
  if (omid) ids.push({ scheme: 'omid', value: omid });
  const sorted = ids
    .map((id, i) => ({ id, i }))
    .sort((a, b) => _skgifIdRank(a.id.scheme) - _skgifIdRank(b.id.scheme) || a.i - b.i)
    .map(x => x.id);
  if (!copy) {
    let main = sorted.findIndex(id => SKGIF_MAIN_IDS.includes(id.scheme));
    if (main === -1) main = sorted.findIndex(id => id.scheme === 'omid');
    const shown = (id, i) => i === main ? 'skgif-id-main' : id.scheme === 'omid' ? 'skgif-id-keep' : 'skgif-id-extra';
    return sorted.map((id, i) => `<span class="${shown(id, i)}">`
      + `${i ? '<span class="skgif-id-sep"> • </span>' : ''}${_skgifIdLink(id.scheme, id.value)}</span>`).join('');
  }
  const open = i => brackets && i === 0 ? '(' : '';
  const close = i => brackets && i === sorted.length - 1 ? ')' : '';
  return sorted // the copy icon always stays on the same line as its ID
    .map((id, i) => `<span class="text-nowrap">${open(i)}${_skgifIdLink(id.scheme, id.value)}${_skgifCopyButton(id.value)}${close(i)}</span>`)
    .join(' • ');
}

// --- Names ---

// Persons/organisations of a product with a given role (author, editor, publisher), in order.
function _skgifContributors(contributions, role) {
  return _skgifArray(contributions)
    .filter(c => c && c.role === role && c.by)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map(c => c.by);
}

// Name as "Family, Given" (or organisation name), not escaped.
function _skgifAgentPlainName(by) {
  return (by.name || '').trim() || [by.family_name, by.given_name].filter(Boolean).join(', ') || 'Name not available';
}

// Link to the page of a person/organisation: browser.html?value=ra/<id>.
const _skgifAgentUrl = agentOmid => `browser.html?value=${agentOmid}`;

// A name { name, omid, orcid } linking to its page, with the ORCID in brackets and its copy icon (record pages).
function _skgifAgentHtml(agent) {
  const name = _skgifEscape(agent.name);
  let html = agent.omid
    ? `<a href="${_skgifAgentUrl(agent.omid)}" class="text-dark text-decoration-none">${name}</a>`
    : `<span>${name}</span>`;
  if (agent.orcid) html += ` <span class="text-nowrap">(<a href="https://orcid.org/${_skgifEscape(agent.orcid)}" target="_blank">${_skgifEscape(agent.orcid)}</a>${_skgifCopyButton(agent.orcid)})</span>`;
  return html;
}

// OMID of the person/organisation whose profile is shown (bold in the cards, used for the role badges).
let _skgifProfileOmid = '';

// Roles of the profile person in a publication.
function _skgifProfileRoles(product) {
  return new Set(_skgifArray(product.contributions)
    .filter(c => c && c.by && c.by.local_identifier === _skgifProfileOmid).map(c => c.role));
}

// "Editor" badge of a publication in a person profile.
function _skgifEditorBadge(roles) {
  return !roles.has('editor') ? '' : roles.has('author') ? 'Author &amp; Editor' : 'Editor';
}

// --- Products: title, date, type, venue ---

// Title of a product (the one without a language tag, otherwise the first); '' if missing.
function _skgifProductRawTitle(product) {
  const titles = product.titles || {};
  return (titles.none || Object.values(titles)[0] || [])[0] || '';
}
function _skgifProductTitle(product) {
  return _skgifProductRawTitle(product) || 'Title not available';
}

// Publication date as given by the API; undefined if missing.
function _skgifProductRawDate(product) {
  return _skgifArray(product.manifestations).map(m => m?.dates?.publication?.[0]).find(Boolean);
}

// Product type ("journal article"...); '' if missing.
function _skgifProductRawType(product) {
  return _skgifArray(product.manifestations).map(m => m?.type?.labels?.en).find(Boolean) || '';
}
function _skgifProductType(product) {
  return _skgifProductRawType(product) || 'Type not available';
}

// The venue of the product, or undefined.
function _skgifProductVenue(product) {
  return _skgifArray(product.manifestations).map(m => m?.biblio?.in).find(v => v && v.name);
}

// Pages "first-last" (just one if equal), "" if missing.
function _skgifPageRange(biblio, dash) {
  const pages = (biblio || {}).pages || {};
  return pages.first && pages.last && pages.first !== pages.last ? `${pages.first}${dash}${pages.last}` : (pages.first || pages.last || '');
}

// Venue name in italics, linking to its page; identifiers in brackets (record pages; on phones on their own line).
function _skgifVenueHtml(name, venueOmid, identifiers) {
  const venueTitle = `<i>${_skgifEscape(name)}</i>`;
  const titleHtml = venueOmid
    ? `<a href="browser.html?value=${venueOmid}" class="text-dark text-decoration-none">${venueTitle}</a>`
    : venueTitle;
  const venueIds = _skgifIdList(identifiers, undefined, true, true);
  return venueIds ? `${titleHtml}<span class="skgif-venue-ids"> ${venueIds}</span>` : titleHtml;
}

// Record pages (#postprocess data): the venue with its IDs, or "".
function _skgifRecordVenue(product) {
  const venue = _skgifProductVenue(product);
  return venue ? { name: venue.name, omid: _skgifOmid(venue.local_identifier), identifiers: _skgifArray(venue.identifiers) } : '';
}

// Record pages: the contributors with a given role, with their ORCID.
function _skgifRecordAgents(product, role) {
  return _skgifContributors(product.contributions, role).map(by => ({
    name: _skgifAgentPlainName(by),
    omid: _skgifOmid(by.local_identifier),
    orcid: _skgifArray(by.identifiers).find(i => i.scheme === 'orcid')?.value || ''
  }));
}

// Record pages: the identifiers as { scheme, value }.
function _skgifRecordIds(product) {
  return _skgifArray(product.identifiers).map(i => ({ scheme: i.scheme, value: i.value }));
}

// --- Publication cards ---

// Card of a publication, used by every list: year/role badges, Authors (or Editors), Type, Publication venue or
// Publisher, IDs, Citations/References counts. badgeOf(roles) = role badge; airy = more spacing (search results).
// citation = { citing, cited } (short OMIDs): adds a "Citation details" link to the citation record.
function _skgifProductCard(product, badgeOf = _skgifEditorBadge, airy = false, citation = null) {
  const omid = _skgifOmid(product.local_identifier);
  if (!omid) return '';
  const oci = citation && `${citation.citing.replace(/^br\//, '')}-${citation.cited.replace(/^br\//, '')}`;
  const ciLink = oci ? `<a class="skgif-ci-link" href="browser.html?value=ci/${_skgifEscape(oci)}">Citation details</a>` : '';
  const year = String(_skgifProductRawDate(product) || '').slice(0, 4);
  const contributions = _skgifArray(product.contributions);
  const role = contributions.some(c => c && c.role === 'author' && c.by) ? 'author' : 'editor';
  const names = _skgifContributors(contributions, role).map(by => {
    const name = _skgifEscape(_skgifAgentPlainName(by));
    const agentOmid = _skgifOmid(by.local_identifier);
    const html = agentOmid ? `<a href="${_skgifAgentUrl(agentOmid)}">${name}</a>` : name;
    return by.local_identifier === _skgifProfileOmid ? `<strong>${html}</strong>` : html; // the person of the profile in bold
  });
  const namesHtml = names.length ? _skgifShortNames(names, contributions, role)
    : '<span class="skgif-none skgif-desktop-only">Not available</span><span class="skgif-phone-only">Authors not available</span>';
  // phones: no "Editors:" label, "(ed.)"/"(eds.)" after the names as in a bibliography
  const editorsNote = role === 'editor' && names.length ? `<span class="skgif-phone-only"> (${names.length === 1 ? 'ed.' : 'eds.'})</span>` : '';
  const venueData = _skgifProductVenue(product);
  const venue = venueData ? _skgifVenueHtml(venueData.name, _skgifOmid(venueData.local_identifier), []) : '';
  const publisher = venue ? '' : _skgifContributors(contributions, 'publisher')
    .map(by => _skgifAgentHtml({ name: _skgifAgentPlainName(by), omid: _skgifOmid(by.local_identifier) })).join(' • ');
  const type = _skgifProductRawType(product);
  const ids = _skgifIdList(product.identifiers, omid);
  const roleBadge = badgeOf(_skgifProfileRoles(product));
  const badges = (roleBadge ? `<span class="badge ra-role-badge">${roleBadge}</span>` : '')
    + (year ? `<span class="badge ra-year-badge">${_skgifEscape(year)}</span>` : '');
  const line = (cls, label, value, hideLabel = true) => value
    ? `<div class="ra-work-line ${cls}"><span class="fw-bold${hideLabel ? ' ra-label-phone-hide' : ''}">${label}:</span> <span class="ra-work-value">${value}</span></div>` : '';

  // ra-line-meta ("venue · year · role") is shown on phones only
  return `
    <div class="col-12 mb-2">
      <div class="card shadow-sm ra-work${airy ? ' skgif-card-airy' : ''}" data-omid="${omid}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-1">
            <h5 class="ra-work-title"><a href="browser.html?value=${omid}">${_skgifEscape(_skgifProductTitle(product))}</a></h5>
            <div class="d-flex gap-1 flex-shrink-0">${badges}</div>
          </div>
          ${line('ra-line-authors', role === 'author' || !names.length ? 'Authors' : 'Editors', namesHtml + editorsNote)}
          ${line('ra-line-type', 'Type', _skgifEscape(type))}
          ${line('ra-line-venue', 'Publication venue', venue)}
          ${line('ra-line-publisher', 'Publisher', publisher, false)}
          <div class="ra-work-line ra-line-meta">${[venue, year && _skgifEscape(year), roleBadge].filter(Boolean).join(' · ')}</div>
          ${line('ra-line-ids', 'Identifiers', ids, false)}
          <div class="ra-work-line ra-line-counts">${_skgifCitationsButton(omid)}<span class="ra-count-sep"> • </span>${_skgifCountText('References', _skgifArray(product.related_products?.cites).length, 'ra-ref-count')}${ciLink}</div>
        </div>
      </div>
    </div>`;
}

// Cards of the search results: the shared card, airy version, without role.
function _skgifProductCardAiry(product) {
  return _skgifProductCard(product, () => '', true);
}

// Authors in cards: the first SKGIF_CARD_NAMES (3 on phones) + "+N more"; the person of the profile stays visible.
const SKGIF_CARD_NAMES = 5;
const SKGIF_CARD_NAMES_PHONE = 3;
function _skgifShortNames(names, contributions, role) {
  const phone = _skgifIsPhone();
  const max = phone ? SKGIF_CARD_NAMES_PHONE : SKGIF_CARD_NAMES;
  // on phones at most 3 names in total (the person of the profile included); on desktop a single extra name is never hidden
  if (names.length <= max + (phone ? 0 : 1)) return names.join(' • ');
  const personAt = _skgifContributors(contributions, role).findIndex(by => by.local_identifier === _skgifProfileOmid);
  const first = personAt >= max && phone ? max - 1 : max;
  const short = names.slice(0, first);
  if (personAt >= first) short.push('…', names[personAt]);
  const hidden = names.length - first - (personAt >= first ? 1 : 0);
  return `<span class="skgif-names-short">${short.join(' • ')}</span>`
    + `<span class="skgif-names-full" hidden>${names.join(' • ')}</span> `
    + `<button type="button" class="skgif-more-names" data-more="+${_skgifNum(hidden)} more">+${_skgifNum(hidden)} more</button>`;
}

// "+N more" / "Show less": shows or hides all the names.
document.addEventListener('click', e => {
  const btn = e.target.closest('.skgif-more-names');
  if (!btn) return;
  const line = btn.parentElement;
  const open = line.querySelector('.skgif-names-full').hidden;
  line.querySelector('.skgif-names-full').hidden = !open;
  line.querySelector('.skgif-names-short').hidden = open;
  btn.textContent = open ? 'Show less' : btn.dataset.more;
  if (e.detail) btn.blur(); // mouse/touch click: no focus outline (keyboard keeps it)
});

// --- Citation counts of the cards ---
// "Citations: N" and "References: N" in every card, as plain text.
// References: number of references already in the publication's JSON (related_products.cites), no calls.
// Citations: one SKG-IF call per publication (cf.cites, page_size=1, 404 = 0), only for the cards on screen,
// SKGIF_CITE_COUNT_PARALLEL at a time; numbers are remembered and never requested twice (the person record total,
// _loadPersonCitations, uses the same queue). No number until it arrives or if the call fails.
const SKGIF_CITE_COUNT_PARALLEL = 6;
const _skgifCitedBy = {}; // OMID of the publication (br/...) -> number of citations
const _skgifCitedByPending = {}; // OMID -> promise of the number (null = call failed)
const _skgifCiteQueue = [];
let _skgifCiteRunning = 0;

// Number of citations of a publication; later = at the end of the queue (person record total), after the cards on screen.
function _skgifCountCitations(omid, later = false) {
  if (omid in _skgifCitedBy) return Promise.resolve(_skgifCitedBy[omid]);
  const firstLater = () => { const i = _skgifCiteQueue.findIndex(job => job.later); return i < 0 ? _skgifCiteQueue.length : i; };
  const queued = _skgifCiteQueue.findIndex(job => job.omid === omid);
  if (!later && queued >= 0 && _skgifCiteQueue[queued].later) { // already queued at the end: moves it forward
    const [job] = _skgifCiteQueue.splice(queued, 1);
    job.later = false;
    _skgifCiteQueue.splice(firstLater(), 0, job);
  }
  if (_skgifCitedByPending[omid]) return _skgifCitedByPending[omid];
  return _skgifCitedByPending[omid] = new Promise(done => {
    _skgifCiteQueue.splice(later ? _skgifCiteQueue.length : firstLater(), 0, { omid, done, later });
    _skgifCiteNext();
  });
}

// Starts the queued counts, at most SKGIF_CITE_COUNT_PARALLEL at a time.
function _skgifCiteNext() {
  while (_skgifCiteRunning < SKGIF_CITE_COUNT_PARALLEL && _skgifCiteQueue.length) {
    const { omid, done } = _skgifCiteQueue.shift();
    _skgifCiteRunning++;
    skgifFetchPatient(`${skgifFilterUrl('products', SKGIF_FILTER.cites, omid)}&page=1&page_size=1`).then(data => {
      _skgifCiteRunning--;
      if (data) _skgifCitedBy[omid] = skgifTotal(data);
      else delete _skgifCitedByPending[omid];
      _skgifShowCitedBy(omid);
      done(data ? _skgifCitedBy[omid] : null);
      _skgifCiteNext();
    });
  }
}

// "Label: N" of a card; the number has its own reserved space (.skgif-n-slot), where it fades in when it arrives.
function _skgifCountText(label, n, cls, fadeIn = false) {
  const number = n === undefined ? '' : `<span class="skgif-n${fadeIn ? ' skgif-n-in' : ''}">${_skgifNum(n)}</span>`;
  if (n === 1) label = label.replace(/s$/, ''); // "Citation: 1"
  return `<span class="${cls}"><span class="fw-bold">${label}:</span> <span class="skgif-n-slot">${number}</span></span>`;
}

// "Citations: N" of a publication; without a known number it is marked to be counted (data-count).
function _skgifCitationsButton(omid, fadeIn = false) {
  const n = _skgifCitedBy[omid];
  const text = _skgifCountText('Citations', n, 'ra-cit-count', fadeIn);
  return n === undefined ? text.replace('<span ', `<span data-count="${omid}" `) : text;
}

// Puts the number into the Citations count of the cards already on screen.
function _skgifShowCitedBy(omid) {
  document.querySelectorAll(`.ra-work[data-omid="${omid}"] .ra-cit-count`).forEach(btn => {
    btn.outerHTML = _skgifCitationsButton(omid, true).replace(/ data-count="[^"]*"/, '');
  });
}

// New cards on screen -> requests their citation count (once per card).
function _skgifCountVisible() {
  document.querySelectorAll('.ra-cit-count[data-count]').forEach(btn => {
    const omid = btn.dataset.count;
    btn.removeAttribute('data-count');
    _skgifCountCitations(omid);
  });
}
let _skgifCountScheduled = false;
new MutationObserver(() => {
  if (_skgifCountScheduled) return;
  _skgifCountScheduled = true;
  requestAnimationFrame(() => { _skgifCountScheduled = false; _skgifCountVisible(); });
}).observe(document.documentElement, { childList: true, subtree: true });

// Every page of a list (first page, page change, Sort by, filters) waits for the citation counts of its first
// SKGIF_FIRST_COUNTS publications, at most SKGIF_FIRST_COUNTS_WAIT ms, so the top cards appear with their number;
// the others receive it later. Publications only (not persons/venues).
const SKGIF_FIRST_COUNTS = 3;
const SKGIF_FIRST_COUNTS_WAIT = 3000;
const _skgifCountsWaited = new Set(); // already waited for once (even if the call failed): never waited for again
const _skgifFirstOmids = items => _skgifArray(items).filter(p => p?.entity_type === 'product')
  .slice(0, SKGIF_FIRST_COUNTS).map(p => _skgifOmid(p.local_identifier)).filter(Boolean);

// True if the first cards of `items` can appear immediately (numbers already received or already waited for).
function _skgifFirstCountsReady(items) {
  return _skgifFirstOmids(items).every(omid => omid in _skgifCitedBy || _skgifCountsWaited.has(omid));
}

// Resolves with `page` ({ items }) once its first counts have arrived or the wait has expired.
function _skgifWithFirstCounts(page) {
  if (_skgifFirstCountsReady(page?.items)) return Promise.resolve(page);
  const omids = _skgifFirstOmids(page?.items);
  const wait = new Promise(done => setTimeout(done, SKGIF_FIRST_COUNTS_WAIT));
  return Promise.race([Promise.all(omids.map(omid => _skgifCountCitations(omid))), wait]).then(() => {
    omids.forEach(omid => _skgifCountsWaited.add(omid));
    return page;
  });
}

// --- Count boxes of the record pages ---

// Click/Enter on a count box: goes to its list (data-skgif-goto) or to another page (data-skgif-href).
function _skgifGoToList(e) {
  const box = e.target.closest('[data-skgif-goto], [data-skgif-href]');
  if (!box || (e.type === 'keydown' && e.key !== 'Enter')) return;
  if (box.dataset.skgifHref) return void (location.href = box.dataset.skgifHref);
  _skgifMarkCount(box);
  if (box.dataset.brGotoTab) document.querySelector(`[data-br-tab="${box.dataset.brGotoTab}"]`)?.click();
  const target = document.getElementById(box.dataset.skgifGoto);
  target?.querySelector('.skgif-fold')?.classList.add('skgif-unfolded'); // a closed section on phones is opened
  const rect = target?.getBoundingClientRect();
  if (!rect || (rect.top >= 0 && rect.bottom <= window.innerHeight)) return; // already on screen: the page does not move
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.addEventListener('click', _skgifGoToList);
document.addEventListener('keydown', _skgifGoToList);

// The clicked number stays marked (phones), so that the user sees which list it opened.
function _skgifMarkCount(box) {
  document.querySelectorAll('.skgif-count-current').forEach(b => b.classList.remove('skgif-count-current'));
  box?.classList.add('skgif-count-current');
}

// --- Research product record header ---

// The three header lines as text { title, line, meta }: title; authors (APA style) · year · venue, volume(issue),
// pages (or publisher); DOI · OMID.
function _skgifHeaderText(product, omid) {
  const agents = role => _skgifContributors(product.contributions, role);
  const apaName = by => {
    if (!by.family_name) return (by.name || '').trim() || 'Name not available';
    const initials = _skgifInitials(String(by.given_name || ''));
    return initials ? `${by.family_name}, ${initials}` : by.family_name;
  };
  const nameList = list => {
    const names = list.slice(0, 3).map(apaName);
    if (list.length > 3) return `${names.join(', ')}, et al.`;
    return names.length > 1 ? `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}` : names.join('');
  };
  const authors = agents('author');
  const editors = agents('editor');
  const who = authors.length ? nameList(authors)
    : editors.length ? `${nameList(editors)} (${editors.length > 1 ? 'Eds.' : 'Ed.'})` : '';

  const biblio = (_skgifArray(product.manifestations)[0] || {}).biblio || {};
  const venue = _skgifProductVenue(product);
  const year = String(_skgifProductRawDate(product) || '').slice(0, 4);
  const pageRange = _skgifPageRange(biblio, '–');
  let where = '';
  if (venue) {
    where = venue.name;
    if (biblio.volume) where += ` ${biblio.volume}`;
    if (biblio.issue) where += `(${biblio.issue})`;
    if (pageRange) where += `, ${pageRange}`;
  } else {
    where = agents('publisher').map(apaName).join(', ');
  }
  const doi = _skgifArray(product.identifiers).find(i => i.scheme === 'doi')?.value;
  return {
    title: _skgifProductTitle(product),
    line: [who, year, where].filter(Boolean).join(' · '),
    meta: [doi ? `doi:${doi}` : '', omid].filter(Boolean).join(' · ')
  };
}

// HTML of the header from its three lines.
function _skgifHeaderHtml(title, lineText, meta) {
  const line = (cls, text) => text ? `<div class="${cls}">${_skgifEscape(text)}</div>` : '';
  return line('skgif-head-title', title) + line('skgif-head-line', lineText) + line('skgif-head-meta', meta);
}

// APA initials: "Marc-Andre Luc" -> "M.-A. L." (the hyphen is kept).
const _skgifInitials = given => given.split(/\s+/).filter(Boolean)
  .map(part => part.split('-').filter(Boolean).map(p => `${p[0]}.`).join('-')).join(' ');

// --- List export (CSV, BibTeX), from the /products data as it is; a missing field is left out ---

function _skgifProductFields(product) {
  const biblio = (_skgifArray(product.manifestations)[0] || {}).biblio || {};
  const person = by => ({ family: by.family_name || '', given: by.given_name || '', name: (by.name || '').trim() });
  const ids = _skgifArray(product.identifiers);
  return {
    title: _skgifProductRawTitle(product),
    authors: _skgifContributors(product.contributions, 'author').map(person),
    editors: _skgifContributors(product.contributions, 'editor').map(person),
    publishers: _skgifContributors(product.contributions, 'publisher').map(_skgifAgentPlainName),
    date: String(_skgifProductRawDate(product) || '').slice(0, 10),
    type: _skgifProductRawType(product),
    venue: _skgifProductVenue(product)?.name || '',
    volume: biblio.volume || '',
    issue: biblio.issue || '',
    pages: dash => _skgifPageRange(biblio, dash),
    doi: ids.find(i => i.scheme === 'doi')?.value || '',
    ids: ids.map(i => `${i.scheme}:${i.value}`),
    omid: _skgifOmid(product.local_identifier)
  };
}
const _skgifPersonText = a => a.family ? [a.family, a.given].filter(Boolean).join(', ') : a.name;

// SKG-IF type -> BibTeX type and field for the journal/book; any other type = @misc.
const SKGIF_BIBTEX_TYPES = {
  'journal article': ['article', 'journal'], 'book': ['book', ''], 'book chapter': ['incollection', 'booktitle'],
  'proceedings paper': ['inproceedings', 'booktitle'], 'dissertation': ['phdthesis', ''], 'report': ['techreport', '']
};

// BibTeX entry of a publication.
function _skgifBibtex(product) {
  const f = _skgifProductFields(product);
  const [kind, venueField] = SKGIF_BIBTEX_TYPES[f.type] || ['misc', 'howpublished'];
  const esc = s => String(s).replace(/([&%$#_{}])/g, '\\$1'); // BibTeX special characters
  const names = list => list.map(a => a.family ? esc(_skgifPersonText(a)) : `{${esc(a.name)}}`).join(' and ');
  const fields = [
    ['author', names(f.authors)], ['editor', names(f.editors)], ['title', f.title && esc(f.title)],
    [venueField, f.venue && esc(f.venue)], ['publisher', esc(f.publishers.join(', '))],
    ['year', f.date.slice(0, 4)], ['volume', esc(f.volume)], ['number', esc(f.issue)],
    ['pages', esc(f.pages('--'))], ['doi', f.doi] // the DOI is read verbatim by BibTeX tools: no escaping
  ].filter(([key, value]) => key && value);
  const key = (f.omid || 'product').replace(/\W/g, '');
  return `@${kind}{${key},\n${fields.map(([k, v]) => `  ${k} = {${v}}`).join(',\n')}\n}`;
}

// CSV of a list: one row per publication (UTF-8 with BOM, so Excel reads accented letters).
function _skgifCsv(products) {
  const cell = v => /[",\n;]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const rows = [['Title', 'Authors', 'Editors', 'Date', 'Type', 'Publication venue', 'Publisher', 'Volume', 'Issue', 'Pages', 'DOI', 'Identifiers', 'OMID']];
  products.forEach(p => {
    const f = _skgifProductFields(p);
    rows.push([f.title, f.authors.map(_skgifPersonText).join('; '), f.editors.map(_skgifPersonText).join('; '), f.date, f.type,
      f.venue, f.publishers.join('; '), f.volume, f.issue, f.pages('-'), f.doi, f.ids.join('; '), f.omid]);
  });
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n');
}
