// SILVIA - MIGRAZIONE SKG-IF
// Pagine Go to References / Go to Citations (doc_citations, doc_references).

// Citazioni (cf.cites:<omid>) e riferimenti (cf.cited_by:<omid>) di un documento.
function api_doc_citations_skgif(...args) {
  _skgifCitationList(args[1], SKGIF_FILTER.cites, 'No citations found.');
}

function api_doc_references_skgif(...args) {
  _skgifCitationList(args[1], SKGIF_FILTER.citedBy, 'No references found.');
}

function _skgifCitationList(lucinda_main_data, filter, emptyMessage) {
  const id = _skgifUrlParam(lucinda_main_data, 'id').trim();
  if (!id) {
    _skgifShowMessage(emptyMessage);
    return;
  }

  // intestazione e conteggio li mette Lucinda
  createSkgifPaginatedSearch({
    sources: [skgifFilterUrl('products', filter, `br/${id}`)],
    renderItem: _renderDocumentCard,
    emptyMessage,
    missingNoun: filter === SKGIF_FILTER.cites ? 'citation' : 'reference' // una citazione che non arriva non blocca la lista
  }).search();
}
