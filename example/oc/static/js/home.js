document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchQuery");
  const categorySelect = searchForm.querySelector('select[name="category"]');

  // --- 1. Placeholder Logic ---
  // SILVIA (SKG-IF): tabs, labels and placeholders of the search panel are
  // set by skgifInitSearchFields() (SKGIF_CATEGORIES, at the end of the file)
  skgifInitSearchFields(searchForm, searchInput, categorySelect); // SILVIA: schede, campi nome/cognome + pannello ID


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

    // SILVIA: documenti, autori, riviste e organizzazioni si cercano con skgifSearch();
    // il Citation Record (OCI) usa ancora la logica precedente qui sotto
    if (category !== "citation") return skgifSearch(category, searchInput);

    const query = searchInput.value.trim();

    if (!query) {
      skgifShowHint("Please enter an OCI."); // SILVIA: messaggio sotto la barra di ricerca (al posto di alert())
      return;
    }

    // If it looks like an ID (DOI, ORCID, etc.), resolve it
    if (isDirectLucindaQuery(query)) {
      await openLucinda(query, category);
      return;
    }

    // SILVIA: un OCI scritto senza "ci/" (o come "oci:...") apre il record di citazione
    const bareOci = query.replace(/^oci:/i, "");
    if (/^\d+-\d+$/.test(bareOci)) {
      window.location.href = `http://127.0.0.1:5500/example/oc/html_template/browser.html?value=ci/${bareOci}`;
      return;
    }
    skgifShowHint("This is not a valid OCI.");
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
      omid = await skgifIdToOmid(identifier); // SILVIA: prima era idToOmid() (SPARQL)
    } else {
      // Input is already a Lucinda ID (br/..., ra/...)
      omid = identifier;
    }

    // Clean OMID (remove base URL if present)
    const omidId = omid.replace("https://w3id.org/oc/meta/", "");

    // SILVIA: tolti i reindirizzamenti doc_cit/ e doc_ref/ (si aprono dalle card dei documenti)
    const lucindaUrl = `http://127.0.0.1:5500/example/oc/html_template/browser.html?value=${omidId}`;
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
// SILVIA: trova l'OMID di un ID di documento con SKG-IF (/products), al posto di idToOmid().
// Usata solo dal Citation Record.
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
  if (!response.ok && response.status !== 404) { // 404 = nessun record con quell'ID
    throw new Error(`The SKG-IF API returned an error (${response.status}).`);
  }

  const omid = response.ok ? (await response.json())["@graph"]?.[0]?.local_identifier : null;
  if (!omid) throw new Error(`No OMID found for ${identifier}`);
  return omid;
}

// SILVIA: le risorse del pannello di ricerca: icona, nome, etichetta e placeholder.
const SKGIF_CATEGORIES = {
  document: { tab: "Document", icon: "fa-regular fa-file-lines", label: "Title", placeholder: "Enter a title" },
  author: { tab: "Author", icon: "fa-solid fa-user-pen", label: "Name" },
  venue: { tab: "Venue", icon: "fa-solid fa-building-columns", label: "Name", placeholder: "Enter a venue name" },
  organisation: { tab: "Organisation", icon: "fa-solid fa-building", label: "Name", placeholder: "Enter an organisation name" },
  citation: { tab: "Citation", icon: "fa-solid fa-share-nodes", label: "OCI", placeholder: "Enter an OCI (ci/...)" }
};

// SILVIA: schemi di ID del pannello per ogni risorsa (lista SKG-IF), con un esempio come placeholder.
// Il primo è quello predefinito.
const SKGIF_ID_SCHEMES = {
  document: { doi: "10.1007/s11192-019-03217-6", arxiv: "1909.01284", bibcode: "2019ApJ...882L..12A", handle: "11585/123456", isbn: "9780203417447", ivoid: "ivo://authority/resource", omid: "br/06010123732", openalex: "W4409315295", pmcid: "PMC7500415", pmid: "24936838", spase: "spase://NASA/...", url: "https://...", urn: "urn:nbn:...", w3id: "https://w3id.org/..." },
  author: { orcid: "0000-0003-0530-4305", omid: "ra/0614010840729", openalex: "A5023888391", url: "https://...", viaf: "102333412", w3id: "https://w3id.org/..." },
  venue: { issn: "0138-9130", doi: "10.1007/...", eissn: "1588-2861", isbn: "9783662685099", lissn: "0138-9130", omid: "br/06010060186", openalex: "S148561398", url: "https://...", w3id: "https://w3id.org/..." },
  organisation: { crossref: "78", omid: "ra/0610116009", openalex: "I12345678", ror: "02mhbdp94", url: "https://...", viaf: "123456789", w3id: "https://w3id.org/..." }
};

// Nome di ogni schema nel menu.
const SKGIF_ID_NAMES = {
  doi: "DOI", pmid: "PMID", pmcid: "PMCID", arxiv: "arXiv", isbn: "ISBN", openalex: "OpenAlex", omid: "OMID",
  bibcode: "Bibcode", handle: "Handle", ivoid: "IVOID", spase: "SPASE", url: "URL", urn: "URN", w3id: "w3id",
  orcid: "ORCID", viaf: "VIAF", issn: "ISSN", eissn: "eISSN", lissn: "ISSN-L", crossref: "Crossref ID", ror: "ROR"
};

// SILVIA: pannello di ricerca. Le schede scelgono la risorsa; "Author" mostra nome e cognome;
// tutte tranne "Citation" mostrano il pannello ID. Testo e ID sono alternativi: si cerca
// il lato usato per ultimo, l'altro viene sbiadito.
function skgifInitSearchFields(searchForm, searchInput, categorySelect) {
  const givenInput = document.getElementById("givenName");
  const familyInput = document.getElementById("familyName");
  const schemeSelect = document.getElementById("idScheme");
  const idInput = document.getElementById("idQuery");
  const textLabel = document.getElementById("textLabel");
  const textSide = document.getElementById("textSide");
  const idSide = document.getElementById("idSide");
  const tabs = searchForm.querySelector(".oc-tabs");
  const textFields = searchForm.querySelectorAll(".text-field");
  const authorFields = searchForm.querySelectorAll(".author-field");
  const idFields = searchForm.querySelectorAll(".id-field");
  const textInputs = [searchInput, givenInput, familyInput];
  const schemeDropdown = skgifDropdown(schemeSelect);

  // una scheda per ogni opzione del select
  tabs.innerHTML = [...categorySelect.options].map(o => {
    const c = SKGIF_CATEGORIES[o.value] || { tab: o.text, icon: "fa-solid fa-magnifying-glass" };
    return `<button type="button" class="oc-tab" role="tab" data-category="${o.value}"><i class="${c.icon}"></i>${c.tab}</button>`;
  }).join("");
  tabs.addEventListener("click", e => {
    const tab = e.target.closest(".oc-tab");
    if (!tab || tab.dataset.category === categorySelect.value) return;
    categorySelect.value = tab.dataset.category;
    idInput.value = ""; // gli schemi cambiano con la risorsa
    searchForm.dataset.side = "text";
    categorySelect.dispatchEvent(new Event("change"));
    (categorySelect.value === "author" ? givenInput : searchInput).focus();
  });

  function toggleFields() {
    const category = categorySelect.value;
    const c = SKGIF_CATEGORIES[category] || {};
    tabs.querySelectorAll(".oc-tab").forEach(t => {
      const active = t.dataset.category === category;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", active);
    });
    const isAuthor = category === "author";
    textFields.forEach(el => el.classList.toggle("d-none", isAuthor));
    authorFields.forEach(el => el.classList.toggle("d-none", !isAuthor));
    textLabel.textContent = c.label || "Search";
    textLabel.htmlFor = isAuthor ? "givenName" : "searchQuery";
    searchInput.placeholder = c.placeholder || "";

    const schemes = SKGIF_ID_SCHEMES[category];
    idFields.forEach(el => el.classList.toggle("oc-hidden", !schemes));
    schemeSelect.innerHTML = schemes
      ? Object.keys(schemes).map(s => `<option value="${s}">${SKGIF_ID_NAMES[s] || s}</option>`).join("")
      : "";
    schemeDropdown.render();
    updateIdPlaceholder();
    skgifShowHint("");
    updateFields();
  }

  function updateIdPlaceholder() {
    const schemes = SKGIF_ID_SCHEMES[categorySelect.value];
    const example = schemes && schemes[schemeSelect.value];
    idInput.placeholder = example ? `e.g. ${example}` : "";
  }

  function updateFields() {
    const side = searchForm.dataset.side || "text";
    const hasText = textInputs.some(el => !el.closest(".d-none") && el.value.trim());
    const hasId = !idSide.classList.contains("oc-hidden") && !!idInput.value.trim();
    textSide.classList.toggle("oc-inactive", side === "id" && hasText);
    idSide.classList.toggle("oc-inactive", side === "text" && hasId);
  }

  const setSide = side => () => { searchForm.dataset.side = side; updateFields(); };
  textSide.addEventListener("focusin", setSide("text"));
  idSide.addEventListener("focusin", setSide("id"));
  [...textInputs, idInput].forEach(el => el.addEventListener("input", () => { skgifShowHint(""); updateFields(); }));
  categorySelect.addEventListener("change", toggleFields);
  schemeSelect.addEventListener("change", updateIdPlaceholder);
  searchForm.dataset.side = "text";
  toggleFields();
  searchInput.focus();
}

// SILVIA: messaggio sotto la barra di ricerca; "" lo cancella.
function skgifShowHint(text) {
  const hint = document.getElementById("searchHint");
  if (hint) hint.textContent = text;
}

// SILVIA: menu a tendina personalizzato al posto del <select> (si apre sempre verso il basso).
// Il select resta nascosto e tiene il valore.
function skgifDropdown(select) {
  const wrap = document.createElement("div");
  wrap.className = "oc-dd";
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
  select.classList.add("d-none");
  select.tabIndex = -1;
  wrap.insertAdjacentHTML("beforeend",
    `<button type="button" class="oc-dd-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${select.getAttribute("aria-label") || ""}"><span class="oc-dd-value"></span><i class="fa-solid fa-chevron-down"></i></button>` +
    `<ul class="oc-dd-menu" role="listbox"></ul>`);
  const btn = wrap.querySelector(".oc-dd-btn");
  const menu = wrap.querySelector(".oc-dd-menu");
  let current = -1; // voce evidenziata

  const items = () => [...menu.querySelectorAll(".oc-dd-item")];
  const isOpen = () => wrap.classList.contains("open");

  function itemHtml(o) {
    const selected = o.value === select.value;
    return `<li class="oc-dd-item${selected ? " selected" : ""}" role="option" aria-selected="${selected}" data-value="${o.value}">${o.text}<i class="fa-solid fa-check"></i></li>`;
  }

  function render() {
    menu.innerHTML = [...select.children].map(child => child.tagName === "OPTGROUP"
      ? `<li class="oc-dd-group" role="presentation">${child.label}</li>` + [...child.children].map(itemHtml).join("")
      : itemHtml(child)).join("");
    btn.querySelector(".oc-dd-value").textContent = select.selectedOptions[0]?.text || "";
  }

  function highlight(i) {
    const list = items();
    if (!list.length) return;
    current = (i + list.length) % list.length;
    list.forEach((li, j) => li.classList.toggle("active", j === current));
    list[current].scrollIntoView({ block: "nearest" });
  }

  function open() {
    wrap.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    highlight(Math.max(0, items().findIndex(li => li.classList.contains("selected"))));
  }

  function close() {
    wrap.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  }

  function choose(li) {
    select.value = li.dataset.value;
    select.dispatchEvent(new Event("change"));
    render();
    close();
    btn.focus();
  }

  btn.addEventListener("click", () => (isOpen() ? close() : open()));
  menu.addEventListener("mousedown", e => e.preventDefault()); // il focus resta sul bottone
  menu.addEventListener("click", e => {
    const li = e.target.closest(".oc-dd-item");
    if (li) choose(li);
  });
  menu.addEventListener("mousemove", e => {
    const li = e.target.closest(".oc-dd-item");
    if (li && !li.classList.contains("active")) highlight(items().indexOf(li));
  });
  btn.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen()) open();
      else highlight(current + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen() && current >= 0) choose(items()[current]);
      else open();
    } else if (e.key === "Escape" || e.key === "Tab") {
      close();
    }
  });
  document.addEventListener("click", e => { if (!wrap.contains(e.target)) close(); });

  render();
  return { render };
}

// SILVIA: ricerca di documenti, autori, riviste e organizzazioni -> <categoria>/ + uno tra:
//   scheme=doi&id=10.1/...   pannello ID
//   given=...&family=...     nome e cognome dell'autore
//   <testo>                  testo libero delle altre categorie
function skgifSearch(category, searchInput) {
  const form = document.getElementById("searchForm");
  const scheme = document.getElementById("idScheme").value;
  const id = document.getElementById("idQuery").value.trim();
  const given = document.getElementById("givenName").value.trim();
  const family = document.getElementById("familyName").value.trim();
  const text = category === "author" ? given || family : searchInput.value.trim();
  const useId = id && (form.dataset.side === "id" || !text);

  let query;
  if (useId) {
    // "urn:" fa parte del valore, non va tolto
    let value = scheme === "urn" ? id : id.replace(new RegExp(`^${scheme}:\\s*`, "i"), "");
    if (["orcid", "issn", "eissn", "lissn"].includes(scheme)) value = value.toUpperCase();
    query = new URLSearchParams({ scheme, id: value }).toString();
  } else if (!text) {
    skgifShowHint(category === "author"
      ? "Please enter a given name, a family name or an identifier."
      : "Please enter a search text or an identifier.");
    return;
  } else if (category === "author") {
    const params = new URLSearchParams();
    if (given) params.set("given", given);
    if (family) params.set("family", family);
    query = params.toString();
  } else {
    query = text;
  }
  window.location.href = `http://127.0.0.1:5500/example/oc/html_template/browser.html?value=${category}/${encodeURIComponent(query)}`;
}
