// Lucinda functions shared by all pages: the #postprocess of totals and the skgif_* view functions
// that fill the [[Lucinda:...]] placeholders.

// Lucinda #postprocess: returns the total number of results ("–" if the call failed).
function post_skgif_total(res) {
  const total = res.ok ? skgifTotal(res.json) : res.status === 404 ? 0 : null;
  return [["total"], [_skgifCount(total)]];
}

// --- View functions ---
// HTML of the [[Lucinda:...]] placeholders; each argument is a column of a #postprocess table.

// Value of a view function argument (the cell of the table passed by Lucinda).
function _lvCell(arg) {
  return Lucinda_util.lucinda_unformat(arg).getData()[0]?.[0];
}

// Plain text, escaped.
Lucinda_view.prototype.skgif_text = function (...args) {
  return _skgifEscape(_lvCell(args[0]) ?? '');
};

// Publication date in words (British English): "2019" for YYYY-01-01, "March 2019" for YYYY-MM-01, otherwise "28 February 2019".
const SKGIF_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December'];
Lucinda_view.prototype.skgif_date = function (...args) {
  const raw = String(_lvCell(args[0]) ?? '');
  const [year, month, day] = raw.slice(0, 10).split('-');
  const monthName = SKGIF_MONTHS[parseInt(month, 10) - 1];
  if (!/^\d{4}$/.test(year || '') || !monthName) return _skgifEscape(raw);
  if (month === '01' && day === '01') return year;
  if (!day || day === '01') return `${monthName} ${year}`;
  return `${parseInt(day, 10)} ${monthName} ${year}`;
};

// Research product header (title, authors/year/venue line, IDs).
Lucinda_view.prototype.skgif_head = function (...args) {
  const [title, line, meta, omid] = args.map(_lvCell);
  return _skgifHeaderHtml(title || omid, line, meta);
};

// Title linking to the research product record.
Lucinda_view.prototype.skgif_product_link = function (...args) {
  const [omid, title] = args.map(_lvCell);
  return `<a href="browser.html?value=${_skgifEscape(omid)}">${_skgifEscape(title)}</a>`;
};

// Names linking to their page: the first 5 (3 on phones) + "+N more", as in the cards.
Lucinda_view.prototype.skgif_agents_short = function (...args) {
  const names = _skgifArray(_lvCell(args[0])).map(_skgifAgentHtml);
  return `<span>${_skgifShortNames(names, [], 'author')}</span>`;
};

// Names linking to their page, ORCID in brackets. On phones and tablets a long list shows the first
// SKGIF_RECORD_NAMES_PHONE names + "+N more" (on desktop browser.css shows the full list).
const SKGIF_RECORD_NAMES_PHONE = 3;
Lucinda_view.prototype.skgif_agents = function (...args) {
  const names = _skgifArray(_lvCell(args[0])).map(_skgifAgentHtml);
  if (names.length <= SKGIF_RECORD_NAMES_PHONE) return names.join(' • ');
  const hidden = names.length - SKGIF_RECORD_NAMES_PHONE;
  return `<span class="skgif-names-phone"><span class="skgif-names-short">${names.slice(0, SKGIF_RECORD_NAMES_PHONE).join(' • ')}</span>`
    + `<span class="skgif-names-full" hidden>${names.join(' • ')}</span> `
    + `<button type="button" class="skgif-more-names" data-more="+${_skgifNum(hidden)} more">+${_skgifNum(hidden)} more</button></span>`;
};

// Venue (with link) and its identifiers.
Lucinda_view.prototype.skgif_venue = function (...args) {
  const venue = _lvCell(args[0]);
  return venue ? _skgifVenueHtml(venue.name, venue.omid, venue.identifiers) : '';
};

// Identifiers with links and copy icons, DOI first, omid (second argument, optional) last.
Lucinda_view.prototype.skgif_ids = function (...args) {
  return _skgifIdList(_lvCell(args[0]), args[1] ? _lvCell(args[1]) : undefined, true);
};

// Cards of the first page of a search (entity, total and results from post_skgif_search); the next pages
// are built by skgifPaginatedSearch with the same card functions (SKGIF_SEARCH_CARDS).
Lucinda_view.prototype.skgif_search_cards = function (...args) {
  const [entity, total, items, label] = args.map(_lvCell);
  if (total === '–') return _skgifUnavailableHtml(true);
  const list = _skgifArray(items);
  if (!list.length) return _skgifEmptySearchHtml(entity, label); // suggestions (pages/search.js)
  return list.map(SKGIF_SEARCH_CARDS[entity]).join('');
};

// Number with thousands separators (counts of searches and lists).
Lucinda_view.prototype.skgif_num = function (...args) {
  return _skgifEscape(String(_skgifNum(_lvCell(args[0])) ?? ''));
};

// ORCID linking to orcid.org, with its copy icon.
Lucinda_view.prototype.skgif_orcid = function (...args) {
  const value = _lvCell(args[0]) ?? '';
  const orcid = _skgifEscape(value);
  return `<span class="text-nowrap"><a href="https://orcid.org/${orcid}" target="_blank">${orcid}</a>${_skgifCopyButton(value)}</span>`;
};

// Permanent URI of the citation (w3id.org/oc/index/ci/<oci>).
Lucinda_view.prototype.skgif_oci_uri = function (...args) {
  const oci = pre_skgif_oci(_lvCell(args[0]));
  if (!oci.citing) return '';
  const uri = `${OC_CI_BASE}${oci.citing}-${oci.cited}`;
  return `<p class="mt-2 mb-0 small skgif-full-uri"><span class="text-muted">OCI:</span> ci/${_skgifEscape(oci.citing)}-${_skgifEscape(oci.cited)} · <span class="text-muted">Full URI:</span> <a href="${uri}" target="_blank">${uri}</a>${_skgifCopyButton(uri)}</p>`;
};

// Title of the citation record: "<citing title> (year) cites <cited title> (year)", with links;
// the OCI when one of the two works is missing.
Lucinda_view.prototype.skgif_ci_title = function (...args) {
  const [oci, citingOmid, citingTitle, citingDate, citedOmid, citedTitle, citedDate] = args.map(_lvCell);
  if (!citingTitle || !citedTitle) return this.skgif_oci(args[0]);
  const work = (omid, title, date) => {
    const year = String(date || '').slice(0, 4);
    return `<a href="browser.html?value=${_skgifEscape(omid)}">${_skgifEscape(title)}</a>${/^\d{4}$/.test(year) ? ` <span class="text-muted">(${year})</span>` : ''}`;
  };
  return `<span class="skgif-ci-sentence">${work(citingOmid, citingTitle, citingDate)} <span class="skgif-ci-verb">cites</span> ${work(citedOmid, citedTitle, citedDate)}</span>`;
};

// "ci/<oci>" as written in the page URL.
Lucinda_view.prototype.skgif_oci = function (...args) {
  return `ci/${_skgifEscape(_skgifDecode(_lvCell(args[0])).trim().replace(/^oci:/i, ''))}`;
};
