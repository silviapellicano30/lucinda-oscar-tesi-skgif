// Document cards, identifiers with links, names (authors, editors, publishers), record page headers.

// Product type ("journal article"...).
function _skgifProductType(product) {
  return _skgifArray(product.manifestations).map(m => m?.type?.labels?.en).find(Boolean) || 'Type not available';
}

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

// Order in which identifiers are shown (omid last).
const SKGIF_ID_ORDER = ['doi', 'pmid', 'pmcid', 'arxiv', 'isbn', 'issn', 'openalex'];
// IDs a person recognises; on phones a card shows only the first of these
const SKGIF_MAIN_IDS = ['doi', 'pmid', 'pmcid', 'arxiv', 'isbn', 'issn', 'crossref'];

// Position of a scheme in SKGIF_ID_ORDER (unknown schemes after the listed ones, omid last).
function _skgifIdRank(scheme) {
  if (scheme === 'omid') return SKGIF_ID_ORDER.length + 1;
  const i = SKGIF_ID_ORDER.indexOf(scheme);
  return i === -1 ? SKGIF_ID_ORDER.length : i;
}

// "scheme:value", linking to the external page when there is one.
function _skgifIdLink(scheme, value) {
  const s = String(scheme || "").toLowerCase();
  const label = _skgifEscape(`${s}:${value}`);
  const url = SKGIF_ID_URLS[s] ? SKGIF_ID_URLS[s](String(value)) : "";
  return url
    ? `<a href="${_skgifEscape(url)}" target="_blank" class="text-dark text-decoration-none">${label}</a>` // external links open in a new tab, internal ones in the same tab
    : label;
}

// Identifier line ("doi:... • omid:br/..."); asBadges = as badges; copy = copy icon (record pages).
function _skgifIdList(identifiers, omid, asBadges = false, copy = false) {
  const ids = _skgifArray(identifiers)
    .filter(i => i && i.scheme && i.value)
    .map(i => ({ scheme: String(i.scheme).toLowerCase(), value: i.value }));
  if (omid) ids.push({ scheme: 'omid', value: omid });
  const sorted = ids
    .map((id, i) => ({ id, i }))
    .sort((a, b) => _skgifIdRank(a.id.scheme) - _skgifIdRank(b.id.scheme) || a.i - b.i);
  // on phones a card shows only the main human-readable ID (DOI, ISSN, ISBN, Crossref...) + the omid
  if (!copy && !asBadges) {
    let main = sorted.findIndex(x => SKGIF_MAIN_IDS.includes(x.id.scheme));
    if (main === -1) main = sorted.findIndex(x => x.id.scheme === 'omid'); // no human-readable ID: only the omid is left
    const shown = x => x === sorted[main] ? 'skgif-id-main' : x.id.scheme === 'omid' ? 'skgif-id-keep' : 'skgif-id-extra'; // the omid is always shown
    return sorted.map((x, i) => `<span class="${shown(x)}">`
      + `${i ? '<span class="skgif-id-sep"> • </span>' : ''}${_skgifIdLink(x.id.scheme, x.id.value)}</span>`).join('');
  }
  return sorted
    .map(x => copy ? `<span class="text-nowrap">${_skgifIdLink(x.id.scheme, x.id.value)}${_skgifCopyButton(x.id.value)}</span>` : _skgifIdLink(x.id.scheme, x.id.value)) // the icon always stays on the same line as its ID
    .map(link => asBadges ? `<span class="badge ra-id-badge">${link}</span>` : link)
    .join(asBadges ? ' ' : ' • ');
}

// People/organisations of a product with a given role (author, editor, publisher), in order.
function _skgifContributors(contributions, role) {
  return _skgifArray(contributions)
    .filter(c => c && c.role === role && c.by)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map(c => c.by);
}

// Name as "Family, Given" (or organisation name), escaped for HTML.
function _skgifAgentName(by) {
  return _skgifEscape(_skgifAgentPlainName(by));
}

// The same name, not escaped (data for a #postprocess).
function _skgifAgentPlainName(by) {
  return (by.name || '').trim() || [by.family_name, by.given_name].filter(Boolean).join(', ') || 'Name not available';
}

// Link to the page of a person/organisation: browser.html?value=ra/<id>.
const _skgifAgentUrl = agentOmid => `browser.html?value=${agentOmid}`;

// Names with a given role, linking to their page (and ORCID if withOrcid); "" if none.
function _skgifAgents(contributions, role, agentUrl = _skgifAgentUrl, withOrcid = true) {
  return _skgifContributors(contributions, role)
    .map(by => {
      const name = _skgifAgentName(by);
      const agentOmid = _skgifOmid(by.local_identifier);
      const orcid = withOrcid ? _skgifArray(by.identifiers).find(i => i.scheme === 'orcid')?.value : null;
      let html = agentOmid
        ? `<a href="${agentUrl(agentOmid)}" class="text-dark text-decoration-none">${name}</a>`
        : `<span>${name}</span>`;
      if (orcid) html += ` <span class="text-nowrap">(<a href="https://orcid.org/${_skgifEscape(orcid)}" target="_blank">${_skgifEscape(orcid)}</a>)</span>`; // brackets and ORCID on the same line
      return html;
    })
    .join(' • ');
}

// Pages "first-last" (just one if equal), "" if missing.
function _skgifPageRange(biblio, dash) {
  const pages = (biblio || {}).pages || {};
  return pages.first && pages.last && pages.first !== pages.last ? `${pages.first}${dash}${pages.last}` : (pages.first || pages.last || '');
}

// A name linking to its page, with the ORCID in brackets (if any).
function _skgifAgentHtml(agent) {
  let html = agent.omid
    ? `<a href="${_skgifAgentUrl(agent.omid)}" class="text-dark text-decoration-none">${_skgifEscape(agent.name)}</a>`
    : `<span>${_skgifEscape(agent.name)}</span>`;
  if (agent.orcid) html += ` <span class="text-nowrap">(<a href="https://orcid.org/${_skgifEscape(agent.orcid)}" target="_blank">${_skgifEscape(agent.orcid)}</a>${_skgifCopyButton(agent.orcid)})</span>`;
  return html;
}

// --- Products: title, date, source ---

// Title of a product (the one without a language tag, otherwise the first).
function _skgifProductTitle(product) {
  return _skgifProductRawTitle(product) || 'Title not available';
}

// The same title, '' if missing.
function _skgifProductRawTitle(product) {
  const titles = product.titles || {};
  return (titles.none || Object.values(titles)[0] || [])[0] || '';
}

// Publication date as given by the API; undefined if missing.
function _skgifProductRawDate(product) {
  const manifestations = _skgifArray(product.manifestations);
  return manifestations.map(m => m?.dates?.publication?.[0]).find(Boolean);
}

// Name of the product's source (italic, with link); "" if missing.
function _skgifProductSource(product) {
  const venue = _skgifProductVenue(product);
  return venue ? _skgifSourceHtml(venue.name, _skgifOmid(venue.local_identifier), []) : "";
}

// The source of the product, or undefined.
function _skgifProductVenue(product) {
  return _skgifArray(product.manifestations).map(m => m?.biblio?.in).find(v => v && v.name);
}

// HTML of a source from its data.
function _skgifSourceHtml(name, venueOmid, identifiers) {
  const venueTitle = `<i>${_skgifEscape(name)}</i>`;
  const titleHtml = venueOmid
    ? `<a href="browser.html?value=${venueOmid}" class="text-dark text-decoration-none">${venueTitle}</a>`
    : venueTitle;
  const venueIds = _skgifIdList(identifiers, undefined, false, true); // record pages only (cards pass [])
  return venueIds ? `${titleHtml}<span class="skgif-source-ids"> (${venueIds})</span>` : titleHtml; // span = can be hidden on phones
}

// --- Cards and lists shared by several pages ---

// Card of a work, used by every list: year/role badge, Authors, Type, Source or Publisher, IDs, Go to (airy = more spacing).
function _skgifWorkCard(product, badgeOf = _skgifEditorBadge, airy = false) {
  const omid = _skgifOmid(product.local_identifier);
  if (!omid) return '';
  const year = String(_skgifProductRawDate(product) || '').slice(0, 4);
  const contributions = _skgifArray(product.contributions);
  const role = contributions.some(c => c && c.role === 'author' && c.by) ? 'author' : 'editor';
  const names = _skgifContributors(contributions, role).map(by => {
    const name = _skgifAgentName(by);
    const agentOmid = _skgifOmid(by.local_identifier);
    const html = agentOmid ? `<a href="${_skgifAgentUrl(agentOmid)}">${name}</a>` : name;
    return by.local_identifier === _skgifProfileOmid ? `<strong>${html}</strong>` : html; // the person of the profile in bold
  });
  const namesHtml = names.length ? _skgifShortNames(names, contributions, role) : '<span class="skgif-none">Not available</span>';
  const source = _skgifProductSource(product);
  const publisher = source ? '' : _skgifAgents(contributions, 'publisher');
  const type = _skgifArray(product.manifestations).map(m => m?.type?.labels?.en).find(Boolean) || '';
  const ids = _skgifIdList(product.identifiers, omid); // links as in the Overview
  const roleBadge = badgeOf(_skgifProfileRoles(product));
  const badges = (roleBadge ? `<span class="badge ra-role-badge">${roleBadge}</span>` : '')
    + (year ? `<span class="badge ra-year-badge">${_skgifEscape(year)}</span>` : '');

  return `
    <div class="col-12 mb-2">
      <div class="card shadow-sm ra-work${airy ? ' skgif-card-airy' : ''}" data-omid="${omid}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-1">
            <h5 class="ra-work-title"><a href="browser.html?value=${omid}">${_skgifEscape(_skgifProductTitle(product))}</a></h5>
            <div class="d-flex gap-1 flex-shrink-0">${badges}</div>
          </div>
          <div class="ra-work-line ra-line-authors"><span class="fw-bold${role === 'author' && names.length ? ' ra-label-phone-hide' : ''}">${role === 'author' || !names.length ? 'Authors' : 'Editors'}:</span> ${namesHtml}</div>
          ${type ? `<div class="ra-work-line ra-line-type"><span class="fw-bold ra-label-phone-hide">Type:</span> ${_skgifEscape(type)}</div>` : ''}
          ${source ? `<div class="ra-work-line ra-line-source"><span class="fw-bold ra-label-phone-hide">Source:</span> ${source}</div>` : ''}
          ${publisher ? `<div class="ra-work-line ra-line-publisher"><span class="fw-bold">Publisher:</span> ${publisher}</div>` : ''}
          <div class="ra-work-line ra-line-meta">${[source, year && _skgifEscape(year), roleBadge].filter(Boolean).join(' · ')}</div><!-- source · year · role, shown on phones only -->
          ${ids ? `<div class="ra-work-line ra-line-ids"><span class="fw-bold">IDs:</span> ${ids}</div>` : ''}
          <div class="d-flex justify-content-end gap-3 ra-work-links">
            <span class="ra-work-linkpair">
              ${_skgifLinkButton(`browser.html?value=doc_ref/${omid}`, 'Go to References', _skgifArray(product.related_products?.cites).length, 'ra-ref-btn')}
              <span class="skgif-cit-slot">${_skgifCitationsButton(omid)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>`;
}

// Authors in cards: the first SKGIF_CARD_NAMES + "+N more" (the person of the profile stays visible).
// On phones (same breakpoint as the CSS) 3 authors instead of 5.
const SKGIF_CARD_NAMES = 5;
const SKGIF_CARD_NAMES_PHONE = 3;
const _skgifIsPhone = () => window.matchMedia('(max-width: 575.98px)').matches;
function _skgifShortNames(names, contributions, role) {
  const max = _skgifIsPhone() ? SKGIF_CARD_NAMES_PHONE : SKGIF_CARD_NAMES;
  // on phones at most 3 names in total (the person of the profile included); on desktop a single extra name is never hidden
  const phone = _skgifIsPhone();
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

// "+N more" / "Show less": shows or hides all the authors of the card.
document.addEventListener('click', e => {
  const btn = e.target.closest('.skgif-more-names');
  if (!btn) return;
  const line = btn.parentElement;
  const open = line.querySelector('.skgif-names-full').hidden;
  line.querySelector('.skgif-names-full').hidden = !open;
  line.querySelector('.skgif-names-short').hidden = open;
  btn.textContent = open ? 'Show less' : btn.dataset.more;
});

// Click/Enter on the count boxes: goes to the list (data-skgif-goto) or to another page (data-skgif-href).
function _skgifGoToList(e) {
  const box = e.target.closest('[data-skgif-goto], [data-skgif-href]');
  if (!box || (e.type === 'keydown' && e.key !== 'Enter')) return;
  if (box.dataset.skgifHref) return void (location.href = box.dataset.skgifHref); // box that opens another page
  if (box.dataset.brGotoTab) document.querySelector(`[data-br-tab="${box.dataset.brGotoTab}"]`)?.click();
  const target = document.getElementById(box.dataset.skgifGoto);
  target?.querySelector('.skgif-fold')?.classList.add('skgif-unfolded'); // a closed section on phones is opened
  const rect = target?.getBoundingClientRect();
  // everything already on screen (e.g. citation chart next to the box): the page does not move
  if (!rect || (rect.top >= 0 && rect.bottom <= window.innerHeight)) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.addEventListener('click', _skgifGoToList);
document.addEventListener('keydown', _skgifGoToList);

// The three header lines as text { title, line, meta }.
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

  const manifestations = _skgifArray(product.manifestations);
  const biblio = (manifestations[0] || {}).biblio || {};
  const venue = manifestations.map(m => m?.biblio?.in).find(v => v && v.name);
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

// Cards of the search results and of the Go to pages: the shared card, airy version, without role.
function _skgifDocumentCard(product) {
  return _skgifWorkCard(product, () => '', true);
}

// OMID of the person/organisation whose profile is shown (bold in the cards, used for the role badges).
let _skgifProfileOmid = '';

// "Go to References (N)" and "Go to Citations (N)" in every card. With 0 the button is grey and not clickable.
// References: number of references already in the work's JSON (related_products.cites), no calls.
// Citations: one SKG-IF call per work (cf.cites, page_size=1, 404 = 0), only for the cards on screen,
// SKGIF_CITE_COUNT_PARALLEL at a time; numbers are remembered and calls are never repeated (the author profile,
// _loadAuthorCitations, also requests them from here). No number until it arrives or if the call fails.
const SKGIF_CITE_COUNT_PARALLEL = 6;
const _skgifCitedBy = {}; // OMID of the work (br/...) -> number of citations
const _skgifCitedByPending = {}; // OMID -> promise of the number (null = call failed)
const _skgifCiteQueue = [];
let _skgifCiteRunning = 0;
// later = at the end of the queue (author profile total); the cards on screen go first.
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
    _skgifCiteQueue.splice(later ? _skgifCiteQueue.length : firstLater(), 0, { omid, done, later }); // in order, before the total
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
// Number in brackets inside a <span> (.skgif-n): in the Citations button it has its own reserved space (browser.css).
function _skgifLinkButton(href, label, n, cls, fadeIn = false) {
  label = label.replace(/^Go to /, '<span class="skgif-goto">Go to </span>'); // "Go to" hidden on phones (CSS)
  const number = n === undefined ? '' : `<span class="skgif-n${fadeIn ? ' skgif-n-in' : ''}"> (${_skgifNum(n)})</span>`;
  if (n === 0) return `<span class="btn btn-sm ${cls} skgif-link-none" aria-disabled="true">${label}${number}</span>`;
  return `<a href="${href}" class="btn btn-sm ${cls}">${label}${number}</a>`;
}
// "Go to Citations (N)" button of a work; without a known number it is marked to be counted.
function _skgifCitationsButton(omid, fadeIn = false) {
  const n = _skgifCitedBy[omid];
  const button = _skgifLinkButton(`browser.html?value=doc_cit/${omid}`, 'Go to Citations', n, 'ra-cit-btn', fadeIn);
  return n === undefined ? button.replace('<a ', `<a data-count="${omid}" `) : button; // to be counted (_skgifCountVisible)
}
// Puts the number into the button of the cards already on screen (fading in, in the reserved space).
function _skgifShowCitedBy(omid) {
  document.querySelectorAll(`.ra-work[data-omid="${omid}"] .ra-cit-btn`).forEach(btn => {
    btn.outerHTML = _skgifCitationsButton(omid, true).replace(/ data-count="[^"]*"/, '');
  });
}
// The first page of a list (skgifFirstPage) waits for the citation counts of the first
// SKGIF_FIRST_COUNTS works, at most SKGIF_FIRST_COUNTS_WAIT ms: the top cards appear with their number.
// The others receive it later, in the reserved space (.skgif-cit-slot). Products only (not people/venues).
// Also applies to every page change, Sort by and filter (_skgifPagedList, searches, author profile).
const SKGIF_FIRST_COUNTS = 3;
const SKGIF_FIRST_COUNTS_WAIT = 3000;
const _skgifCountsWaited = new Set(); // already waited for once (even if the call failed): never waited for again
const _skgifFirstOmids = items => _skgifArray(items).filter(p => p?.entity_type === 'product')
  .slice(0, SKGIF_FIRST_COUNTS).map(p => _skgifOmid(p.local_identifier)).filter(Boolean);
// True if the first cards of `items` can appear immediately (numbers already received or already waited for).
function _skgifFirstCountsReady(items) {
  return _skgifFirstOmids(items).every(omid => omid in _skgifCitedBy || _skgifCountsWaited.has(omid));
}
function _skgifWithFirstCounts(page) {
  const omids = _skgifFirstOmids(page?.items);
  if (_skgifFirstCountsReady(page?.items)) return Promise.resolve(page);
  const wait = new Promise(done => setTimeout(done, SKGIF_FIRST_COUNTS_WAIT));
  return Promise.race([Promise.all(omids.map(_skgifCountCitations)), wait]).then(() => {
    omids.forEach(omid => _skgifCountsWaited.add(omid));
    return page;
  });
}
// New cards on screen -> requests their citation count (once per button).
function _skgifCountVisible() {
  document.querySelectorAll('.ra-cit-btn[data-count]').forEach(btn => {
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

// Roles of the profile person in a work.
function _skgifProfileRoles(product) {
  const contributions = _skgifArray(product.contributions);
  return new Set(contributions.filter(c => c && c.by && c.by.local_identifier === _skgifProfileOmid).map(c => c.role));
}

// --- List export (CSV, BibTeX), from the /products data as it is ---
// Missing field = field left out.
function _skgifWorkFields(product) {
  const biblio = (_skgifArray(product.manifestations)[0] || {}).biblio || {};
  const pages = biblio.pages || {};
  const person = by => ({ family: by.family_name || '', given: by.given_name || '', name: (by.name || '').trim() });
  const ids = _skgifArray(product.identifiers);
  return {
    title: _skgifProductRawTitle(product),
    authors: _skgifContributors(product.contributions, 'author').map(person),
    editors: _skgifContributors(product.contributions, 'editor').map(person),
    publishers: _skgifContributors(product.contributions, 'publisher').map(_skgifAgentPlainName),
    date: String(_skgifProductRawDate(product) || '').slice(0, 10),
    type: _skgifArray(product.manifestations).map(m => m?.type?.labels?.en).find(Boolean) || '',
    source: _skgifProductVenue(product)?.name || '',
    volume: biblio.volume || '',
    issue: biblio.issue || '',
    pages: pages.first && pages.last && pages.first !== pages.last ? [pages.first, pages.last] : [pages.first || pages.last].filter(Boolean),
    doi: ids.find(i => i.scheme === 'doi')?.value || '',
    ids: ids.map(i => `${i.scheme}:${i.value}`),
    omid: _skgifOmid(product.local_identifier)
  };
}
// APA initials: "Marc-Andre Luc" -> "M.-A. L." (the hyphen is kept).
const _skgifInitials = given => given.split(/\s+/).filter(Boolean)
  .map(part => part.split('-').filter(Boolean).map(p => `${p[0]}.`).join('-')).join(' ');
const _skgifPersonText = a => a.family ? [a.family, a.given].filter(Boolean).join(', ') : a.name;

// SKG-IF type -> BibTeX type and field for the journal/book; any other type = @misc.
const SKGIF_BIBTEX_TYPES = {
  'journal article': ['article', 'journal'], 'book': ['book', ''], 'book chapter': ['incollection', 'booktitle'],
  'proceedings article': ['inproceedings', 'booktitle'], 'dissertation': ['phdthesis', ''], 'report': ['techreport', '']
};
// BibTeX entry of a work.
function _skgifBibtex(product) {
  const f = _skgifWorkFields(product);
  const [kind, sourceField] = SKGIF_BIBTEX_TYPES[f.type] || ['misc', 'howpublished'];
  const esc = s => String(s).replace(/([&%$#_{}])/g, '\$1');
  const names = list => list.map(a => a.family ? esc(_skgifPersonText(a)) : `{${esc(a.name)}}`).join(' and ');
  const fields = [
    ['author', names(f.authors)], ['editor', names(f.editors)], ['title', f.title && esc(f.title)],
    [sourceField, f.source && esc(f.source)], ['publisher', esc(f.publishers.join(', '))],
    ['year', f.date.slice(0, 4)], ['volume', esc(f.volume)], ['number', esc(f.issue)],
    ['pages', esc(f.pages.join('--'))], ['doi', esc(f.doi)]
  ].filter(([key, value]) => key && value);
  const key = (f.omid || 'work').replace(/\W/g, '');
  return `@${kind}{${key},\n${fields.map(([k, v]) => `  ${k} = {${v}}`).join(',\n')}\n}`;
}

// CSV of a list: one row per work (UTF-8 with BOM, so Excel reads accented letters).
function _skgifCsv(products) {
  const cell = v => /[",\n;]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const rows = [['Title', 'Authors', 'Editors', 'Date', 'Type', 'Source', 'Publisher', 'Volume', 'Issue', 'Pages', 'DOI', 'Identifiers', 'OMID']];
  products.forEach(p => {
    const f = _skgifWorkFields(p);
    rows.push([f.title, f.authors.map(_skgifPersonText).join('; '), f.editors.map(_skgifPersonText).join('; '), f.date, f.type,
      f.source, f.publishers.join('; '), f.volume, f.issue, f.pages.join('-'), f.doi, f.ids.join('; '), f.omid]);
  });
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n');
}

// --- Badges ---

// "Editor" badge of a work in a profile.
function _skgifEditorBadge(roles) {
  return !roles.has('editor') ? '' : roles.has('author') ? 'Author &amp; Editor' : 'Editor';
}
