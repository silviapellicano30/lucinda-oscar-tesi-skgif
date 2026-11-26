// Home page: search panel (resource tabs, text and ID fields) and the Citation tab (OCI only).
document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchQuery");
  const categorySelect = searchForm.querySelector('select[name="category"]');
  skgifInitSearchFields(searchForm, searchInput, categorySelect);

  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    const category = categorySelect.value;
    if (category !== "citation") return skgifSearch(category, searchInput);
    skgifOpenOci(searchInput.value.trim());
  });
});

// Citation tab: opens the citation record of an OCI, with or without "ci/" or "oci:" (e.g. 06101801781-06180334099);
// anything else (DOI, ORCID, text...) gets a message under the search bar.
function skgifOpenOci(query) {
  if (!query) return skgifShowHint("Please enter an OCI.");
  const oci = query.replace(/^(ci\/|oci:)/i, "");
  if (/^\d+-\d+$/.test(oci)) window.location.href = `browser.html?value=ci/${oci}`;
  else skgifShowHint("This is not a valid OCI.");
}

// --- Search panel ---

// Resources of the search panel: icon, name, label and placeholder.
const SKGIF_CATEGORIES = {
  product: { tab: "Research product", icon: "fa-regular fa-file-lines", label: "Title", placeholder: "Enter a title" },
  person: { tab: "Person", icon: "fa-solid fa-user-pen", label: "Name" },
  venue: { tab: "Venue", icon: "fa-solid fa-building-columns", label: "Name", placeholder: "Enter a journal, book or conference name" },
  organisation: { tab: "Organisation", icon: "fa-solid fa-building", label: "Name", placeholder: "Enter an organisation name" },
  citation: { tab: "Citation", icon: "fa-solid fa-share-nodes", label: "OCI", placeholder: "Enter an OCI (ci/...)" }
};

// ID schemes of the panel for each resource (SKG-IF list), with an example as placeholder.
// The first one is the default.
const SKGIF_ID_SCHEMES = {
  product: { doi: "10.1007/s11192-019-03217-6", arxiv: "1909.01284", bibcode: "2019ApJ...882L..12A", handle: "11585/123456", isbn: "9780203417447", ivoid: "ivo://authority/resource", omid: "br/06010123732", openalex: "W4409315295", pmcid: "PMC7500415", pmid: "24936838", spase: "spase://NASA/...", url: "https://...", urn: "urn:nbn:...", w3id: "https://w3id.org/..." },
  person: { orcid: "0000-0003-0530-4305", omid: "ra/0614010840729", openalex: "A5023888391", url: "https://...", viaf: "102333412", w3id: "https://w3id.org/..." },
  venue: { issn: "0138-9130", doi: "10.1007/...", eissn: "1588-2861", isbn: "9783662685099", lissn: "0138-9130", omid: "br/06010060186", openalex: "S148561398", url: "https://...", w3id: "https://w3id.org/..." },
  organisation: { crossref: "78", omid: "ra/0610116009", openalex: "I12345678", ror: "02mhbdp94", url: "https://...", viaf: "123456789", w3id: "https://w3id.org/..." }
};

// Name of each scheme in the menu.
const SKGIF_ID_NAMES = {
  doi: "DOI", pmid: "PMID", pmcid: "PMCID", arxiv: "arXiv", isbn: "ISBN", openalex: "OpenAlex", omid: "OMID",
  bibcode: "Bibcode", handle: "Handle", ivoid: "IVOID", spase: "SPASE", url: "URL", urn: "URN", w3id: "w3id",
  orcid: "ORCID", viaf: "VIAF", issn: "ISSN", eissn: "eISSN", lissn: "ISSN-L", crossref: "Crossref ID", ror: "ROR"
};

// Search panel. The tabs choose the resource; "Person" shows given and family name;
// all except "Citation" show the ID panel. Text and ID are alternatives: the side used
// last is searched, the other one is faded.
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
  const personFields = searchForm.querySelectorAll(".person-field");
  const idFields = searchForm.querySelectorAll(".id-field");
  const textInputs = [searchInput, givenInput, familyInput];
  const schemeDropdown = skgifDropdown(schemeSelect);
  const refines = searchForm.querySelectorAll(".oc-refine"); // optional filter of the search by name (Type of the venues)
  skgifDropdown(document.getElementById("venueType"));

  // one tab for each option of the select; "?" next to it when the page explains that resource in a card (#help-<category>)
  tabs.innerHTML = [...categorySelect.options].map(o => {
    const c = SKGIF_CATEGORIES[o.value] || { tab: o.text, icon: "fa-solid fa-magnifying-glass" };
    const help = document.getElementById(`help-${o.value}`)
      ? `<button type="button" class="oc-tab-help" data-help="${o.value}" aria-label="What does “${c.tab}” mean?"><span aria-hidden="true">?</span></button>`
      : "";
    return `<div class="oc-tab-wrap"><button type="button" class="oc-tab" role="tab" data-category="${o.value}"><i class="${c.icon}"></i>${c.tab}</button>${help}</div>`;
  }).join("");
  tabs.addEventListener("click", e => {
    const help = e.target.closest(".oc-tab-help");
    if (help) { // shows the card that explains the resource, highlighted for a moment
      const card = document.getElementById(`help-${help.dataset.help}`);
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.remove("oc-help-flash");
      void card.offsetWidth; // restarts the highlight if clicked again
      card.classList.add("oc-help-flash");
      return;
    }
    const tab = e.target.closest(".oc-tab-wrap")?.querySelector(".oc-tab"); // the whole tab area selects it
    if (!tab || tab.dataset.category === categorySelect.value) return;
    selectCategory(tab.dataset.category);
    (categorySelect.value === "person" ? givenInput : searchInput).focus();
  });

  // Selects a resource in the search panel (tabs and resource cards).
  function selectCategory(category) {
    if (category === categorySelect.value) return;
    categorySelect.value = category;
    idInput.value = ""; // the schemes change with the resource
    searchForm.dataset.side = "text";
    categorySelect.dispatchEvent(new Event("change"));
  }

  // Resource cards (home.html): a click selects that resource in the search panel and brings the panel on screen.
  // The field gets the focus only with a mouse: on touch screens it would open the keyboard.
  document.querySelectorAll('.resource-card[id^="help-"]').forEach(card => {
    const category = card.id.slice("help-".length);
    if (![...categorySelect.options].some(o => o.value === category)) return;
    card.setAttribute("role", "button");
    card.tabIndex = 0;
    card.setAttribute("aria-label", `Search ${(SKGIF_CATEGORIES[category] || {}).tab || category}`);
    const pick = () => {
      selectCategory(category);
      const panel = searchForm.closest(".oc-search") || searchForm;
      if (panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ behavior: "smooth", block: "start" });
      if (window.matchMedia("(hover: hover)").matches) {
        (category === "person" ? givenInput : searchInput).focus({ preventScroll: true });
      }
    };
    card.addEventListener("click", pick);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
    });
  });

  function toggleFields() {
    const category = categorySelect.value;
    const c = SKGIF_CATEGORIES[category] || {};
    tabs.querySelectorAll(".oc-tab").forEach(t => {
      const active = t.dataset.category === category;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", active);
    });
    const isPerson = category === "person";
    textFields.forEach(el => el.classList.toggle("d-none", isPerson));
    personFields.forEach(el => el.classList.toggle("d-none", !isPerson));
    searchForm.querySelector(".venue-filter").classList.toggle("d-none", category !== "venue");
    textLabel.textContent = c.label || "Search";
    textLabel.htmlFor = isPerson ? "givenName" : "searchQuery";
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
    refines.forEach(el => el.classList.toggle("oc-inactive", side === "id" && hasText)); // they apply only to the text search
    idSide.classList.toggle("oc-inactive", side === "text" && hasId);
  }

  const setSide = side => () => { searchForm.dataset.side = side; updateFields(); };
  textSide.addEventListener("focusin", setSide("text"));
  refines.forEach(el => el.addEventListener("focusin", setSide("text")));
  idSide.addEventListener("focusin", setSide("id"));
  [...textInputs, idInput].forEach(el => el.addEventListener("input", () => { skgifShowHint(""); updateFields(); }));
  categorySelect.addEventListener("change", toggleFields);
  schemeSelect.addEventListener("change", updateIdPlaceholder);
  searchForm.dataset.side = "text";
  toggleFields();
  searchInput.focus();
}

// Message under the search bar; "" clears it.
function skgifShowHint(text) {
  const hint = document.getElementById("searchHint");
  if (hint) hint.textContent = text;
}

// Custom dropdown menu instead of the <select> (always opens downwards).
// The select stays hidden and holds the value.
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
  let current = -1; // highlighted entry

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
  menu.addEventListener("mousedown", e => e.preventDefault()); // the focus stays on the button
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

// Search of research products, persons, venues and organisations -> <category>/ + one of:
//   scheme=doi&id=10.1/...   ID panel
//   given=...&family=...     given and family name of the person
//   <text>                   free text of the other categories
//   text=...&type=...        venues with the Type filter
function skgifSearch(category, searchInput) {
  const form = document.getElementById("searchForm");
  const scheme = document.getElementById("idScheme").value;
  const id = document.getElementById("idQuery").value.trim();
  const given = document.getElementById("givenName").value.trim();
  const family = document.getElementById("familyName").value.trim();
  const text = category === "person" ? given || family : searchInput.value.trim();
  const useId = id && (form.dataset.side === "id" || !text);

  let query;
  if (useId) {
    // "urn:" is part of the value, it must not be removed
    let value = scheme === "urn" ? id : id.replace(new RegExp(`^${scheme}:\\s*`, "i"), "");
    if (["orcid", "issn", "eissn", "lissn"].includes(scheme)) value = value.toUpperCase();
    query = new URLSearchParams({ scheme, id: value }).toString();
  } else if (!text) {
    skgifShowHint(category === "person"
      ? "Please enter a given name, a family name or an identifier."
      : "Please enter a search text or an identifier.");
    return;
  } else if (category === "person") {
    const params = new URLSearchParams();
    if (given) params.set("given", given);
    if (family) params.set("family", family);
    query = params.toString();
  } else {
    const type = category === "venue" ? document.getElementById("venueType").value : "";
    query = type ? new URLSearchParams({ text, type }).toString() : text;
  }
  window.location.href = `browser.html?value=${category}/${encodeURIComponent(query)}`;
}
