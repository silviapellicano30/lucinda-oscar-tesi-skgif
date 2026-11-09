// SKG-IF endpoint configuration.
// Everything that depends on the SKG-IF endpoint: base URLs, identifier format, filter names.
// To use another SKG-IF endpoint, change this file only; the .hf templates read the same values through the placeholders below.

const SKGIF_API = "https://api.opencitations.net/skg-if/v1"; // base URL of every SKG-IF call

// Prefix of local identifiers (local_identifier); browser.html?value= carries only the rest (br/..., ra/...).
const SKGIF_ID_BASE = "https://w3id.org/oc/meta/";

// Endpoint filters (cf.* are OpenCitations extensions, not part of the SKG-IF standard).
const SKGIF_FILTER = {
  cites: 'cf.cites', // products that cite an OMID (= citations)
  citedBy: 'cf.cited_by', // products cited by an OMID (= references)
  title: 'cf.search.title',
  name: 'cf.search.name',
  givenName: 'cf.search.given_name',
  familyName: 'cf.search.family_name',
  contributor: 'contributions.by.local_identifier' // products of a person/organisation (any role)
};

// OpenCitations-only services, outside SKG-IF: citation record charts and citation URIs.
const OC_INDEX_API = "https://api.opencitations.net/index/v2";
const OC_CI_BASE = "https://w3id.org/oc/index/ci/";

// Full identifier from the short one ("br/0612..." -> "https://w3id.org/oc/meta/br/0612...").
function skgifFullId(shortId) {
  return SKGIF_ID_BASE + shortId;
}

// The opposite: "br/0612..." from a local_identifier ("" if it is not an identifier of this endpoint).
function _skgifOmid(localId) {
  const value = String(localId || "");
  return value.startsWith(SKGIF_ID_BASE) ? value.slice(SKGIF_ID_BASE.length) : "";
}

// URL of a list filtered by an identifier ("cf.cites", "br/0612..." -> /products?filter=cf.cites:<encoded OMID>).
function skgifFilterUrl(entity, filter, shortId) {
  return `${SKGIF_API}/${entity}?filter=${filter}:${encodeURIComponent(skgifFullId(shortId))}`;
}

// Placeholders of the #api URLs in the .hf templates: [[skgif_api]], [[id_base]] and [[id_base_enc]] (encoded, used inside ?filter=).
Lucinda.init({
  api_vars: { skgif_api: SKGIF_API, id_base: SKGIF_ID_BASE, id_base_enc: encodeURIComponent(SKGIF_ID_BASE) }
});
