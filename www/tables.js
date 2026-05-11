const MAX_POINTS = 20;
const MAX_INTERP = 10;
const MIN_VAL = -10000;
const MAX_VAL = 10000;

function clamp(val) {
  return Math.min(Math.max(val, MIN_VAL), MAX_VAL);
}

function truncateDisplay(val) {
  if (val == null || isNaN(val)) return val;
  const n = Number(val);
  // If the value is already a clean integer or short decimal, keep it as-is
  if (Number.isInteger(n)) return String(n);
  const s = String(n);
  // Only truncate if the string representation is longer than 3 decimals
  const dotIdx = s.indexOf('.');
  if (dotIdx >= 0 && s.length - dotIdx - 1 > 3) {
    return n.toFixed(3);
  }
  return s;
}

function truncateInput(inputEl, fullVal) {
  // On blur, display the truncated version
  inputEl.value = truncateDisplay(fullVal);
}

function findDuplicateXIndices(points) {
  const counts = new Map();
  points.forEach((p, i) => {
    const key = String(p.x);
    if (!counts.has(key)) counts.set(key, []);
    counts.get(key).push(i);
  });
  const dups = new Set();
  counts.forEach(list => {
    if (list.length > 1) list.forEach(i => dups.add(i));
  });
  return dups;
}

function toggleAddBtn(id, disabled, reasonText) {
  const btn = document.getElementById(id);
  if (!btn) return;
  if (disabled) {
    btn.setAttribute('disabled', 'true');
    btn.classList.add('add-btn-disabled');
    btn.title = reasonText;
  } else {
    btn.removeAttribute('disabled');
    btn.classList.remove('add-btn-disabled');
    btn.removeAttribute('title');
  }
}

function renderDataPoints() {
  const dupIdx = findDuplicateXIndices(dataPoints);
  let html = `<div class="border rounded-md overflow-hidden">
                <table class="w-full text-sm text-left">
                  <thead class="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      <th class="px-3 py-2 border-r font-semibold text-center w-10">#</th>
                      <th class="px-3 py-2 border-r font-semibold text-center">X</th>
                      <th class="px-3 py-2 border-r font-semibold text-center">Y</th>
                      <th class="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y">`;

  dataPoints.forEach((p, i) => {
    const isDup = dupIdx.has(i);
    const rowClass = isDup ? 'dup-row' : '';
    const dupBadge = isDup ? `<div class="text-[9px] text-red-600 font-semibold leading-none pb-1 px-1">duplicate x</div>` : '';
    const xDisplay = truncateDisplay(p.x);
    const yDisplay = truncateDisplay(p.y);
    html += `<tr class="${rowClass}">
              <td class="px-3 py-2 border-r text-center text-muted-foreground font-mono bg-muted/20">${i + 1}</td>
              <td class="p-0 border-r">
                <input id="data-x-${i}" type="number" class="input-cell" value="${xDisplay}" onfocus="this.value = dataPoints[${i}].x" onblur="truncateInput(this, dataPoints[${i}].x)" onchange="updateDataPoint(${i}, 'x', this.value, this)">
                ${dupBadge}
              </td>
              <td class="p-0 border-r"><input id="data-y-${i}" type="number" class="input-cell" value="${yDisplay}" onfocus="this.value = dataPoints[${i}].y" onblur="truncateInput(this, dataPoints[${i}].y)" onchange="updateDataPoint(${i}, 'y', this.value, this)"></td>
              <td class="p-2 text-center">
                <button class="text-muted-foreground hover:text-destructive w-full h-full flex justify-center items-center" onclick="removeDataPoint(${i})">
                  <i data-lucide="x" class="w-4 h-4"></i>
                </button>
              </td>
             </tr>`;
  });

  html += `</tbody></table></div>`;

  const atCap = dataPoints.length >= MAX_POINTS;
  if (atCap) {
    html += `<p class="text-[10px] text-amber-600 mt-1 font-medium italic"><i data-lucide="info" class="w-3 h-3 inline mr-1"></i> Maximum of ${MAX_POINTS} points reached.</p>`;
  }

  const el = document.getElementById('data-points-container');
  if (el) el.innerHTML = html;

  toggleAddBtn('btn-add-data', atCap, `Maximum of ${MAX_POINTS} data points reached`);

  if (window.lucide) lucide.createIcons();
  Shiny.setInputValue('client_data_points', dataPoints, {priority: 'event'});
}

function updateDataPoint(idx, col, val, inputEl) {
  let num = parseFloat(val);
  if (isNaN(num)) return;
  const clamped = clamp(num);
  if (clamped !== num && inputEl) {
    inputEl.value = clamped;
    inputEl.classList.remove('flash-clamp');
    void inputEl.offsetWidth;
    inputEl.classList.add('flash-clamp');
    inputEl.title = `Clamped to [${MIN_VAL}, ${MAX_VAL}]`;
  }
  dataPoints[idx][col] = clamped;
  if (col === 'x') {
    renderDataPoints();
  } else {
    Shiny.setInputValue('client_data_points', dataPoints, {priority: 'event'});
  }
}

function addDataPoint() {
  if (dataPoints.length < MAX_POINTS) {
    dataPoints.push({x: 0, y: 0});
    renderDataPoints();
  }
}

function removeDataPoint(idx) {
  if (dataPoints.length > 1) {
    dataPoints.splice(idx, 1);
    renderDataPoints();
  }
}

function fmtError(v) {
  if (v == null || isNaN(v)) return '—';
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a < 0.001 || a > 9999) return v.toExponential(3);
  return v.toFixed(3);
}

function renderInterpPoints() {
  const errArr = (plotData && !plotData.error) ? ensureArray(plotData.interp_err) : [];
  let html = `<div class="border rounded-md overflow-hidden">
                <table class="w-full text-sm text-left">
                  <thead class="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      <th class="px-3 py-2 border-r font-semibold text-center w-10">#</th>
                      <th class="px-3 py-2 border-r font-semibold text-center">Eval X</th>
                      <th class="px-3 py-2 border-r font-semibold text-center">Result Y</th>
                      <th class="px-3 py-2 border-r font-semibold text-center" title="Approximation using top-order divided difference as proxy for the next term">Est. Error</th>
                      <th class="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y">`;

  interpX.forEach((x, i) => {
    let yVal = "...";
    const interpYArr = plotData && !plotData.error && plotData.interp_y ? ensureArray(plotData.interp_y) : [];
    if (interpYArr[i] !== undefined) {
      yVal = interpYArr[i].toFixed(3);
    }
    const errVal = fmtError(errArr[i]);
    const xDisplay = truncateDisplay(x);

    html += `<tr>
              <td class="px-3 py-2 border-r text-center text-muted-foreground font-mono bg-muted/20">${i + 1}</td>
              <td class="p-0 border-r bg-background"><input id="interp-x-${i}" type="number" class="input-cell font-mono text-sm" value="${xDisplay}" onfocus="this.value = interpX[${i}]" onblur="truncateInput(this, interpX[${i}])" onchange="updateInterpPoint(${i}, this.value, this)"></td>
              <td class="p-0 border-r bg-muted/20"><input type="text" readonly class="input-cell font-bold font-mono text-sm text-primary cursor-not-allowed" value="${yVal}"></td>
              <td class="p-0 border-r bg-muted/20"><input type="text" readonly class="input-cell font-mono text-xs text-amber-700 cursor-not-allowed" value="${errVal}"></td>
              <td class="p-2 text-center">
                <button class="text-muted-foreground hover:text-destructive w-full h-full flex justify-center items-center" onclick="removeInterpPoint(${i})">
                  <i data-lucide="x" class="w-4 h-4"></i>
                </button>
              </td>
             </tr>`;
  });

  html += `</tbody></table></div>`;

  const atCap = interpX.length >= MAX_INTERP;
  if (atCap) {
    html += `<p class="text-[10px] text-amber-600 mt-1 font-medium italic"><i data-lucide="info" class="w-3 h-3 inline mr-1"></i> Limit of ${MAX_INTERP} interpolation points.</p>`;
  }

  let el = document.getElementById('interp-points-container');
  if (el) el.innerHTML = html;

  toggleAddBtn('btn-add-interp', atCap, `Maximum of ${MAX_INTERP} interpolation points reached`);

  if (window.lucide) lucide.createIcons();
}

function updateInterpPoint(idx, val, inputEl) {
  let num = parseFloat(val);
  if (isNaN(num)) return;
  const clamped = clamp(num);
  if (clamped !== num && inputEl) {
    inputEl.value = clamped;
    inputEl.classList.remove('flash-clamp');
    void inputEl.offsetWidth;
    inputEl.classList.add('flash-clamp');
    inputEl.title = `Clamped to [${MIN_VAL}, ${MAX_VAL}]`;
  }
  interpX[idx] = clamped;
  Shiny.setInputValue('client_interp_x', interpX, {priority: 'event'});
}

function addInterpPoint() {
  if (interpX.length < MAX_INTERP) {
    interpX.push(0);
    renderInterpPoints();
    Shiny.setInputValue('client_interp_x', interpX, {priority: 'event'});
  }
}

function removeInterpPoint(idx) {
  if (interpX.length > 1) {
    interpX.splice(idx, 1);
    renderInterpPoints();
    Shiny.setInputValue('client_interp_x', interpX, {priority: 'event'});
  }
}
