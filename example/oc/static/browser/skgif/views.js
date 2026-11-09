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

// Document header (title, authors/year/source line, IDs).
Lucinda_view.prototype.skgif_head = function (...args) {
  const [title, line, meta, omid] = args.map(_lvCell);
  return _skgifHeaderHtml(title || omid, line, meta);
};

// First two lines of the header (Citations/References pages: the IDs go in the controls row).
Lucinda_view.prototype.skgif_head_top = function (...args) {
  const [title, line, omid] = args.map(_lvCell);
  return _skgifHeaderHtml(title || omid, line, '');
};

// Title linking to the document page.
Lucinda_view.prototype.skgif_doc_link = function (...args) {
  const [omid, title] = args.map(_lvCell);
  return `<a href="browser.html?value=${_skgifEscape(omid)}">${_skgifEscape(title)}</a>`;
};

// Like skgif_agents, but only the first 5 + "+N more".
Lucinda_view.prototype.skgif_agents_short = function (...args) {
  const names = _skgifArray(_lvCell(args[0])).map(agent => _skgifAgentHtml(agent));
  return `<span>${_skgifShortNames(names, [], 'author')}</span>`;
};

// Names linking to their page, ORCID in brackets. On phones and tablets a long list shows the first
// SKGIF_RECORD_NAMES_PHONE names + "+N more" (browser.css shows the full list on desktop screens).
const SKGIF_RECORD_NAMES_PHONE = 5;
Lucinda_view.prototype.skgif_agents = function (...args) {
  const names = _skgifArray(_lvCell(args[0])).map(_skgifAgentHtml);
  if (names.length <= SKGIF_RECORD_NAMES_PHONE + 1) return names.join(' • '); // a single extra name is never hidden
  const hidden = names.length - SKGIF_RECORD_NAMES_PHONE;
  return `<span class="skgif-names-phone"><span class="skgif-names-short">${names.slice(0, SKGIF_RECORD_NAMES_PHONE).join(' • ')}</span>`
    + `<span class="skgif-names-full" hidden>${names.join(' • ')}</span> `
    + `<button type="button" class="skgif-more-names" data-more="+${_skgifNum(hidden)} more">+${_skgifNum(hidden)} more</button></span>`;
};

// Source (with link) and its identifiers.
Lucinda_view.prototype.skgif_source = function (...args) {
  const venue = _lvCell(args[0]);
  return venue ? _skgifSourceHtml(venue.name, venue.omid, venue.identifiers) : '';
};

// Identifiers with links, DOI first.
Lucinda_view.prototype.skgif_ids = function (...args) {
  return _skgifIdList(_lvCell(args[0]), args[1] ? _lvCell(args[1]) : undefined, false, true);
};

// Number with thousands separators (counts of searches and lists).
Lucinda_view.prototype.skgif_num = function (...args) {
  return _skgifEscape(String(_skgifNum(_lvCell(args[0])) ?? ''));
};

// ORCID linking to orcid.org.
Lucinda_view.prototype.skgif_orcid = function (...args) {
  const orcid = _skgifEscape(_lvCell(args[0]) ?? '');
  return `<a href="https://orcid.org/${orcid}" target="_blank">${orcid} <sup><i class="fas fa-external-link-alt small"></i></sup></a>${_skgifCopyButton(_lvCell(args[0]) ?? '')}`;
};

// Permanent URI of the citation (w3id.org/oc/index/ci/<oci>).
Lucinda_view.prototype.skgif_oci_uri = function (...args) {
  const oci = pre_skgif_oci(_lvCell(args[0]));
  if (!oci.citing) return '';
  const uri = `${OC_CI_BASE}${oci.citing}-${oci.cited}`;
  return `<p class="mt-2 mb-0 small skgif-full-uri"><span class="text-muted">Full URI:</span> <a href="${uri}" target="_blank">${uri}</a>${_skgifCopyButton(uri)}</p>`;
};

// "ci/<oci>" taken from the page URL.
Lucinda_view.prototype.skgif_oci = function (...args) {
  let oci = String(_lvCell(args[0]) ?? '');
  try { oci = decodeURIComponent(oci); } catch (e) { /* keep as is */ }
  return `ci/${_skgifEscape(oci.trim().replace(/^oci:/i, ''))}`;
};
