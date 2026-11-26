// Citation record (citation_record, OCI = <citing>-<cited>): the two works, their counts and charts, Citation overlap.
// Parallel #api blocks: the two /products, References/Citations of each, shared references
// (cf.cited_by:a,cf.cited_by:b), co-citations (cf.cites:a,cf.cites:b).
// "Citations per year" charts from the OpenCitations Index API.

// Lucinda #preprocess: splits the OCI into { citing, cited }; {} if it is not valid.
function pre_skgif_oci(oci) {
  const parts = _skgifDecode(oci).trim().replace(/^oci:/i, '').match(/^(\d+)-(\d+)$/);
  return parts ? { citing: parts[1], cited: parts[2] } : {};
}

// Lucinda #postprocess of citing_meta/cited_meta: status (found/missing/failed), data and cited OMIDs of a work.
function post_skgif_ci_product(res, id) {
  const header = ['status', 'omid', 'title', 'agents_label', 'agents', 'date', 'ids', 'cites', 'venue', 'type'];
  const omid = `br/${id}`;
  const product = res.ok ? ((res.json?.['@graph'] || [])[0] || {}) : res.status === 404 ? {} : null;
  if (!product?.local_identifier) return [header, [product ? 'missing' : 'failed', omid, '', 'Authors', [], '', [], [], '', '']];
  const authors = _skgifRecordAgents(product, 'author');
  const editors = authors.length ? [] : _skgifRecordAgents(product, 'editor'); // editors instead of authors when there are no authors
  return [header, ['found', omid, _skgifProductTitle(product), editors.length ? 'Editors' : 'Authors',
    authors.length ? authors : editors,
    String(_skgifProductRawDate(product) || '').slice(0, 10),
    _skgifRecordIds(product),
    _skgifArray(product.related_products?.cites),
    _skgifRecordVenue(product),
    _skgifProductRawType(product)]];
}

// Record error: { text, type } (invalid OCI, missing work, citation not in the data), { unavailable } (failed call) or null.
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
  const hide = e.type === 'click' && e.target.closest('.ci-overlap-hide');
  if (hide) { // "Hide": the list closes where it is, the page does not scroll and the footer rises
    const box = document.querySelector('[data-ci-overlap].active');
    const hideTop = hide.getBoundingClientRect().top;
    const listTop = hide.closest('[id$="-pane"]').getBoundingClientRect().top;
    _skgifKeepScroll();
    _ciOverlapShow(null);
    // Hide stuck at the top of the screen while the list was scrolled (sticky bar): the boxes end where Hide was
    if (listTop < 0 && box) window.scrollTo({ top: Math.max(0, window.scrollY + box.getBoundingClientRect().bottom - hideTop), behavior: 'instant' });
    _skgifReleaseHeight();
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
      renderCard: _skgifProductCard
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
    const pane = document.getElementById(`ci-${b.dataset.ciOverlap}-pane`);
    if (on && pane) _ciPlacePane(pane, b);
    pane?.classList.toggle('d-none', !on);
  });
}
// Where the list opens: on phones (boxes one under the other) right under its box, on wider screens
// (boxes side by side) under the whole strip.
function _ciPlacePane(pane, box) {
  const anchor = _skgifIsPhone() ? box.closest('.row > *') : box.closest('.ci-overlap-strip');
  if (anchor && anchor.nextElementSibling !== pane) anchor.after(pane);
}
SKGIF_PHONE.addEventListener('change', () => {
  const box = document.querySelector('[data-ci-overlap].active');
  const pane = box && document.getElementById(`ci-${box.dataset.ciOverlap}-pane`);
  if (pane) _ciPlacePane(pane, box);
});
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
  // References/Citations -> matching tab of the research product record; Shared references/Co-citations -> list below.
  [['citing', citing], ['cited', cited]].forEach(([who, id]) => [['refs', 'references'], ['cits', 'citations']].forEach(([kind, tab]) =>
    _ciClickableCount(`${who}-${kind}`, box => { box.setAttribute('role', 'link'); box.dataset.skgifHref = `browser.html?value=br/${id}#${tab}`; })));
  [['ci-cited-by-both', 'shared'], ['ci-citing-both', 'cocit']].forEach(([numberId, kind]) =>
    _ciClickableCount(numberId, box => {
      box.setAttribute('role', 'button');
      box.setAttribute('aria-expanded', 'false');
      box.dataset.ciOverlap = kind;
      box.querySelector('.card-body p')?.insertAdjacentHTML('beforeend', ' <span class="ci-overlap-chevron" aria-hidden="true">&#9662;</span>'); // ▾ closed, ▴ open
    }));
  _ciOverlapIds = { citing, cited };
  _ciAlignTitles();
  _ciClampHeadTitles();
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

// Phones: each title of the header sentence ("<citing> (year) cites <cited> (year)") is cut to two lines with "…";
// the full title stays in the tooltip and in the card below.
function _ciClampHeadTitles() {
  const links = [...document.querySelectorAll('#ci-oci .skgif-ci-sentence > a')];
  links.forEach(link => { link.dataset.fullTitle = link.textContent; link.title = link.textContent; });
  const clamp = () => links.forEach(link => {
    link.textContent = link.dataset.fullTitle;
    if (!_skgifIsPhone()) return;
    const words = link.dataset.fullTitle.split(' ');
    while (words.length > 1 && link.getClientRects().length > 2) {
      words.pop();
      link.textContent = `${words.join(' ').replace(/[\s,.:;–-]+$/, '')}…`;
    }
  });
  clamp();
  SKGIF_PHONE.addEventListener('change', clamp);
  window.addEventListener('resize', clamp);
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
