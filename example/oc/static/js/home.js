document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchQuery");
  const categorySelect = searchForm.querySelector('select[name="category"]');

  // --- 1. Placeholder Logic ---
  const placeholders = {
    document: "Search by DOI, PMID, Title...",
    author: "Search by ORCID, Name...",
    venue: "Search by ISSN, Name...",
    citation: "Search by OCI...",
    doc_cit: "Enter DOI/PMID to see citations...",
    doc_ref: "Enter DOI/PMID to see references..."
  };

  function updatePlaceholder() {
    const cat = categorySelect.value;
    searchInput.placeholder = placeholders[cat] || "Search...";
  }

  // Initialize and listen for changes
  updatePlaceholder();
  categorySelect.addEventListener("change", updatePlaceholder);
  skgifInitAuthorFields(searchForm, searchInput, categorySelect); // SILVIA (SKG-IF): campi nome/cognome/ORCID


  // --- 2. Regex Definitions ---
  // Lucinda native prefixes
  // SILVIA (SKG-IF): was /^(br|ci|ra|ve):?/i, which matched any text starting
  // with those letters ("brain tumor", "Veterinary Record") and sent it as an
  // OMID ("No template is suitable"). Now only prefix + "/" + digits
  // ("br/0605748453"; an OCI has a dash: "ci/06010572394-0605748453").
  const lucindaPrefixRegex = /^(br|ci|ra|ve)\/[\d-]+$/i;
  
  // External Identifiers
  const doiRegex = /^(doi:)?10\.\d{4,9}\/[^\s]+$/i;
  const pmidRegex = /^pmid:\d{1,8}$/i;
  const openalexRegex = /^openalex:W\d{10}$/i;
  
  // New Identifiers (ORCID & ISSN)
  // ORCID: 0000-0000-0000-0000 (16 digits, dashes, last can be X)
  const orcidRegex = /^(orcid:)?\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i;
  // ISSN: 0000-0000 (8 digits, dash, last can be X)
  const issnRegex = /^(issn:)?\d{4}-\d{3}[0-9X]$/i;

  function isDirectLucindaQuery(query) {
    return (
      lucindaPrefixRegex.test(query) ||
      doiRegex.test(query) ||
      pmidRegex.test(query) ||
      openalexRegex.test(query) ||
      orcidRegex.test(query) ||
      issnRegex.test(query)
    );
  }

  // --- 3. Search Submission ---
  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault(); 

    const category = categorySelect.value;

    if (category === "author") return skgifAuthorSearch(); // SILVIA (SKG-IF): ricerca autori con campi separati

    const query = searchInput.value.trim();

    if (!query) {
      alert("Please enter a search query.");
      return;
    }

    // SILVIA (SKG-IF): an ISSN or an ORCID, in any category, shows the cards
    // of every record with it (the same ID can belong to several venue /
    // person records), read by api_search_venue_skgif() /
    // api_search_author_skgif(), instead of the page of the first record only
    if (issnRegex.test(query)) {
      const issn = query.replace(/^issn:/i, "").toUpperCase(); // final x -> X, as stored
      window.location.href = `http://127.0.0.1:5500/example/oc/html_template/browser.html?value=venue/${encodeURIComponent(`issn=${issn}`)}`;
      return;
    }
    if (orcidRegex.test(query)) {
      const orcid = query.replace(/^orcid:/i, "").toUpperCase();
      window.location.href = `http://127.0.0.1:5500/example/oc/html_template/browser.html?value=author/${encodeURIComponent(`orcid=${orcid}`)}`;
      return;
    }

    // If it looks like an ID (DOI, ORCID, etc.), resolve it
    if (isDirectLucindaQuery(query)) {
      await openLucinda(query, category);
      return;
    }

    // SILVIA (SKG-IF): citations/references need a document ID, not free text
    // (doc_cit/<text> matches no template)
    if (category === "doc_cit" || category === "doc_ref") {
      alert("Please enter a DOI, PMID (pmid:...), OpenAlex ID (openalex:W...) or OMID (br/...).");
      return;
    }

    // Otherwise, treat as Free Text Search
    // Matches: category/{query} -> handled by doc_free_text.hf / aut_free_text.hf etc.
    const lucindaUrl = `http://127.0.0.1:5500/example/oc/html_template/browser.html?value=${category}/${encodeURIComponent(query)}`;
    window.location.href = lucindaUrl;
  });
});

/**
 * Resolves external identifiers (DOI, ORCID, etc.) to an OMID using SPARQL.
 */
async function idToOmid(identifier) {
  const endpoint = "https://sparql.opencitations.net/meta";
  let scheme, cleanId;

  // Detect Scheme and Clean ID
  if (/^doi:|^10\.\d{4,9}\//i.test(identifier)) {
    scheme = "doi";
    cleanId = identifier.replace(/^doi:/i, "");
  } else if (/^pmid:/i.test(identifier)) {
    scheme = "pmid";
    cleanId = identifier.replace(/^pmid:/i, "");
  } else if (/^openalex:/i.test(identifier)) {
    scheme = "openalex";
    cleanId = identifier.replace(/^openalex:/i, "");
  } else if (/^orcid:|\d{4}-\d{4}-\d{4}-\d{3}[0-9X]/i.test(identifier)) {
    scheme = "orcid"; // datacite:orcid
    cleanId = identifier.replace(/^orcid:/i, "");
  } else if (/^issn:|\d{4}-\d{3}[0-9X]/i.test(identifier)) {
    scheme = "issn"; // datacite:issn
    cleanId = identifier.replace(/^issn:/i, "");
  } else {
    throw new Error("Unknown identifier type: " + identifier);
  }

  // SPARQL Query
  const query = `
    PREFIX datacite: <http://purl.org/spar/datacite/>
    PREFIX literal: <http://www.essepuntato.it/2010/06/literalreification/>
    SELECT ?omid WHERE {
      ?omid datacite:hasIdentifier ?identifier .
      ?identifier datacite:usesIdentifierScheme datacite:${scheme} ;
                  literal:hasLiteralValue "${cleanId}" .
    } LIMIT 1
  `;

  const url = endpoint + "?query=" + encodeURIComponent(query);

  const response = await fetch(url, {
    headers: { "Accept": "application/sparql-results+json" }
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error("The endpoint did not return valid JSON.");
  }

  if (!data.results || data.results.bindings.length === 0) {
    throw new Error(`No OMID found for ${identifier}`);
  }

  return data.results.bindings[0].omid.value;
}

/**
 * Handles logic for Direct ID queries (Resolve -> Redirect)
 */
async function openLucinda(identifier, category) {
  try {
    let omid;

    // Regex Checkers (Redefined scope for clarity)
    const doiRegex = /^(doi:)?10\.\d{4,9}\/[^\s]+$/i;
    const pmidRegex = /^pmid:\d{1,8}$/i;
    const openalexRegex = /^openalex:W\d{10}$/i;
    const orcidRegex = /^(orcid:)?\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i;
    const issnRegex = /^(issn:)?\d{4}-\d{3}[0-9X]$/i;

    // Check if resolution is needed
    if (
      doiRegex.test(identifier) ||
      pmidRegex.test(identifier) ||
      openalexRegex.test(identifier) ||
      orcidRegex.test(identifier) ||
      issnRegex.test(identifier)
    ) {
      omid = await skgifIdToOmid(identifier); // SILVIA (SKG-IF): was idToOmid() (SPARQL)
    } else {
      // Input is already a Lucinda ID (br/..., ra/...)
      omid = identifier;
    }

    // Clean OMID (remove base URL if present)
    const omidId = omid.replace("https://w3id.org/oc/meta/", "");

    // --- Contextual Redirect Logic ---
    // If the user specifically asked for Citations/References, prepend that prefix
    // Only applies if the resolved ID is a Bibliographic Resource (br/)
    let finalValue = omidId;

    if (omidId.startsWith("br/")) {
        if (category === "doc_cit") {
            finalValue = `doc_cit/${omidId}`;
        } else if (category === "doc_ref") {
            finalValue = `doc_ref/${omidId}`;
        }
    }

    const lucindaUrl = `http://127.0.0.1:5500/example/oc/html_template/browser.html?value=${finalValue}`;
    window.location.href = lucindaUrl;

  } catch (err) {
    console.error("Error:", err.message);
    alert("Error: " + err.message);
  }
}

/*
################################################################################
# SILVIA (SKG-IF)
################################################################################
*/
// SILVIA (SKG-IF): replaces Pietro's idToOmid() above, used by openLucinda().
// Resolves an external identifier to an OMID through the
// SKG-IF API (was a SPARQL query on Meta). Only document IDs get here, looked
// up on /products; the first record is taken, as the old LIMIT 1 did. ORCID
// and ISSN never get here: they open the author / venue cards (see the
// submit listener).
const SKGIF_ID_LOOKUP = [
  { test: /^doi:|^10\.\d{4,9}\//i, scheme: "doi", entity: "products", field: "identifiers.id" },
  { test: /^pmid:/i, scheme: "pmid", entity: "products", field: "identifiers.id" },
  { test: /^openalex:/i, scheme: "openalex", entity: "products", field: "identifiers.id" }
];

async function skgifIdToOmid(identifier) {
  const lookup = SKGIF_ID_LOOKUP.find(l => l.test.test(identifier));
  if (!lookup) throw new Error("Unknown identifier type: " + identifier);
  const value = identifier.replace(new RegExp(`^${lookup.scheme}:`, "i"), "");

  const url = `https://api.opencitations.net/skg-if/v1/${lookup.entity}` +
    `?filter=identifiers.scheme:${lookup.scheme},${lookup.field}:${encodeURIComponent(value)}&page_size=1`;
  const response = await fetch(url);
  if (!response.ok && response.status !== 404) { //404 = nessun record con quell'ID
    throw new Error(`The SKG-IF API returned an error (${response.status}).`);
  }

  const omid = response.ok ? (await response.json())["@graph"]?.[0]?.local_identifier : null;
  if (!omid) throw new Error(`No OMID found for ${identifier}`);
  return omid;
}

// SILVIA (SKG-IF): "Author Record" shows given name / family name / ORCID
// fields (in home.html) instead of the single search box. Names and ORCID are
// alternative: typing in one side disables the other.
function skgifInitAuthorFields(searchForm, searchInput, categorySelect) {
  const givenInput = document.getElementById("givenName");
  const familyInput = document.getElementById("familyName");
  const orcidInput = document.getElementById("orcidQuery");
  const authorFields = searchForm.querySelectorAll(".author-field");

  function toggleFields() {
    const isAuthor = categorySelect.value === "author";
    searchInput.classList.toggle("d-none", isAuthor);
    authorFields.forEach(el => el.classList.toggle("d-none", !isAuthor));
  }

  function updateAuthorFields() {
    const hasName = givenInput.value.trim() || familyInput.value.trim();
    orcidInput.disabled = !!hasName;
    givenInput.disabled = familyInput.disabled = !hasName && !!orcidInput.value.trim();
  }

  toggleFields();
  categorySelect.addEventListener("change", toggleFields);
  [givenInput, familyInput, orcidInput].forEach(el => el.addEventListener("input", updateAuthorFields));
}

// SILVIA (SKG-IF): author search -> author/<given=...&family=...> or
// author/<orcid=...>, read by api_search_author_skgif() in localbrowser.js.
// An ORCID typed in a name field is searched as ORCID.
function skgifAuthorSearch() {
  const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i;
  const orcidOf = s => s.trim().replace(/^https?:\/\/orcid\.org\//i, "").replace(/^orcid:/i, "");
  const orcidInput = document.getElementById("orcidQuery");
  const given = document.getElementById("givenName").value.trim();
  const family = document.getElementById("familyName").value.trim();
  const orcid = [orcidInput.value, given, family].map(orcidOf).find(s => orcidRegex.test(s));
  let params;
  if (orcid) {
    params = new URLSearchParams({ orcid });
  } else if (orcidInput.value.trim()) {
    alert("Please enter a valid ORCID (e.g. 0000-0003-0530-4305).");
    return;
  } else if (given || family) {
    params = new URLSearchParams();
    if (given) params.set("given", given);
    if (family) params.set("family", family);
  } else {
    alert("Please enter a given name, a family name or an ORCID.");
    return;
  }
  window.location.href = `http://127.0.0.1:5500/example/oc/html_template/browser.html?value=author/${encodeURIComponent(params.toString())}`;
}
