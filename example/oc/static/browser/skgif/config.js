// SILVIA - MIGRAZIONE SKG-IF
// Tutto ciò che dipende dall'endpoint SKG-IF (indirizzi, forma degli identificativi, nomi dei filtri).
// Per un altro endpoint SKG-IF si cambia questo file; i .hf usano gli stessi valori tramite i segnaposto qui sotto.

const SKGIF_API = "https://api.opencitations.net/skg-if/v1"; // URL base di tutte le chiamate SKG-IF

// Inizio degli identificativi locali (local_identifier); in browser.html?value= si usa solo il resto (br/..., ra/...).
const SKGIF_ID_BASE = "https://w3id.org/oc/meta/";

// Filtri dell'endpoint (cf.* = filtri propri di OpenCitations, non dello standard).
const SKGIF_FILTER = {
  cites: 'cf.cites',                           // prodotti che citano un OMID (= citazioni)
  citedBy: 'cf.cited_by',                      // prodotti citati da un OMID (= riferimenti)
  title: 'cf.search.title',
  name: 'cf.search.name',
  givenName: 'cf.search.given_name',
  familyName: 'cf.search.family_name',
  contributor: 'contributions.by.local_identifier' // prodotti di una persona/organizzazione (tutti i ruoli)
};

// Solo OpenCitations, fuori da SKG-IF: grafici del record di citazione e URI delle citazioni.
const OC_INDEX_API = "https://api.opencitations.net/index/v2";
const OC_CI_BASE = "https://w3id.org/oc/index/ci/";

// Identificativo completo da quello breve ("br/0612..." -> "https://w3id.org/oc/meta/br/0612...").
function skgifFullId(shortId) {
  return SKGIF_ID_BASE + shortId;
}

// Il contrario: "br/0612..." da un local_identifier ("" se non è un identificativo di questo endpoint).
function _skgifOmid(localId) {
  const value = String(localId || "");
  return value.startsWith(SKGIF_ID_BASE) ? value.slice(SKGIF_ID_BASE.length) : "";
}

// URL di una lista filtrata per un identificativo ("cf.cites", "br/0612..." -> /products?filter=cf.cites:<OMID codificato>).
function skgifFilterUrl(entity, filter, shortId) {
  return `${SKGIF_API}/${entity}?filter=${filter}:${encodeURIComponent(skgifFullId(shortId))}`;
}

// Segnaposto degli URL #api nei .hf: [[skgif_api]], [[id_base]] e [[id_base_enc]] (codificato, dentro ?filter=).
Lucinda.init({
  api_vars: { skgif_api: SKGIF_API, id_base: SKGIF_ID_BASE, id_base_enc: encodeURIComponent(SKGIF_ID_BASE) }
});
