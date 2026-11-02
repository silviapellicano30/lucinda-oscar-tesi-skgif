// SILVIA - MIGRAZIONE SKG-IF
// Chiamate all'API SKG-IF (cache, tempi massimi, pagine che non arrivano), "Loading", "Service unavailable", utilità di testo.

const SKGIF_DEFAULT_PAGE_SIZE = 10; // risultati per pagina (come il default dell'API)

// Messaggio unico quando l'API non risponde (errore, timeout, rete).
const SKGIF_UNAVAILABLE_TEXT = "The OpenCitations API is temporarily unable to answer (maintenance or high load). Please try again later.";
const SKGIF_UNAVAILABLE_MESSAGE = `Service unavailable. ${SKGIF_UNAVAILABLE_TEXT}`; // solo testo (schede di Lucinda)

// Riquadro "Service unavailable" con il bottone "Try again"; search = consiglio sulle query lunghe.
function _skgifUnavailableHtml(search = false) {
  return `<div class="col-12"><div class="alert alert-danger mb-4 skgif-unavailable">`
    + `<strong>Service unavailable</strong><br>${SKGIF_UNAVAILABLE_TEXT}${search ? '<br>If the query is long, try a shorter one.' : ''}`
    + `<div class="mt-2"><button type="button" class="btn btn-sm skgif-search-reset skgif-retry">Try again</button></div></div></div>`;
}

document.addEventListener('click', e => {
  if (e.target.closest('.skgif-retry')) location.reload();
});

// Testo "Loading" mostrato mentre una lista carica.
const SKGIF_LOADING_HTML = "<div class='col-12 skgif-page-loading'>Loading the results<br><span class='loading-dots'><span>.</span><span>.</span><span>.</span> </span></div>";

// Numero totale di risultati di una risposta (0 se manca).
function skgifTotal(response) {
  return response?.meta?.part_of?.total_items || 0;
}

// Scrive un conteggio solo se quello di Lucinda è fallito ("–").
function _skgifFallbackCount(elId, n) {
  const el = document.getElementById(elId);
  if (el && !/\d/.test(el.textContent)) el.textContent = String(n);
}

// Legge un valore dalla tabella che Lucinda ha salvato per un blocco.
function _lucindaValue(blockId, column) {
  return Lucinda_util.getCol(Lucinda.data[blockId], column)[1];
}

/*
Cache delle risposte già ricevute, per non rifare la stessa chiamata.
*/
const _skgifResponseCache = {};

function _skgifNormalizeUrl(url) { // rende confrontabili due URL
  let u = String(url || "").replace(/\+/g, " ");
  try { u = decodeURIComponent(u); } catch (e) { /* keep as is */ }
  return u.trim().toLowerCase();
}

// Chiamate in corso: chi chiede lo stesso URL aspetta quella già partita.
const _skgifPendingRequests = {};

// Scarica un URL SKG-IF (riusa le risposte di Lucinda); null se fallisce, 404 = nessun risultato.
function skgifFetch(url, timeoutMs) {
  const fromLucinda = Lucinda.api_responses[url];
  if (fromLucinda) return fromLucinda.then(res => res.ok ? res.json : res.status === 404 ? {} : _skgifFetchUrl(url, timeoutMs));
  return _skgifFetchUrl(url, timeoutMs);
}

function _skgifFetchUrl(url, timeoutMs) {
  const key = _skgifNormalizeUrl(url);
  if (_skgifResponseCache[key]) return Promise.resolve(_skgifResponseCache[key]);
  if (_skgifPendingRequests[key]) return _skgifPendingRequests[key];
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  return _skgifPendingRequests[key] = fetch(url, controller ? { signal: controller.signal } : undefined)
    .then(r => r.ok ? r.json() : r.status === 404 ? {} : null) // 404 = 0 risultati
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

// Tiene il banner "Loading" finché i primi risultati non sono pronti.
let _skgifHeldPage = null;

function holdSkgifPage() { // nasconde il template e mostra il banner
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

function releaseSkgifPage() { // toglie il banner e rimostra il template
  if (!_skgifHeldPage) return;
  _skgifHeldPage.banner.remove();
  _skgifHeldPage.children.forEach(({ el, display }) => { el.style.display = display; });
  _skgifHeldPage = null;
}

// Scarica tutte le pagine di una ricerca; onPage(n, items) a ogni pagina, salta quelle in `have`.
function skgifFetchAllPages(source, total, pageSize, parallel, onPage, have = {}) {
  const pageCount = Math.ceil(total / pageSize);
  const todo = [];
  for (let n = 1; n <= pageCount; n++) if (!have[n]) todo.push(n);
  return _skgifPool(todo, parallel, n => {
    const start = (n - 1) * pageSize;
    return skgifFetchRange(source, start, Math.min(pageSize, total - start), pageSize).then(items => onPage(n, items));
  });
}

// Esegue task(n) per ogni n di `todo`, al massimo `parallel` alla volta.
function _skgifPool(todo, parallel, task) {
  const queue = [...todo];
  const worker = () => {
    const n = queue.shift();
    return n === undefined ? Promise.resolve() : task(n).then(worker);
  };
  return Promise.all(Array.from({ length: Math.min(parallel, queue.length) }, () => worker()));
}

// Tempo massimo di attesa per pagina: se scade, i risultati vengono richiesti in pagine più piccole.
const SKGIF_PAGE_TIMEOUT = 35000;
const SKGIF_SMALL_PAGE_TIMEOUT = 15000;
const SKGIF_ITEM_TIMEOUT = 10000;
const _skgifTimeout = size => size === 1 ? SKGIF_ITEM_TIMEOUT : size <= SKGIF_DEFAULT_PAGE_SIZE ? SKGIF_SMALL_PAGE_TIMEOUT : SKGIF_PAGE_TIMEOUT;

// Chiede `count` risultati da `start`; se non arrivano riprova a pagine da 10 e da 1 (mancante = { _skgifMissing }).
function skgifFetchRange(source, start, count, size, timeoutMs = _skgifTimeout(size)) {
  return skgifFetch(`${source}&page=${start / size + 1}&page_size=${size}`, timeoutMs)
    .then(data => data ? (data['@graph'] || []) : skgifSplitRange(source, start, count, size));
}

function skgifSplitRange(source, start, count, size, retried = false) {
  if (size === 1) { // un solo risultato: riprovato una volta, poi segnato come mancante
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

// Prima pagina di una lista: { total, items }; null se non si legge neanche il totale.
function skgifFirstPage(source, size) {
  return skgifFetch(`${source}&page=1&page_size=${size}`, _skgifTimeout(size)).then(data => {
    if (data) return { total: skgifTotal(data), items: data['@graph'] || [] };
    return skgifFetch(`${source}&page=1&page_size=1`, SKGIF_ITEM_TIMEOUT).then(one => {
      if (!one) return null;
      const total = skgifTotal(one);
      return skgifSplitRange(source, 0, Math.min(size, total), size).then(items => ({ total, items }));
    });
  });
}

// Valore di un parametro dell'URL della pagina (search_query, id...), decodificato.
function _skgifUrlParam(lucinda_main_data, key) {
  let value = (lucinda_main_data || {})[key] || "";
  value = String(Array.isArray(value) ? value[0] : value);
  try { return decodeURIComponent(value); } catch (e) { return value; }
}

// Messaggio al posto dei risultati (es. ricerca vuota).
function _skgifShowMessage(text, containerId = 'search-results-container') {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = `<div class="col-12"><p>${text}</p></div>`;
}

// Un campo dell'API che dovrebbe essere una lista: [] se manca.
function _skgifArray(value) {
  return Array.isArray(value) ? value : [];
}

// "1 publication", "2 publications".
function _skgifPlural(n, noun) {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

// I caratteri che rompono i filtri di ricerca (cf.search.*) diventano spazi.
function _skgifSafeTerm(s) {
  return String(s || "").normalize('NFC')
    .replace(/[,"'\\*&#%]/g, ' ') //caratteri che rompono la richiesta
    .split(/\s+/).filter(Boolean).join(' ');
}

// Protegge il testo dell'API prima di metterlo nell'HTML.
function _skgifEscape(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function _skgifSetField(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// Un numero, o "–" se la chiamata è fallita (null).
function _ciCount(n) {
  return n === null ? '–' : String(n);
}
