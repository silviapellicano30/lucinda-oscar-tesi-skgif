// Citation record (new_ci_browser, OCI = <citing>-<cited>): the two works, their counts and charts, Citation overlap.
// Parallel #api blocks: the two /products, References/Citations of each, shared references
// (cf.cited_by:a,cf.cited_by:b), co-citations (cf.cites:a,cf.cites:b).
// "Citations per year" charts from the OpenCitations Index API.

// Lucinda #preprocess: splits the OCI into { citing, cited }; {} if it is not valid.
function pre_skgif_oci(oci) {
  let value = String(oci || '');
  try { value = decodeURIComponent(value); } catch (e) { /* keep as is */ }
  const parts = value.trim().replace(/^oci:/i, '').match(/^(\d+)-(\d+)$/);
  return parts ? { citing: parts[1], cited: parts[2] } : {};
}

// Lucinda #postprocess for the two documents: status (found/missing/failed), data and cited OMIDs.
function post_skgif_ci_doc(res, id) {
  const header = ['status', 'omid', 'title', 'agents_label', 'agents', 'date', 'ids', 'cites', 'source', 'type'];
  const omid = `br/${id}`;
  const doc = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null;
  if (!doc?.local_identifier) return [header, [doc ? 'missing' : 'failed', omid, '', 'Authors', [], '', [], [], '', '']];
  const venue = _skgifProductVenue(doc); // source with its IDs (as in the document page)
  const agents = role => _skgifContributors(doc.contributions, role).map(by => ({
    name: _skgifAgentPlainName(by),
    omid: _skgifOmid(by.local_identifier),
    orcid: _skgifArray(by.identifiers).find(i => i.scheme === 'orcid')?.value || ''
  }));
  const authors = agents('author');
  const editors = authors.length ? [] : agents('editor'); // editors instead of authors when there are no authors
  return [header, ['found', omid, _skgifProductTitle(doc), editors.length ? 'Editors' : 'Authors',
    authors.length ? authors : editors,
    String(_skgifProductRawDate(doc) || '').slice(0, 10),
    _skgifArray(doc.identifiers).map(i => ({ scheme: i.scheme, value: i.value })),
    _skgifArray(doc.related_products?.cites),
    venue ? { name: venue.name, omid: _skgifOmid(venue.local_identifier), identifiers: _skgifArray(venue.identifiers) } : '',
    _skgifArray(doc.manifestations).map(m => m?.type?.labels?.en).find(Boolean) || '']];
}

// Record error (invalid OCI, missing document, non-existent citation): { text, type } or null.
function _skgifCiProblem(oci, citingStatus, citedStatus, cites) {
  const ids = pre_skgif_oci(oci);
  if (!ids.citing) return { text: 'This is not a valid OCI.', type: 'danger' };
  if (citingStatus === 'failed' || citedStatus === 'failed') return { unavailable: true };
  const missing = [[citingStatus, ids.citing], [citedStatus, ids.cited]].filter(([status]) => status !== 'found').map(([, id]) => `br/${id}`);
  if (missing.length) return { text: `No record with OMID ${missing.join(' or ')} was found.`, type: 'danger' };
  if (!_skgifArray(cites).includes(skgifFullId(`br/${ids.cited}`))) return { text: 'This citation is not available.', type: 'warning' };
  return null;
}

// View function: the message above the record ("" if none).
Lucinda_view.prototype.skgif_ci_message = function (...args) {
  const problem = _skgifCiProblem(...args.map(_lvCell));
  if (problem?.unavailable) return _skgifUnavailableHtml();
  return problem ? `<div class="alert alert-${problem.type} mb-4">${_skgifEscape(problem.text)}</div>` : '';
};

// "Citation overlap" lists (shared references, co-citations), built at the first click.
let _ciOverlapIds = null;
const _ciOverlapLists = {};
const CI_OVERLAP = {
  shared: { filter: SKGIF_FILTER.citedBy, noun: 'shared reference' },
  cocit: { filter: SKGIF_FILTER.cites, noun: 'co-citation' }
};
// Click/Enter on a "Citation overlap" box: opens or closes its list.
function _ciOverlapToggle(e) {
  if (e.type === 'click' && e.target.closest('.ci-overlap-hide')) { // "Hide": closes the list and goes back to the boxes
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
// Opens the list of box `box` (null = all closed) and turns the triangles.
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

// Makes the box of `numberId` clickable when the number is > 0 (even if it arrives later).
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

// #callfun: shows the record and draws the two charts.
function api_citation_record_skgif(...args) {
  const oci = _skgifUrlParam(args[1], 'oci');
  if (_skgifCiProblem(oci, _lucindaValue('citing_meta', 'status'), _lucindaValue('cited_meta', 'status'), _lucindaValue('citing_meta', 'cites'))) return;
  const { citing, cited } = pre_skgif_oci(oci);
  document.getElementById('ci-record')?.classList.remove('d-none');
  // References/Citations -> Go to pages; Shared references/Co-citations -> list below.
  [['citing', citing], ['cited', cited]].forEach(([who, id]) => [['refs', 'doc_ref'], ['cits', 'doc_cit']].forEach(([kind, page]) =>
    _ciClickableCount(`${who}-${kind}`, box => { box.setAttribute('role', 'link'); box.dataset.skgifHref = `browser.html?value=${page}/br/${id}`; })));
  [['ci-cited-by-both', 'shared'], ['ci-citing-both', 'cocit']].forEach(([numberId, kind]) =>
    _ciClickableCount(numberId, box => {
      box.setAttribute('role', 'button');
      box.setAttribute('aria-expanded', 'false');
      box.dataset.ciOverlap = kind;
      box.querySelector('.card-body p')?.insertAdjacentHTML('beforeend', ' <span class="ci-overlap-chevron" aria-hidden="true">&#9662;</span>'); // ▾ closed, ▴ open
    }));
  _ciOverlapIds = { citing, cited };
  _ciAlignTitles();
  _skgifCitationsPerYearChart('ci-citing-chart', citing); // per-year charts from the Index
  _skgifCitationsPerYearChart('ci-cited-chart', cited);
}

// Gives the two titles the same height when the cards are side by side.
function _ciAlignTitles() {
  const titles = ['citing-title', 'cited-title'].map(id => document.getElementById(id)).filter(Boolean);
  const align = () => {
    titles.forEach(t => { t.style.minHeight = ''; });
    if (window.innerWidth < 768) return; // cards stacked one under the other
    const height = Math.max(...titles.map(t => t.offsetHeight));
    titles.forEach(t => { t.style.minHeight = `${height}px`; });
  };
  align();
  window.addEventListener('resize', align);
}

// "Citations per year" chart from the Index API (one call; citations without a date are skipped).
function _skgifCitationsPerYearChart(boxId, id) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.innerHTML = '<em>Loading…</em>';
  skgifFetch(`${OC_INDEX_API}/citations/omid:br/${id}`).then(data => {
    if (!Array.isArray(data)) {
      box.innerHTML = '<em>Chart not available: the citation data of this work is too large to be retrieved.</em>'; // the Index cuts huge responses (e.g. br/0630685531)
      return;
    }
    _skgifYearChart(box, data.map(c => c.creation), '# Citations', 'No citations found.', 200);
  });
}
