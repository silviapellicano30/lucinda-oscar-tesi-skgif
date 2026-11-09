// Go to References / Go to Citations pages (doc_citations, doc_references).

// Citations (cf.cites:<omid>) and references (cf.cited_by:<omid>) of a document.
function api_doc_citations_skgif(...args) {
  _skgifCitationList(args[1], SKGIF_FILTER.cites, 'No citations found.');
}

function api_doc_references_skgif(...args) {
  _skgifCitationList(args[1], SKGIF_FILTER.citedBy, 'No references found.');
}

// Paged list of the products filtered by `filter` on the document OMID taken from the page URL.
function _skgifCitationList(lucinda_main_data, filter, emptyMessage) {
  const id = _skgifUrlParam(lucinda_main_data, 'id').trim();
  if (!id) {
    _skgifShowMessage(emptyMessage);
    return;
  }

  // header and count are set by Lucinda
  skgifPaginatedSearch({
    sources: [skgifFilterUrl('products', filter, `br/${id}`)],
    renderItem: _skgifDocumentCard,
    emptyMessage,
    missingNoun: filter === SKGIF_FILTER.cites ? 'citation' : 'reference' // a citation that does not arrive does not block the list
  }).search();
}
