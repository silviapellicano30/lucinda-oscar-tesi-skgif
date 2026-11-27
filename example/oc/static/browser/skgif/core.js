// SKG-IF API access: response cache, timeouts, retries of pages that do not arrive,
// "Loading" and "Service unavailable" messages, text utilities.

const SKGIF_DEFAULT_PAGE_SIZE = 10; // results per page (same as the API default)

// Maximum wait per request: when it expires, the results are requested again in smaller pages.
const SKGIF_PAGE_TIMEOUT = 35000;
const SKGIF_SMALL_PAGE_TIMEOUT = 15000;
const SKGIF_ITEM_TIMEOUT = 10000;
const _skgifTimeout = size => size === 1 ? SKGIF_ITEM_TIMEOUT : size <= SKGIF_DEFAULT_PAGE_SIZE ? SKGIF_SMALL_PAGE_TIMEOUT : SKGIF_PAGE_TIMEOUT;

// Phone layout (same breakpoint as the phone section of browser.css).
const SKGIF_PHONE = window.matchMedia('(max-width: 575.98px)');
const _skgifIsPhone = () => SKGIF_PHONE.matches;

// --- Messages ---

// Single message shown whenever the API does not answer (error, timeout, network).
const SKGIF_UNAVAILABLE_TEXT = "The OpenCitations API is temporarily unable to answer (maintenance or high load). Please try again later.";
const SKGIF_UNAVAILABLE_MESSAGE = `Service unavailable. ${SKGIF_UNAVAILABLE_TEXT}`; // plain text (Lucinda record pages)

// "Service unavailable" box with a "Try again" button; search = adds a hint about long queries.
function _skgifUnavailableHtml(search = false) {
  return `<div class="col-12"><div class="alert alert-danger mb-4 skgif-unavailable">`
    + `<strong>Service unavailable</strong><br>${SKGIF_UNAVAILABLE_TEXT}${search ? '<br>If the query is long, try a shorter one.' : ''}`
    + `<div class="mt-2"><button type="button" class="btn btn-sm skgif-search-reset skgif-retry">Try again</button></div></div></div>`;
}
document.addEventListener('click', e => {
  if (e.target.closest('.skgif-retry')) location.reload();
});

// Animated dots of the loading texts.
const SKGIF_LOADING_DOTS = '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';

// "Loading" text shown while a list is loading.
const SKGIF_LOADING_HTML = "<div class='col-12 skgif-page-loading'>Loading the results<br><span class='loading-dots'><span>.</span><span>.</span><span>.</span> </span></div>";

// Message shown instead of a list (e.g. no results): same look for every empty list.
function _skgifMessageHtml(text) {
  return `<div class="col-12"><p class="fst-italic text-muted">${text}</p></div>`;
}

// --- Requests ---

// Cache of the responses already received, so the same call is never made twice.
const _skgifResponseCache = {};
// Calls in progress: a request for the same URL waits for the one already sent.
const _skgifPendingRequests = {};

// Makes two URLs comparable.
function _skgifNormalizeUrl(url) {
  return _skgifDecode(String(url || "").replace(/\+/g, " ")).trim().toLowerCase();
}

// Fetches an SKG-IF URL (reusing Lucinda's responses); null on failure, {} on 404 (no results).
function skgifFetch(url, timeoutMs) {
  const fromLucinda = Lucinda.api_responses[url];
  if (fromLucinda) return fromLucinda.then(res => res.ok ? res.json : res.status === 404 ? {} : _skgifFetchUrl(url, timeoutMs));
  return _skgifFetchUrl(url, timeoutMs);
}

// GET of a URL with cache, shared pending requests and an optional timeout.
function _skgifFetchUrl(url, timeoutMs) {
  const key = _skgifNormalizeUrl(url);
  if (_skgifResponseCache[key]) return Promise.resolve(_skgifResponseCache[key]);
  if (_skgifPendingRequests[key]) return _skgifPendingRequests[key];
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  return _skgifPendingRequests[key] = fetch(url, controller ? { signal: controller.signal } : undefined)
    .then(r => r.ok ? r.json() : r.status === 404 ? {} : null) // 404 = no results
    .then(data => {
      if (data) _skgifResponseCache[key] = data;
      return data;
    })
    .catch(() => null)
    .finally(() => {
      clearTimeout(timer);
      delete _skgifPendingRequests[key];
    });
}

// Time (ms since epoch) until which skgifFetchPatient sends no call to a server ('index' or 'skgif') after a 429.
const _skgifPausedUntil = {};
// Number of 429 answers received by skgifFetchPatient from each server (read by _skgifAdaptivePool).
const _skgif429 = {};

// For long series of calls (e.g. one per publication): on 429 (too many requests) all the skgifFetchPatient calls
// to the same server stop for 2, 4, 6, 8, 10 s, then the call is retried (6 tries in all).
// Returns the JSON, {} on 404 (no results), null on failure. Does not use the skgifFetch cache.
function skgifFetchPatient(url, tries = 6, waitMs = 2000) {
  const server = url.startsWith(OC_INDEX_API) ? 'index' : 'skgif';
  const pause = (_skgifPausedUntil[server] || 0) - Date.now();
  const ready = pause > 0 ? new Promise(done => setTimeout(done, pause)) : Promise.resolve();
  return ready.then(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SKGIF_PAGE_TIMEOUT);
    return fetch(url, { signal: controller.signal })
      .then(r => {
        if (r.status === 429) _skgif429[server] = (_skgif429[server] || 0) + 1;
        if (r.status === 429 && tries > 1) {
          _skgifPausedUntil[server] = Math.max(_skgifPausedUntil[server] || 0, Date.now() + waitMs);
          return skgifFetchPatient(url, tries - 1, waitMs + 2000);
        }
        return r.ok ? r.json() : r.status === 404 ? {} : null;
      })
      .catch(() => null)
      .finally(() => clearTimeout(timer));
  });
}

// Total number of results of a response (0 if missing).
function skgifTotal(response) {
  return response?.meta?.part_of?.total_items || 0;
}

// --- Pages of results ---

// First page of a list: { total, items }; null if not even the total can be read.
function skgifFirstPage(source, size) {
  return _skgifFirstPageItems(source, size).then(_skgifWithFirstCounts); // the first cards already include their citation count
}
// First page; if it fails, a page of 1 still gives the total (items are then loaded in smaller pages).
function _skgifFirstPageItems(source, size) {
  return skgifFetch(`${source}&page=1&page_size=${size}`, _skgifTimeout(size)).then(data => {
    if (data) return { total: skgifTotal(data), items: data['@graph'] || [] };
    return skgifFetch(`${source}&page=1&page_size=1`, SKGIF_ITEM_TIMEOUT).then(one => {
      if (!one) return null;
      const total = skgifTotal(one);
      return skgifSplitRange(source, 0, Math.min(size, total), size).then(items => ({ total, items }));
    });
  });
}

// Requests `count` results from `start`; if they do not arrive, retries with pages of 10 and then of 1 (missing = { _skgifMissing }).
function skgifFetchRange(source, start, count, size, timeoutMs = _skgifTimeout(size)) {
  return skgifFetch(`${source}&page=${start / size + 1}&page_size=${size}`, timeoutMs)
    .then(data => data ? (data['@graph'] || []) : skgifSplitRange(source, start, count, size));
}

// A page of `size` that did not arrive: requests its results again in smaller pages (10, then 1).
function skgifSplitRange(source, start, count, size, retried = false) {
  if (size === 1) { // a single result: retried once, then marked as missing
    if (retried) return Promise.resolve([{ _skgifMissing: true }]);
    return skgifFetch(`${source}&page=${start + 1}&page_size=1`, SKGIF_ITEM_TIMEOUT)
      .then(data => data ? (data['@graph'] || []) : skgifSplitRange(source, start, count, size, true));
  }
  const smaller = size > SKGIF_DEFAULT_PAGE_SIZE ? SKGIF_DEFAULT_PAGE_SIZE : 1;
  const parts = [];
  for (let from = 0; from < count; from += smaller) {
    parts.push(skgifFetchRange(source, start + from, Math.min(smaller, count - from), smaller));
  }
  return Promise.all(parts).then(lists => lists.flat());
}

// Downloads all pages of a search; calls onPage(n, items) for each page, skips the pages in `have`.
function skgifFetchAllPages(source, total, pageSize, parallel, onPage, have = {}) {
  const pageCount = Math.ceil(total / pageSize);
  const todo = [];
  for (let n = 1; n <= pageCount; n++) if (!have[n]) todo.push(n);
  return _skgifPool(todo, parallel, n => {
    const start = (n - 1) * pageSize;
    return skgifFetchRange(source, start, Math.min(pageSize, total - start), pageSize).then(items => onPage(n, items));
  });
}

// Runs task(n) for each n in `todo`, at most `parallel` at a time.
function _skgifPool(todo, parallel, task) {
  const queue = [...todo];
  const worker = () => {
    const n = queue.shift();
    return n === undefined ? Promise.resolve() : task(n).then(worker);
  };
  return Promise.all(Array.from({ length: Math.min(parallel, queue.length) }, () => worker()));
}

// Like _skgifPool, but the number of tasks at a time follows the server ('index' or 'skgif'): it starts at `max`,
// goes down by one (to 1) when skgifFetchPatient receives a 429 from that server, and up by one (to `max`)
// after SKGIF_ADAPTIVE_RAISE_AFTER tasks in a row finished without a 429.
const SKGIF_ADAPTIVE_RAISE_AFTER = 10;
function _skgifAdaptivePool(todo, max, server, task) {
  const queue = [...todo];
  let limit = max, running = 0, streak = 0, seen = _skgif429[server] || 0;
  return new Promise(resolve => {
    const next = () => {
      const now = _skgif429[server] || 0;
      if (now > seen) { limit = Math.max(1, limit - 1); streak = 0; seen = now; }
      if (!queue.length && !running) return resolve();
      while (running < limit && queue.length) {
        running++;
        task(queue.shift()).catch(() => null).then(() => { // a failed task does not block the others
          running--;
          if ((_skgif429[server] || 0) === seen && ++streak >= SKGIF_ADAPTIVE_RAISE_AFTER && limit < max) { limit++; streak = 0; }
          next();
        });
      }
    };
    next();
  });
}

// --- "Loading the resource" banner ---

// Keeps the banner until the first results are ready.
let _skgifHeldPage = null;

// Hides the template and shows the banner.
function skgifHoldPage() {
  const root = document.getElementById('__lucinda__');
  if (!root || _skgifHeldPage) return;
  const children = Array.from(root.children).map(el => ({ el, display: el.style.display }));
  children.forEach(({ el }) => { el.style.display = 'none'; });
  const banner = document.createElement('div');
  banner.id = 'lucinda_pendinghtml_main_loading';
  banner.innerHTML = "Loading the resource<br><span class='loading-dots'><span>.</span><span>.</span><span>.</span> </span>";
  root.appendChild(banner);
  _skgifHeldPage = { banner, children };
}

// Removes the banner and shows the template again.
function skgifReleasePage() {
  if (!_skgifHeldPage) return;
  _skgifHeldPage.banner.remove();
  _skgifHeldPage.children.forEach(({ el, display }) => { el.style.display = display; });
  _skgifHeldPage = null;
}

// --- Lucinda data ---

// Reads a value from the table Lucinda stored for a block.
function _lucindaValue(blockId, column) {
  return Lucinda_util.getCol(Lucinda.data[blockId], column)[1];
}

// Value of a parameter of the page URL (search_query, id...), decoded.
function _skgifUrlParam(lucinda_main_data, key) {
  const value = (lucinda_main_data || {})[key] || "";
  return _skgifDecode(Array.isArray(value) ? value[0] : value);
}

// Writes a count only if Lucinda's own count failed ("–").
function _skgifFallbackCount(elId, n) {
  const el = document.getElementById(elId);
  if (el && !/\d/.test(el.textContent)) el.textContent = _skgifNum(n);
}

// --- Text utilities ---

// URL-decoded text; kept as it is when it is not valid URL encoding.
function _skgifDecode(value) {
  const text = String(value ?? '');
  try { return decodeURIComponent(text); } catch (e) { return text; }
}

// Alphabetical comparison ignoring case and accents (titles, venue names). Created once: String.localeCompare with
// options builds a new collator at every call, which makes sorting long lists slow.
const _skgifCompareText = new Intl.Collator(undefined, { sensitivity: 'base' }).compare;

// An API field that should be a list: [] if missing.
function _skgifArray(value) {
  return Array.isArray(value) ? value : [];
}

// Number with thousands separators ("125,848"); anything that is not a number is returned as it is.
function _skgifNum(n) {
  return n === null || n === undefined || n === '' || isNaN(n) ? n : Number(n).toLocaleString('en-US');
}

// A number, or "–" if the call failed (null).
function _skgifCount(n) {
  return n === null ? '–' : String(n);
}

// "1 publication", "2 publications".
function _skgifPlural(n, noun) {
  return `${_skgifNum(n)} ${noun}${n === 1 ? '' : 's'}`;
}

// Characters that break the search filters (cf.search.*) become spaces.
function _skgifSafeTerm(s) {
  return String(s || "").normalize('NFC')
    .replace(/[,"'\\*&#%]/g, ' ')
    .split(/\s+/).filter(Boolean).join(' ');
}

// Escapes API text before putting it into the HTML.
function _skgifEscape(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Sets the HTML of an element, if it exists.
function _skgifSetField(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
