// SILVIA - MIGRAZIONE SKG-IF
// Componenti dell'interfaccia: menu a tendina, filtri delle liste, grafico per anno, icona per copiare.

// Menu a tendina personalizzato (al posto del <select> del browser).
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

// Filtri delle liste (Type, Year, Role).
const SKGIF_FILTERS = {
  type: { label: 'Type', values: p => [_skgifProductType(p)], sort: (a, b) => a.localeCompare(b) },
  year: {
    label: 'Year',
    values: p => [/^\d{4}/.test(String(_skgifProductRawDate(p) || '')) ? String(_skgifProductRawDate(p)).slice(0, 4) : 'No date'],
    sort: (a, b) => (a === 'No date') - (b === 'No date') || b.localeCompare(a) // dal più recente, senza data in fondo
  },
  role: {
    label: 'Role', startHidden: true,
    values: p => [..._raPersonRoles(p)].filter(r => r === 'author' || r === 'editor'),
    text: r => r === 'author' ? 'As author' : 'As editor'
  }
};

// Menu dei filtri `keys` con i conteggi (Year = intervallo From-To); onChange(keep); select(key, value) per il grafico.
function _skgifListFilters(box, keys, onChange) {
  const chosen = {};
  let all = [];
  let match = null; // ricerca nel titolo attiva
  let values = {}; // valori di ogni filtro
  const isSet = part => part.range ? !!(chosen.from || chosen.to) : !!chosen[part.key];
  const inRange = product => {
    const year = SKGIF_FILTERS.year.values(product)[0];
    return year !== 'No date' && (!chosen.from || year >= chosen.from) && (!chosen.to || year <= chosen.to);
  };
  const passes = (product, except) => parts.every(part => part === except || !isSet(part)
    || (part.range ? inRange(product) : part.def.values(product).includes(chosen[part.key])));
  // Aggiorna i numeri nei menu (From/To: solo gli anni compatibili con l'altro estremo).
  const recount = () => parts.forEach(part => {
    const base = all.filter(product => (!match || match(product)) && passes(product, part));
    if (part.range) {
      const years = values.year.filter(y => y !== 'No date');
      part.from.set([{ value: '', text: 'From' }, ...years.filter(y => !chosen.to || y <= chosen.to).map(y => ({ value: y, text: y }))], chosen.from);
      part.to.set([{ value: '', text: 'To' }, ...years.filter(y => !chosen.from || y >= chosen.from).map(y => ({ value: y, text: y }))], chosen.to);
      return;
    }
    const counts = {};
    base.forEach(product => part.def.values(product).forEach(v => { counts[v] = (counts[v] || 0) + 1; }));
    part.dropdown.set([{ value: '', text: `All (${base.length})` },
      ...values[part.key].map(v => ({ value: v, text: `${part.def.text ? part.def.text(v) : v} (${counts[v] || 0})` }))]);
  });
  const yearListeners = []; // chi segue l'intervallo Year (grafico)
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
    wrap.className = `d-flex align-items-center gap-2${def.startHidden ? ' d-none' : ''}`;
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
  // Bottone "Clear filters": riporta tutti i filtri su All.
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
  box?.appendChild(clear);
  return {
    fill(items) {
      all = items;
      parts.forEach(part => {
        const { key, def, wrap } = part;
        values[key] = [...new Set(items.flatMap(def.values))].sort(def.sort);
        const shown = part.range ? values[key].some(y => y !== 'No date') : values[key].length;
        wrap.classList.toggle('d-none', !shown); // anche con un solo valore
        (part.range ? [part.from, part.to] : [part.dropdown]).forEach(d => d.enable(true));
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
    // La ricerca nel titolo cambia i numeri.
    setMatch(newMatch) {
      match = newMatch;
      if (all.length) recount();
    },
    select(key, value) {
      const part = parts.find(p => p.key === key);
      if (!part || !part.dropdown.enabled() || !part.wrap.offsetParent) return false;
      if (part.range) { // stesso anno già scelto: lo toglie
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

// Icona per copiare un valore (solo nelle schede, non nelle card); il clic è gestito sotto.
const SKGIF_COPY_ICON = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M11 3.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const SKGIF_COPIED_ICON = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
function _skgifCopyButton(value) {
  const v = _skgifEscape(value);
  return `<button type="button" class="skgif-copy" data-copy="${v}" title="Copy ${v}" aria-label="Copy ${v}">${SKGIF_COPY_ICON}</button>`;
}
// Copia il valore e per un secondo e mezzo mostra la spunta e "Copied".
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

// --- Grafici ---

// Grafico a barre delle date per anno; fill = altezza in px, onYear = clic su una barra.
function _skgifYearChart(box, dates, label, emptyMessage, fill, onYear) {
  const perYear = {}; // anno -> quante date
  dates.forEach(date => {
    const year = String(date || '').slice(0, 4);
    if (/^\d{4}$/.test(year)) perYear[year] = (perYear[year] || 0) + 1;
  });
  const years = Object.keys(perYear).sort();
  if (!years.length) {
    box.innerHTML = `<em>${emptyMessage}</em>`;
    return;
  }
  box.innerHTML = fill
    ? `<div style="position: relative; width: 100%; max-width: ${Math.min(600, 150 + years.length * 80)}px; margin: 0 auto; height: ${fill}px;"><canvas></canvas></div>` // pochi anni = grafico più stretto
    : '<canvas style="display: block; margin: 0 auto;"></canvas>';
  // colonne sottili, anni obliqui, colori OC
  const font = { family: '"Work Sans", sans-serif', size: 11 };
  const chart = new Chart(box.querySelector('canvas'), {
    type: 'bar',
    data: {
      labels: years,
      datasets: [{ label, backgroundColor: '#8f4ec7', hoverBackgroundColor: '#68c5f9', data: years.map(y => perYear[y]),
        borderRadius: 2, maxBarThickness: 12, categoryPercentage: 0.6 }]
    },
    options: {
      responsive: !!fill,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      onClick: onYear && ((event, bars) => { if (bars.length) onYear(years[bars[0].index]); }),
      onHover: onYear && ((event, bars) => { event.native.target.style.cursor = bars.length ? 'pointer' : ''; }),
      scales: {
        x: { grid: { display: false }, border: { color: '#c9bdd6' }, ticks: { font, color: '#6c727a', minRotation: 45, maxRotation: 45, autoSkip: false } }, // un anno sotto ogni colonna
        y: { beginAtZero: true, border: { display: false, dash: [4, 4] }, grid: { color: '#e6dcef' },
          ticks: { font, color: '#6c727a', stepSize: 1, callback: v => Number.isInteger(v) ? v : '' } }
      }
    }
  });
  if (!onYear) return;
  // Sotto il grafico: come si usa e l'etichetta dell'anno scelto (✕ = toglie solo il filtro Year).
  box.insertAdjacentHTML('beforeend', `<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
      <span class="small text-muted">Click a bar to filter the list by that year.</span>
      <button type="button" class="btn btn-sm skgif-year-chip d-none" aria-label="Remove the year filter"></button>
    </div>`);
  const chip = box.querySelector('.skgif-year-chip');
  chip.addEventListener('click', () => box.skgifClearYears?.());
  // Filtro Year: le barre fuori dall'intervallo from-to si sbiadiscono ('' = nessun limite).
  box.skgifYears = (from, to) => {
    chart.data.datasets[0].backgroundColor = years.map(y => (!from || y >= from) && (!to || y <= to) ? '#8f4ec7' : 'rgba(143, 78, 199, 0.2)');
    chart.update();
    const text = from && to ? (from === to ? from : `${from}–${to}`) : from ? `From ${from}` : to ? `Until ${to}` : '';
    chip.textContent = `${text} ✕`;
    chip.classList.toggle('d-none', !text);
  };
}

// Mostra nel grafico `boxId` l'intervallo del filtro Year; clear toglie il filtro (✕ dell'etichetta).
function _skgifChartYears(boxId, from, to, clear) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.skgifClearYears = clear;
  box.skgifYears?.(from, to);
}
