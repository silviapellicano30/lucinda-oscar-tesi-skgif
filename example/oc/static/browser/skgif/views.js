// SILVIA - MIGRAZIONE SKG-IF
// Funzioni per Lucinda comuni a tutte le pagine: #postprocess del totale e view functions skgif_* dei segnaposto [[Lucinda:...]].

// #postprocess di Lucinda: restituisce il totale dei risultati ("–" se la chiamata è fallita).
function post_skgif_total(res) {
  const total = res.ok ? skgifTotal(res.json) : res.status === 404 ? 0 : null;
  return [["total"], [_ciCount(total)]];
}

// --- VIEW FUNCTIONS ---
// HTML dei segnaposto [[Lucinda:...]]; ogni argomento è una colonna di un #postprocess.
function _lvCell(arg) {
  return Lucinda_util.lucinda_unformat(arg).getData()[0]?.[0];
}

// Testo semplice, protetto.
Lucinda_view.prototype.skgif_text = function (...args) {
  return _skgifEscape(_lvCell(args[0]) ?? '');
};

// Intestazione del documento (titolo, riga autori/anno/rivista, ID).
Lucinda_view.prototype.skgif_head = function (...args) {
  const [title, line, meta, omid] = args.map(_lvCell);
  return _skgifHeaderHtml(title || omid, line, meta);
};

// Le prime due righe dell'intestazione (Citations/References: gli ID vanno nella riga dei controlli).
Lucinda_view.prototype.skgif_head_top = function (...args) {
  const [title, line, omid] = args.map(_lvCell);
  return _skgifHeaderHtml(title || omid, line, '');
};

// Titolo con link alla scheda documento.
Lucinda_view.prototype.skgif_doc_link = function (...args) {
  const [omid, title] = args.map(_lvCell);
  return `<a href="browser.html?value=${_skgifEscape(omid)}">${_skgifEscape(title)}</a>`;
};

// Come skgif_agents, ma solo i primi 5 + "+N more".
Lucinda_view.prototype.skgif_agents_short = function (...args) {
  const names = _skgifArray(_lvCell(args[0])).map(agent => _skgifAgentHtml(agent));
  return `<span>${_skgifShortNames(names, [], 'author')}</span>`;
};

// Nomi con link alla loro scheda, ORCID tra parentesi.
Lucinda_view.prototype.skgif_agents = function (...args) {
  return _skgifArray(_lvCell(args[0])).map(_skgifAgentHtml).join(' • ');
};

// Rivista (con link) e i suoi identificativi.
Lucinda_view.prototype.skgif_source = function (...args) {
  const venue = _lvCell(args[0]);
  return venue ? _skgifSourceHtml(venue.name, venue.omid, venue.identifiers) : '';
};

// Identificativi con link, DOI per primo.
Lucinda_view.prototype.skgif_ids = function (...args) {
  return _skgifIdList(_lvCell(args[0]), args[1] ? _lvCell(args[1]) : undefined, false, true);
};

// ORCID con link a orcid.org.
Lucinda_view.prototype.skgif_orcid = function (...args) {
  const orcid = _skgifEscape(_lvCell(args[0]) ?? '');
  return `<a href="https://orcid.org/${orcid}" target="_blank">${orcid} <sup><i class="fas fa-external-link-alt small"></i></sup></a>${_skgifCopyButton(_lvCell(args[0]) ?? '')}`;
};

// URI permanente della citazione (w3id.org/oc/index/ci/<oci>).
Lucinda_view.prototype.skgif_oci_uri = function (...args) {
  const oci = pre_skgif_oci(_lvCell(args[0]));
  if (!oci.citing) return '';
  const uri = `${OC_CI_BASE}${oci.citing}-${oci.cited}`;
  return `<p class="mt-2 mb-0 small"><span class="text-muted">Full URI:</span> <a href="${uri}" target="_blank">${uri}</a>${_skgifCopyButton(uri)}</p>`;
};

// "ci/<oci>" preso dall'URL della pagina.
Lucinda_view.prototype.skgif_oci = function (...args) {
  let oci = String(_lvCell(args[0]) ?? '');
  try { oci = decodeURIComponent(oci); } catch (e) { /* keep as is */ }
  return `ci/${_skgifEscape(oci.trim().replace(/^oci:/i, ''))}`;
};
