// SILVIA - MIGRAZIONE SKG-IF
// Card dei documenti, identificativi con link, nomi (autori, editor, publisher), intestazione delle schede.

// Tipo del prodotto ("journal article"...).
function _skgifProductType(product) {
  return _skgifArray(product.manifestations).map(m => m?.type?.labels?.en).find(Boolean) || 'unknown type';
}

// Link alla pagina esterna di ogni schema di ID ("" = nessun link).
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

// Ordine in cui mostrare gli identificativi (omid in fondo).
const SKGIF_ID_ORDER = ['doi', 'pmid', 'pmcid', 'arxiv', 'isbn', 'issn', 'openalex'];

function _skgifIdRank(scheme) {
  if (scheme === 'omid') return SKGIF_ID_ORDER.length + 1;
  const i = SKGIF_ID_ORDER.indexOf(scheme);
  return i === -1 ? SKGIF_ID_ORDER.length : i;
}

// "schema:valore", con link alla pagina esterna se c'è.
function _skgifIdLink(scheme, value) {
  const s = String(scheme || "").toLowerCase();
  const label = _skgifEscape(`${s}:${value}`);
  const url = SKGIF_ID_URLS[s] ? SKGIF_ID_URLS[s](String(value)) : "";
  return url
    ? `<a href="${_skgifEscape(url)}" target="_blank" class="text-dark text-decoration-none">${label}</a>` // link esterni in una nuova scheda, quelli interni nella stessa
    : label;
}

// Riga degli identificativi ("doi:... • omid:br/..."); asBadges = come badge; copy = icona per copiare (schede).
function _skgifIdList(identifiers, omid, asBadges = false, copy = false) {
  const ids = _skgifArray(identifiers)
    .filter(i => i && i.scheme && i.value)
    .map(i => ({ scheme: String(i.scheme).toLowerCase(), value: i.value }));
  if (omid) ids.push({ scheme: 'omid', value: omid });
  return ids
    .map((id, i) => ({ id, i }))
    .sort((a, b) => _skgifIdRank(a.id.scheme) - _skgifIdRank(b.id.scheme) || a.i - b.i)
    .map(x => copy ? `<span class="text-nowrap">${_skgifIdLink(x.id.scheme, x.id.value)}${_skgifCopyButton(x.id.value)}</span>` : _skgifIdLink(x.id.scheme, x.id.value)) // icona sempre sulla riga del suo ID
    .map(link => asBadges ? `<span class="badge ra-id-badge">${link}</span>` : link)
    .join(asBadges ? ' ' : ' • ');
}

// Persone/organizzazioni di un prodotto con un certo ruolo (author, editor, publisher), in ordine.
function _skgifContributors(contributions, role) {
  return _skgifArray(contributions)
    .filter(c => c && c.role === role && c.by)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map(c => c.by);
}

// Nome come "Cognome, Nome" (o nome dell'organizzazione), protetto per l'HTML.
function _skgifAgentName(by) {
  return _skgifEscape(_skgifAgentPlainName(by));
}

// Lo stesso nome, non protetto (dati per un #postprocess).
function _skgifAgentPlainName(by) {
  return (by.name || '').trim() || [by.family_name, by.given_name].filter(Boolean).join(', ') || 'Unknown Name';
}

// Link alla scheda di una persona/organizzazione: browser.html?value=ra/<id>.
const _skgifAgentUrl = agentOmid => `browser.html?value=${agentOmid}`;

// Nomi con un certo ruolo, con link alla loro scheda (e ORCID se withOrcid); "" se nessuno.
function _skgifAgents(contributions, role, agentUrl = _skgifAgentUrl, withOrcid = true) {
  return _skgifContributors(contributions, role)
    .map(by => {
      const name = _skgifAgentName(by);
      const agentOmid = _skgifOmid(by.local_identifier);
      const orcid = withOrcid ? _skgifArray(by.identifiers).find(i => i.scheme === 'orcid')?.value : null;
      let html = agentOmid
        ? `<a href="${agentUrl(agentOmid)}" class="text-dark text-decoration-none">${name}</a>`
        : `<span>${name}</span>`;
      if (orcid) html += ` <span class="text-nowrap">(<a href="https://orcid.org/${_skgifEscape(orcid)}" target="_blank">${_skgifEscape(orcid)}</a>)</span>`; // parentesi e ORCID sulla stessa riga
      return html;
    })
    .join(' • ');
}

// Pagine "prima-ultima" (una sola se uguali), "" se mancano.
function _skgifPageRange(biblio, dash) {
  const pages = (biblio || {}).pages || {};
  return pages.first && pages.last && pages.first !== pages.last ? `${pages.first}${dash}${pages.last}` : (pages.first || pages.last || '');
}

// Un nome con link alla sua scheda e l'ORCID tra parentesi (se c'è).
function _skgifAgentHtml(agent) {
  let html = agent.omid
    ? `<a href="${_skgifAgentUrl(agent.omid)}" class="text-dark text-decoration-none">${_skgifEscape(agent.name)}</a>`
    : `<span>${_skgifEscape(agent.name)}</span>`;
  if (agent.orcid) html += ` <span class="text-nowrap">(<a href="https://orcid.org/${_skgifEscape(agent.orcid)}" target="_blank">${_skgifEscape(agent.orcid)}</a>${_skgifCopyButton(agent.orcid)})</span>`;
  return html;
}

// --- Prodotti: titolo, data, rivista ---

// Titolo di un prodotto (quello senza lingua, altrimenti il primo).
function _skgifProductTitle(product) {
  return _skgifProductRawTitle(product) || 'No title';
}

// Lo stesso titolo, '' se manca.
function _skgifProductRawTitle(product) {
  const titles = product.titles || {};
  return (titles.none || Object.values(titles)[0] || [])[0] || '';
}

// Data di pubblicazione come la dà l'API; undefined se manca.
function _skgifProductRawDate(product) {
  const manifestations = _skgifArray(product.manifestations);
  return manifestations.map(m => m?.dates?.publication?.[0]).find(Boolean);
}

// Nome della rivista del prodotto (corsivo, con link); "" se manca.
function _skgifProductSource(product) {
  const venue = _skgifProductVenue(product);
  return venue ? _skgifSourceHtml(venue.name, _skgifOmid(venue.local_identifier), []) : "";
}

// La rivista del prodotto, o undefined.
function _skgifProductVenue(product) {
  return _skgifArray(product.manifestations).map(m => m?.biblio?.in).find(v => v && v.name);
}

// HTML della rivista a partire dai suoi dati.
function _skgifSourceHtml(name, venueOmid, identifiers) {
  const venueTitle = `<i>${_skgifEscape(name)}</i>`;
  const titleHtml = venueOmid
    ? `<a href="browser.html?value=${venueOmid}" class="text-dark text-decoration-none">${venueTitle}</a>`
    : venueTitle;
  const venueIds = _skgifIdList(identifiers, undefined, false, true); // solo nelle schede (le card passano [])
  return venueIds ? `${titleHtml} (${venueIds})` : titleHtml;
}

// --- Card e liste comuni a più pagine ---

// Card di un'opera, per tutte le liste: badge anno/ruolo, Authors, Type, Source o Publisher, IDs, Go to (airy = più spazio).
function _skgifWorkCard(product, badgeOf = _raEditorBadge, airy = false) {
  const omid = _skgifOmid(product.local_identifier);
  if (!omid) return '';
  const year = String(_skgifProductRawDate(product) || '').slice(0, 4);
  const contributions = _skgifArray(product.contributions);
  const role = contributions.some(c => c && c.role === 'author' && c.by) ? 'author' : 'editor';
  const names = _skgifContributors(contributions, role).map(by => {
    const name = _skgifAgentName(by);
    const agentOmid = _skgifOmid(by.local_identifier);
    const html = agentOmid ? `<a href="${_skgifAgentUrl(agentOmid)}">${name}</a>` : name;
    return by.local_identifier === _raPersonOmid ? `<strong>${html}</strong>` : html; // la persona del profilo in grassetto
  });
  const namesHtml = names.length ? _skgifShortNames(names, contributions, role) : 'Unknown';
  const source = _skgifProductSource(product);
  const publisher = source ? '' : _skgifAgents(contributions, 'publisher');
  const type = _skgifArray(product.manifestations).map(m => m?.type?.labels?.en).find(Boolean) || '';
  const ids = _skgifIdList(product.identifiers, omid); // link come nella Overview (non più badge)
  const roleBadge = badgeOf(_raPersonRoles(product));

  return `
    <div class="col-12 mb-2">
      <div class="card shadow-sm ra-work${airy ? ' skgif-card-airy' : ''}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-1">
            <h5 class="ra-work-title"><a href="browser.html?value=${omid}">${_skgifEscape(_skgifProductTitle(product))}</a></h5>
            <div class="d-flex gap-1 flex-shrink-0">
              ${roleBadge ? `<span class="badge ra-role-badge">${roleBadge}</span>` : ''}
              ${year ? `<span class="badge ra-year-badge">${_skgifEscape(year)}</span>` : ''}
            </div>
          </div>
          <div class="ra-work-line"><span class="fw-bold">${role === 'author' || !names.length ? 'Authors' : 'Editors'}:</span> ${namesHtml}</div>
          ${type ? `<div class="ra-work-line"><span class="fw-bold">Type:</span> ${_skgifEscape(type)}</div>` : ''}
          ${source ? `<div class="ra-work-line"><span class="fw-bold">Source:</span> ${source}</div>` : ''}
          ${publisher ? `<div class="ra-work-line"><span class="fw-bold">Publisher:</span> ${publisher}</div>` : ''}
          ${ids ? `<div class="ra-work-line"><span class="fw-bold">IDs:</span> ${ids}</div>` : ''}
          <div class="d-flex justify-content-end gap-3 ra-work-links">
            <a href="browser.html?value=doc_ref/${omid}" class="btn btn-sm">Go to References</a>
            <a href="browser.html?value=doc_cit/${omid}" class="btn btn-sm">Go to Citations</a>
          </div>
        </div>
      </div>
    </div>`;
}

// Autori nelle card: i primi SKGIF_CARD_NAMES + "+N more" (la persona del profilo resta visibile).
const SKGIF_CARD_NAMES = 5;
function _skgifShortNames(names, contributions, role) {
  if (names.length <= SKGIF_CARD_NAMES + 1) return names.join(' • '); // non nasconde un solo nome
  const personAt = _skgifContributors(contributions, role).findIndex(by => by.local_identifier === _raPersonOmid);
  const short = names.slice(0, SKGIF_CARD_NAMES);
  if (personAt >= SKGIF_CARD_NAMES) short.push('…', names[personAt]);
  const hidden = names.length - SKGIF_CARD_NAMES - (personAt >= SKGIF_CARD_NAMES ? 1 : 0);
  return `<span class="skgif-names-short">${short.join(' • ')}</span>`
    + `<span class="skgif-names-full" hidden>${names.join(' • ')}</span> `
    + `<button type="button" class="skgif-more-names" data-more="+${hidden} more">+${hidden} more</button>`;
}

// "+N more" / "Show less": mostra o nasconde tutti gli autori della card.
document.addEventListener('click', e => {
  const btn = e.target.closest('.skgif-more-names');
  if (!btn) return;
  const line = btn.parentElement;
  const open = line.querySelector('.skgif-names-full').hidden;
  line.querySelector('.skgif-names-full').hidden = !open;
  line.querySelector('.skgif-names-short').hidden = open;
  btn.textContent = open ? 'Show less' : btn.dataset.more;
});

// Clic/Invio sui riquadri dei numeri: va alla lista (data-skgif-goto) o a un'altra pagina (data-skgif-href).
function _skgifGoToList(e) {
  const box = e.target.closest('[data-skgif-goto], [data-skgif-href]');
  if (!box || (e.type === 'keydown' && e.key !== 'Enter')) return;
  if (box.dataset.skgifHref) return void (location.href = box.dataset.skgifHref); // riquadro che apre un'altra pagina
  if (box.dataset.brGotoTab) document.querySelector(`[data-br-tab="${box.dataset.brGotoTab}"]`)?.click();
  document.getElementById(box.dataset.skgifGoto)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.addEventListener('click', _skgifGoToList);
document.addEventListener('keydown', _skgifGoToList);

// Le tre righe dell'intestazione come testo { title, line, meta }.
function _skgifHeaderText(product, omid) {
  const agents = role => _skgifContributors(product.contributions, role);
  const apaName = by => {
    if (!by.family_name) return (by.name || '').trim() || 'Unknown Name';
    const initials = String(by.given_name || '').split(/[\s-]+/).filter(Boolean).map(g => `${g[0]}.`).join(' ');
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

// HTML dell'intestazione dalle sue tre righe.
function _skgifHeaderHtml(title, lineText, meta) {
  const line = (cls, text) => text ? `<div class="${cls}" title="${_skgifEscape(text)}">${_skgifEscape(text)}</div>` : '';
  return line('skgif-head-title', title) + line('skgif-head-line', lineText) + line('skgif-head-meta', meta);
}

// Card dei risultati e delle pagine Go to: la card unica, versione ariosa, senza ruolo.
function _renderDocumentCard(product) {
  return _skgifWorkCard(product, () => '', true);
}

// Scarica tutte le opere e le mostra man mano; a lista completa attiva Sort by, filtri e grafico.
let _raPersonOmid = '';

// Ruoli della persona del profilo in un'opera.
function _raPersonRoles(product) {
  const contributions = _skgifArray(product.contributions);
  return new Set(contributions.filter(c => c && c.by && c.by.local_identifier === _raPersonOmid).map(c => c.role));
}
