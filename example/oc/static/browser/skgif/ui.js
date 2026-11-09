// Interface components: dropdown menus, list filters, per-year chart, copy icon, export.

// Custom dropdown menu (replaces the browser's native <select>).
function _skgifDropdown(ariaLabel, options, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'skgif-dd';
  wrap.innerHTML = `<button type="button" class="skgif-dd-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${_skgifEscape(ariaLabel)}" disabled><span class="skgif-dd-value"></span></button><ul class="skgif-dd-menu" role="listbox"></ul>`;
  const btn = wrap.querySelector('button');
  const menu = wrap.querySelector('ul');
  let list = [];
  let value = '';
  let current = -1;

  const items = () => [...menu.children];
  const isOpen = () => wrap.classList.contains('open');
  function render() {
    menu.innerHTML = list.map(o => `<li class="skgif-dd-item${o.value === value ? ' selected' : ''}" role="option" aria-selected="${o.value === value}" data-value="${_skgifEscape(o.value)}">${_skgifEscape(o.text)}</li>`).join('');
    btn.firstChild.textContent = list.find(o => o.value === value)?.text || '';
  }
  function highlight(i) {
    const all = items();
    if (!all.length) return;
    current = (i + all.length) % all.length;
    all.forEach((li, j) => li.classList.toggle('active', j === current));
    all[current].scrollIntoView({ block: 'nearest' });
  }
  function open() {
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    // on phones, a menu that would overflow the right edge of the screen opens towards the left
    menu.style.left = '';
    const over = menu.getBoundingClientRect().right - (document.documentElement.clientWidth - 8);
    if (over > 0) menu.style.left = `${-over}px`;
    highlight(Math.max(0, items().findIndex(li => li.classList.contains('selected'))));
  }
  function close() {
    wrap.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }
  function choose(li) {
    value = li.dataset.value;
    render();
    close();
    btn.focus();
    onChange(value);
  }

  btn.addEventListener('click', () => (isOpen() ? close() : open()));
  menu.addEventListener('mousedown', e => e.preventDefault());
  menu.addEventListener('click', e => {
    const li = e.target.closest('.skgif-dd-item');
    if (li) choose(li);
  });
  menu.addEventListener('mousemove', e => {
    const li = e.target.closest('.skgif-dd-item');
    if (li && !li.classList.contains('active')) highlight(items().indexOf(li));
  });
  btn.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen()) open();
      else highlight(current + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen() && current >= 0) choose(items()[current]);
      else open();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      close();
    }
  });
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) close(); });

  const set = (newOptions, newValue = value) => {
    list = newOptions;
    value = list.some(o => o.value === newValue) ? newValue : (list[0]?.value ?? '');
    render();
  };
  set(options);
  return {
    el: wrap,
    set,
    select: newValue => set(list, newValue),
    value: () => value,
    enabled: () => !btn.disabled,
    enable: on => { btn.disabled = !on; if (!on) close(); }
  };
}

// List filters (Type, Year, Source, Role).
const SKGIF_FILTERS = {
  type: { label: 'Type', values: p => [_skgifProductType(p)], sort: (a, b) => a.localeCompare(b) },
  year: {
    label: 'Year',
    values: p => [/^\d{4}/.test(String(_skgifProductRawDate(p) || '')) ? String(_skgifProductRawDate(p)).slice(0, 4) : 'Date not available'],
    sort: (a, b) => (a === 'Date not available') - (b === 'Date not available') || b.localeCompare(a) // most recent first, works without a date last
  },
  // journal/series/book where the work was published (name as given by the API), works without one last
  source: {
    label: 'Source',
    values: p => [_skgifProductVenue(p)?.name || 'Source not available'],
    sort: (a, b) => (a === 'Source not available') - (b === 'Source not available') || a.localeCompare(b, undefined, { sensitivity: 'base' })
  },
  role: {
    label: 'Role', startHidden: true,
    values: p => [..._skgifProfileRoles(p)].filter(r => r === 'author' || r === 'editor'),
    text: r => r === 'author' ? 'As author' : 'As editor'
  }
};

// Filter menus for `keys` with counts (Year = From-To range); onChange(keep); select(key, value) is used by the chart.
function _skgifListFilters(box, keys, onChange) {
  _skgifFilterToggle(box?.closest('.skgif-toolbar-row')); // phone layout: filters inside a collapsible panel
  const chosen = {};
  let all = [];
  let match = null; // active title search
  let values = {}; // values of each filter
  const isSet = part => part.range ? !!(chosen.from || chosen.to) : !!chosen[part.key];
  const inRange = product => {
    const year = SKGIF_FILTERS.year.values(product)[0];
    return year !== 'Date not available' && (!chosen.from || year >= chosen.from) && (!chosen.to || year <= chosen.to);
  };
  const passes = (product, except) => parts.every(part => part === except || !isSet(part)
    || (part.range ? inRange(product) : part.def.values(product).includes(chosen[part.key])));
  // Updates the counts in the menus (From/To: only the years compatible with the other end of the range).
  const recount = () => parts.forEach(part => {
    const base = all.filter(product => (!match || match(product)) && passes(product, part));
    if (part.range) {
      const years = values.year.filter(y => y !== 'Date not available');
      part.from.set([{ value: '', text: 'From' }, ...years.filter(y => !chosen.to || y <= chosen.to).map(y => ({ value: y, text: y }))], chosen.from);
      part.to.set([{ value: '', text: 'To' }, ...years.filter(y => !chosen.from || y >= chosen.from).map(y => ({ value: y, text: y }))], chosen.to);
      return;
    }
    const counts = {};
    base.forEach(product => part.def.values(product).forEach(v => { counts[v] = (counts[v] || 0) + 1; }));
    part.dropdown.set([{ value: '', text: `All (${_skgifNum(base.length)})` },
      ...values[part.key].map(v => ({ value: v, text: `${part.def.text ? part.def.text(v) : v} (${_skgifNum(counts[v] || 0)})` }))]);
  });
  const yearListeners = []; // listeners of the Year range (the chart)
  const changed = () => {
    recount();
    yearListeners.forEach(listener => listener(chosen.from || '', chosen.to || ''));
    const any = parts.some(isSet);
    clear.classList.toggle('d-none', !any);
    onChange(any ? product => passes(product, null) : null);
  };
  const parts = keys.map(key => {
    const def = SKGIF_FILTERS[key];
    const wrap = document.createElement('div');
    wrap.className = `d-flex align-items-center gap-2 skgif-filter-${key}${def.startHidden ? ' d-none' : ''}`;
    wrap.innerHTML = `<span class="small fw-bold">${def.label}:</span>`;
    if (key === 'year') {
      const end = name => _skgifDropdown(`Filter by year: ${name.toLowerCase()}`, [{ value: '', text: name }], value => {
        chosen[name.toLowerCase()] = value;
        changed();
      });
      const from = end('From');
      const to = end('To');
      wrap.append(from.el, Object.assign(document.createElement('span'), { className: 'small', textContent: '–' }), to.el);
      box?.appendChild(wrap);
      return { key, def, wrap, range: true, from, to, dropdown: from };
    }
    const dropdown = _skgifDropdown(`Filter by ${def.label.toLowerCase()}`, [{ value: '', text: 'All' }], value => {
      chosen[key] = value;
      changed();
    });
    wrap.appendChild(dropdown.el);
    box?.appendChild(wrap);
    return { key, def, wrap, dropdown };
  });
  // "Clear filters" button: resets every filter to All.
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'btn btn-sm skgif-clear-filters d-none';
  clear.textContent = 'Clear filters';
  clear.addEventListener('click', () => {
    parts.forEach(part => {
      chosen[part.key] = '';
      if (!part.range) part.dropdown.select('');
    });
    chosen.from = chosen.to = '';
    changed();
  });
  // Placed on the counter row ("5 of 6 publications  Clear filters"), where there is free space,
  // so that showing it does not make the filter row wrap.
  const status = box?.closest('.ra-toolbar')?.querySelector('[id$="-status"]');
  if (status) {
    clear.classList.add('skgif-clear-in-status');
    status.after(clear);
  } else box?.appendChild(clear);
  return {
    fill(items) {
      all = items;
      parts.forEach(part => {
        const { key, def, wrap } = part;
        values[key] = [...new Set(items.flatMap(def.values))].sort(def.sort);
        // Each filter is always visible, but enabled only with at least 2 items and at least 2 different values
        // (Year: 2 known years); otherwise it is shown disabled.
        const choices = part.range ? values[key].filter(y => y !== 'Date not available').length : values[key].length;
        wrap.classList.remove('d-none');
        (part.range ? [part.from, part.to] : [part.dropdown]).forEach(d => d.enable(items.length >= 2 && choices >= 2));
      });
      recount();
    },
    onYears(listener) {
      yearListeners.push(listener);
    },
    clearYears() {
      chosen.from = chosen.to = '';
      changed();
    },
    // The title search changes the counts.
    setMatch(newMatch) {
      match = newMatch;
      if (all.length) recount();
    },
    select(key, value) {
      const part = parts.find(p => p.key === key);
      if (!part || !part.dropdown.enabled() || !part.wrap.offsetParent) return false;
      if (part.range) { // same year already selected: removes it
        const same = chosen.from === value && chosen.to === value;
        chosen.from = chosen.to = same ? '' : value;
      } else {
        chosen[key] = part.dropdown.value() === value ? '' : value;
        part.dropdown.select(chosen[key]);
      }
      changed();
      return true;
    }
  };
}

// Icon to copy a value (record pages only, not cards); the click is handled below.
const SKGIF_COPY_ICON = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M11 3.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const SKGIF_COPIED_ICON = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
function _skgifCopyButton(value) {
  const v = _skgifEscape(value);
  return `<button type="button" class="skgif-copy" data-copy="${v}" title="Copy ${v}" aria-label="Copy ${v}">${SKGIF_COPY_ICON}</button>`;
}
// Copies the value and shows a check mark and "Copied" for one and a half seconds.
document.addEventListener('click', e => {
  const btn = e.target.closest('.skgif-copy');
  if (!btn) return;
  navigator.clipboard.writeText(btn.dataset.copy).then(() => {
    btn.innerHTML = SKGIF_COPIED_ICON;
    btn.classList.add('copied');
    clearTimeout(btn.skgifTimer);
    btn.skgifTimer = setTimeout(() => { btn.innerHTML = SKGIF_COPY_ICON; btn.classList.remove('copied'); }, 1500);
  });
});

// Header of the document pages (title, authors/year/source, IDs): one line with "…" when too long;
// a click/tap expands it to several lines, another click collapses it. Only when the line is actually cut.
const SKGIF_HEAD_LINE = '.skgif-head div[class^="skgif-head-"]';
const _skgifIsCut = el => el.scrollWidth > el.clientWidth;
document.addEventListener('mouseover', e => {
  const line = e.target.closest(SKGIF_HEAD_LINE);
  if (line) line.classList.toggle('skgif-cut', _skgifIsCut(line) || line.classList.contains('skgif-head-open'));
});
document.addEventListener('click', e => {
  const line = e.target.closest(SKGIF_HEAD_LINE);
  if (!line || String(window.getSelection())) return; // do not collapse while the user is selecting text
  if (line.classList.contains('skgif-head-open')) line.classList.remove('skgif-head-open');
  else if (_skgifIsCut(line)) line.classList.add('skgif-head-open', 'skgif-cut');
});

// --- Charts ---

// Label of the i-th year under the chart ('' = no label).
function _skgifYearTick(years, i) {
  const n = years.length;
  if (n <= 8 || i === 0 || i === n - 1) return years[i];
  const step = n <= 35 ? 5 : n <= 80 ? 10 : 20;
  const year = Number(years[i]);
  const farFromEnds = i >= step / 2 && n - 1 - i >= step / 2;
  return year % step === 0 && farFromEnds ? years[i] : '';
}

// Bar chart of dates per year; fill = height in px, onYear = click on a bar.
function _skgifYearChart(box, dates, label, emptyMessage, fill, onYear) {
  const perYear = {}; // year -> number of dates
  dates.forEach(date => {
    const year = String(date || '').slice(0, 4);
    if (/^\d{4}$/.test(year)) perYear[year] = (perYear[year] || 0) + 1;
  });
  const found = Object.keys(perYear).sort();
  if (!found.length) {
    box.innerHTML = `<em>${emptyMessage}</em>`;
    return;
  }
  // Continuous axis from the first to the last year in the data; years without data keep their place, at 0.
  const years = [];
  for (let y = Number(found[0]); y <= Number(found[found.length - 1]); y++) years.push(String(y));
  box.innerHTML = fill
    ? `<div style="position: relative; width: 100%; max-width: ${Math.min(600, 150 + years.length * 80)}px; margin: 0 auto; height: ${fill}px;"><canvas></canvas></div>` // few years = narrower chart
    : '<canvas style="display: block; margin: 0 auto;"></canvas>';
  // thin bars, OpenCitations colours
  const font = { family: '"Work Sans", sans-serif', size: 11 };
  const chart = new Chart(box.querySelector('canvas'), {
    type: 'bar',
    data: {
      labels: years,
      datasets: [{ label, backgroundColor: '#8f4ec7', hoverBackgroundColor: '#68c5f9', data: years.map(y => perYear[y] || 0),
        borderRadius: 2, maxBarThickness: 12, categoryPercentage: 0.6 }]
    },
    options: {
      responsive: !!fill,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      onClick: onYear && ((event, bars) => { if (bars.length) onYear(years[bars[0].index]); }),
      onHover: onYear && ((event, bars) => { event.native.target.style.cursor = bars.length ? 'pointer' : ''; }),
      scales: {
        // Horizontal year labels: all of them up to 8 years; beyond that, the first and the last year plus the round
        // years (multiples of 5, 10 or 20 depending on the span) not too close to them. Empty years stay on the axis;
        // the exact year of each bar is shown on hover/tap.
        x: { grid: { display: false }, border: { color: '#c9bdd6' }, ticks: { font, color: '#6c727a', minRotation: 0, maxRotation: 0, autoSkip: false,
          callback: (value, i) => _skgifYearTick(years, i) } },
        y: { beginAtZero: true, border: { display: false, dash: [4, 4] }, grid: { color: '#e6dcef' },
          ticks: { font, color: '#6c727a', stepSize: 1, callback: v => Number.isInteger(v) ? v : '' } }
      }
    }
  });
  if (!onYear) return;
  // Under the chart: how to use it and the label of the selected years (✕ removes only the Year filter).
  box.insertAdjacentHTML('beforeend', `<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2 skgif-chart-foot">
      <span class="small text-muted">Click a bar to filter the list by that year.</span>
      <button type="button" class="btn btn-sm skgif-year-chip d-none" aria-label="Remove the year filter"></button>
    </div>`);
  const chip = box.querySelector('.skgif-year-chip');
  chip.addEventListener('click', () => box.skgifClearYears?.());
  // Year filter: bars outside the from-to range are faded ('' = no limit).
  box.skgifYears = (from, to) => {
    chart.data.datasets[0].backgroundColor = years.map(y => (!from || y >= from) && (!to || y <= to) ? '#8f4ec7' : 'rgba(143, 78, 199, 0.2)');
    chart.update();
    const text = from && to ? (from === to ? from : `${from}–${to}`) : from ? `From ${from}` : to ? `Until ${to}` : '';
    chip.textContent = `${text} ✕`;
    chip.classList.toggle('d-none', !text);
  };
}

// Shows the Year filter range in the chart `boxId`; clear removes the filter (✕ of the label).
function _skgifChartYears(boxId, from, to, clear) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.skgifClearYears = clear;
  box.skgifYears?.(from, to);
}

// --- List export (texts built in cards.js) and "Open at publisher" ---

// Saves a text as a file.
function _skgifDownload(fileName, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// File name: OMID of the page + content (e.g. br_06014720921_citations.csv).
function _skgifFileName(what) {
  const value = new URLSearchParams(location.search).get('value') || 'opencitations';
  return `${value.replace(/\W+/g, '_')}_${what}`;
}
// Phone layout: filters, Export and "Show N entries" are in a panel opened by the "Filters (N)" button
// (N = active filters); Sort by stays next to the button. On desktop the button is hidden by the CSS.
function _skgifFilterToggle(row) {
  if (!row || row.querySelector(':scope > .skgif-filter-toggle')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-sm skgif-filter-toggle';
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = 'Filters <span class="skgif-filter-count"></span>';
  button.addEventListener('click', () => {
    const open = row.classList.toggle('skgif-open');
    button.setAttribute('aria-expanded', String(open));
  });
  row.prepend(button);
}
// Number of active filters (Year From/To counts as one) next to "Filters"; updated after every click
// (menus, Clear filters, chart bars).
function _skgifFilterCounts() {
  document.querySelectorAll('.skgif-toolbar-row').forEach(row => {
    const count = row.querySelector(':scope > .skgif-filter-toggle .skgif-filter-count');
    if (!count) return;
    const n = [...row.querySelectorAll('.skgif-filters > div')]
      .filter(group => group.querySelector('.skgif-dd-item.selected:not([data-value=""])')).length;
    count.textContent = n ? `(${n})` : '';
  });
}
document.addEventListener('click', () => setTimeout(_skgifFilterCounts, 0));

// Collapsible sections on phones (cards with class skgif-fold, initially closed): clicking the header opens/closes
// the section. Tabbed header (author profile charts): a tab opens the section, the already active tab closes it.
// On desktop the CSS hides nothing, so the class does not change the layout.
document.addEventListener('click', e => {
  const header = e.target.closest('.skgif-fold > .card-header');
  if (!header) return;
  const card = header.parentElement;
  const tab = e.target.closest('[role="tab"]');
  const open = card.classList.contains('skgif-unfolded');
  if (tab && !tab.classList.contains('active')) card.classList.add('skgif-unfolded');
  else if (tab || !e.target.closest('a, button')) card.classList.toggle('skgif-unfolded', !open);
}, true); // capture phase: reads the active tab before the click changes it

// "Export: CSV BibTeX": downloads the list as shown (filters, title search, order), all pages.
// enabled = false: buttons disabled until the whole list is loaded (re-enabled by the code that loads it).
function _skgifExportControl(getItems, what, enabled = true) {
  const wrap = document.createElement('div');
  wrap.className = 'd-flex align-items-center gap-2 skgif-export';
  wrap.innerHTML = '<span class="small fw-bold">Export:</span>'
    + `<button type="button" class="btn btn-sm skgif-action-btn" data-format="csv"${enabled ? '' : ' disabled'}>CSV</button>`
    + `<button type="button" class="btn btn-sm skgif-action-btn" data-format="bibtex"${enabled ? '' : ' disabled'}>BibTeX</button>`;
  wrap.addEventListener('click', e => {
    const button = e.target.closest('[data-format]');
    const items = button ? _skgifArray(getItems()).filter(item => item && !item._skgifMissing) : [];
    if (!items.length) return;
    if (button.dataset.format === 'csv') _skgifDownload(`${_skgifFileName(what)}.csv`, _skgifCsv(items), 'text/csv');
    else _skgifDownload(`${_skgifFileName(what)}.bib`, items.map(_skgifBibtex).join('\n\n') + '\n', 'application/x-bibtex');
  });
  return wrap;
}

// Document page: "Open at publisher" link (only with a DOI) on the right of the "Bibliographic Resource Record" row.
function _skgifDocActions(product, head) {
  const doi = _skgifArray(product?.identifiers).find(i => i.scheme === 'doi')?.value;
  const label = head?.previousElementSibling;
  if (!doi || !label) return;
  label.classList.add('skgif-head-label');
  label.insertAdjacentHTML('beforeend', `<a class="skgif-publisher-link" href="https://doi.org/${_skgifEscape(doi)}" target="_blank" rel="noopener">Open at publisher ↗</a>`);
}

// --- Tabs ---

// Tabs (data-br-tab): References / Citations of the document page, charts of the author profile.
function _skgifInitTabs() {
  const tabs = document.querySelectorAll('[data-br-tab]');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    _skgifKeepScroll(); // a shorter tab (e.g. 0 citations) does not make the page jump up
    tabs.forEach(t => {
      const active = t === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
      document.getElementById(`br-${t.dataset.brTab}-pane`)?.classList.toggle('d-none', !active);
    });
  }));
}
