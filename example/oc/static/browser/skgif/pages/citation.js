// SILVIA - MIGRAZIONE SKG-IF
// Record di citazione (new_ci_browser): i due lavori, i loro numeri e grafici, Citation overlap.

// Record di citazione (OCI = <citante>-<citato>), blocchi #api in parallelo: i due /products, References/Citations
// di ognuno, riferimenti in comune (cf.cited_by:a,cf.cited_by:b), co-citazioni (cf.cites:a,cf.cites:b).
// Grafici "Citations per year" dall'Index API.

// #preprocess di Lucinda: divide l'OCI in { citing, cited }; {} se non è valido.
function pre_skgif_oci(oci) {
  let value = String(oci || '');
  try { value = decodeURIComponent(value); } catch (e) { /* keep as is */ }
  const parts = value.trim().replace(/^oci:/i, '').match(/^(\d+)-(\d+)$/);
  return parts ? { citing: parts[1], cited: parts[2] } : {};
}

// #postprocess di Lucinda per i due documenti: stato (found/missing/failed), dati e OMID citati.
function post_skgif_ci_doc(res, id) {
  const header = ['status', 'omid', 'title', 'agents_label', 'agents', 'date', 'ids', 'cites', 'source', 'type'];
  const omid = `br/${id}`;
  const doc = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null;
  if (!doc?.local_identifier) return [header, [doc ? 'missing' : 'failed', omid, '', 'Authors', [], '', [], [], '', '']];
  const venue = _skgifProductVenue(doc); // rivista con i suoi ID (come nella scheda documento)
  const agents = role => _skgifContributors(doc.contributions, role).map(by => ({
    name: _skgifAgentPlainName(by),
    omid: _skgifOmid(by.local_identifier),
    orcid: _skgifArray(by.identifiers).find(i => i.scheme === 'orcid')?.value || ''
  }));
  const authors = agents('author');
  const editors = authors.length ? [] : agents('editor'); // editor al posto degli autori se mancano
  return [header, ['found', omid, _skgifProductTitle(doc), editors.length ? 'Editors' : 'Authors',
    authors.length ? authors : editors,
    String(_skgifProductRawDate(doc) || '').slice(0, 10),
    _skgifArray(doc.identifiers).map(i => ({ scheme: i.scheme, value: i.value })),
    _skgifArray(doc.related_products?.cites),
    venue ? { name: venue.name, omid: _skgifOmid(venue.local_identifier), identifiers: _skgifArray(venue.identifiers) } : '',
    _skgifArray(doc.manifestations).map(m => m?.type?.labels?.en).find(Boolean) || '']];
}

// Errore del record (OCI non valido, documento mancante, citazione inesistente): { text, type } o null.
function _skgifCiProblem(oci, citingStatus, citedStatus, cites) {
  const ids = pre_skgif_oci(oci);
  if (!ids.citing) return { text: 'This is not a valid OCI.', type: 'danger' };
  if (citingStatus === 'failed' || citedStatus === 'failed') return { unavailable: true };
  const missing = [[citingStatus, ids.citing], [citedStatus, ids.cited]].filter(([status]) => status !== 'found').map(([, id]) => `br/${id}`);
  if (missing.length) return { text: `No document with OMID ${missing.join(' or ')} available.`, type: 'danger' };
  if (!_skgifArray(cites).includes(skgifFullId(`br/${ids.cited}`))) return { text: 'This citation is not available.', type: 'warning' };
  return null;
}

// View function: il messaggio sopra il record ("" se non c'è).
Lucinda_view.prototype.skgif_ci_message = function (...args) {
  const problem = _skgifCiProblem(...args.map(_lvCell));
  if (problem?.unavailable) return _skgifUnavailableHtml();
  return problem ? `<div class="alert alert-${problem.type} mb-4">${_skgifEscape(problem.text)}</div>` : '';
};

// Liste di "Citation overlap" (riferimenti in comune, co-citazioni), create al primo clic.
let _ciOverlapIds = null;
const _ciOverlapLists = {};
const CI_OVERLAP = {
  shared: { filter: SKGIF_FILTER.citedBy, noun: 'shared reference' },
  cocit: { filter: SKGIF_FILTER.cites, noun: 'co-citation' }
};
function _ciOverlapToggle(e) {
  if (e.type === 'click' && e.target.closest('.ci-overlap-hide')) { // "Hide": chiude la lista e torna ai riquadri
    _ciOverlapShow(null);
    document.getElementById('ci-overlap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const box = e.target.closest('[data-ci-overlap]');
  if (!box || !_ciOverlapIds || (e.type === 'keydown' && e.key !== 'Enter')) return;
  const kind = box.dataset.ciOverlap;
  const open = document.getElementById(`ci-${kind}-pane`).classList.contains('d-none');
  _skgifKeepScroll();
  _ciOverlapShow(open ? box : null);
  if (!open || _ciOverlapLists[kind]) return;
  const { filter, noun } = CI_OVERLAP[kind];
  const omid = id => encodeURIComponent(skgifFullId(`br/${id}`));
  const source = `${SKGIF_API}/products?filter=${filter}:${omid(_ciOverlapIds.citing)},${filter}:${omid(_ciOverlapIds.cited)}`;
  const prefix = `ci-${kind}`;
  _skgifSetField(`${prefix}-list`, SKGIF_LOADING_HTML);
  _ciOverlapLists[kind] = skgifFirstPage(source, SKGIF_LIST_PAGE_SIZE).then(first => {
    const list = _skgifPagedList({
      prefix, source, first, noun, showTotal: false,
      emptyMessage: `No ${noun}s found.`,
      statusText: n => _skgifPlural(n, noun),
      scrollId: 'ci-overlap',
      renderCard: _skgifWorkCard
    });
    _skgifInitPerPage(prefix, list);
    return list;
  });
}
// Apre la lista del riquadro `box` (null = tutte chiuse) e gira i triangolini.
function _ciOverlapShow(box) {
  document.querySelectorAll('[data-ci-overlap]').forEach(b => {
    const on = b === box;
    b.classList.toggle('active', on);
    b.setAttribute('aria-expanded', String(on));
    const chevron = b.querySelector('.ci-overlap-chevron');
    if (chevron) chevron.innerHTML = on ? '&#9652;' : '&#9662;';
    document.getElementById(`ci-${b.dataset.ciOverlap}-pane`)?.classList.toggle('d-none', !on);
  });
}
document.addEventListener('click', _ciOverlapToggle);
document.addEventListener('keydown', _ciOverlapToggle);

// Rende cliccabile il riquadro di `numberId` quando il numero è > 0 (anche se arriva dopo).
function _ciClickableCount(numberId, setup) {
  const number = document.getElementById(numberId);
  const box = number?.closest('.card');
  if (!box) return;
  const update = () => {
    if (box.classList.contains('skgif-count-link') || !Number(number.textContent.replace(/\D/g, ''))) return;
    box.classList.add('skgif-count-link');
    box.tabIndex = 0;
    setup(box);
  };
  update();
  new MutationObserver(update).observe(number, { childList: true, subtree: true, characterData: true });
}

// #callfun: mostra il record e disegna i due grafici.
function api_citation_record_skgif(...args) {
  const oci = _skgifUrlParam(args[1], 'oci');
  if (_skgifCiProblem(oci, _lucindaValue('citing_meta', 'status'), _lucindaValue('cited_meta', 'status'), _lucindaValue('citing_meta', 'cites'))) return;
  const { citing, cited } = pre_skgif_oci(oci);
  document.getElementById('ci-record')?.classList.remove('d-none');
  // References/Citations -> pagine Go to; Shared references/Co-citations -> lista sotto.
  [['citing', citing], ['cited', cited]].forEach(([who, id]) => [['refs', 'doc_ref'], ['cits', 'doc_cit']].forEach(([kind, page]) =>
    _ciClickableCount(`${who}-${kind}`, box => { box.setAttribute('role', 'link'); box.dataset.skgifHref = `browser.html?value=${page}/br/${id}`; })));
  [['ci-cited-by-both', 'shared'], ['ci-citing-both', 'cocit']].forEach(([numberId, kind]) =>
    _ciClickableCount(numberId, box => {
      box.setAttribute('role', 'button');
      box.setAttribute('aria-expanded', 'false');
      box.dataset.ciOverlap = kind;
      box.querySelector('.card-body p')?.insertAdjacentHTML('beforeend', ' <span class="ci-overlap-chevron" aria-hidden="true">&#9662;</span>'); // ▾ chiusa, ▴ aperta
    }));
  _ciOverlapIds = { citing, cited };
  _ciAlignTitles();
  _skgifCitationsPerYearChart('ci-citing-chart', citing); // grafici per anno dall'Index
  _skgifCitationsPerYearChart('ci-cited-chart', cited);
}

// Rende alti uguali i due titoli quando le schede sono affiancate.
function _ciAlignTitles() {
  const titles = ['citing-title', 'cited-title'].map(id => document.getElementById(id)).filter(Boolean);
  const align = () => {
    titles.forEach(t => { t.style.minHeight = ''; });
    if (window.innerWidth < 768) return; // schede una sotto l'altra
    const height = Math.max(...titles.map(t => t.offsetHeight));
    titles.forEach(t => { t.style.minHeight = `${height}px`; });
  };
  align();
  window.addEventListener('resize', align);
}

// Grafico "Citations per year" dall'Index API (una chiamata; citazioni senza data saltate).
function _skgifCitationsPerYearChart(boxId, id) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.innerHTML = '<em>Loading...</em>';
  skgifFetch(`${OC_INDEX_API}/citations/omid:br/${id}`).then(data => {
    if (!Array.isArray(data)) {
      box.innerHTML = '<em>Chart not available: the citation data of this work is too large to be retrieved.</em>'; // l'Index taglia le risposte enormi (es. br/0630685531)
      return;
    }
    _skgifYearChart(box, data.map(c => c.creation), '# Citations', 'No citations found.', 200);
  });
}
