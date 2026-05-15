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
  const dotIdx = s.indexOf(".");
  if (dotIdx >= 0 && s.length - dotIdx - 1 > 3) {
    return n.toFixed(3);
  }
  return s;
}

function truncateInput(inputEl, fullVal) {
  // On blur, display the truncated version
  inputEl.value = truncateDisplay(fullVal);
}

function parseClipboardData(clipboardText) {
  return clipboardText
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      const cells = line.includes("\t") ? line.split(/\t/) : line.split(/\s+/);
      return cells.map((cell) => cell.trim()).filter((cell) => cell !== "");
    })
    .filter((row) => row.length > 0);
}

function handleDataPointPaste(event, startIdx, targetCol) {
  if (!event.clipboardData) return;
  event.preventDefault();

  const rawText = event.clipboardData.getData("text/plain");
  const rows = parseClipboardData(rawText);
  if (rows.length === 0) return;

  let hasChanges = false;
  const maxRows = Math.min(rows.length, MAX_POINTS - startIdx);

  for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
    const values = rows[rowIndex];
    const currentIdx = startIdx + rowIndex;

    if (currentIdx >= MAX_POINTS) break;
    while (currentIdx >= dataPoints.length && dataPoints.length < MAX_POINTS) {
      dataPoints.push({ x: 0, y: 0 });
    }
    if (currentIdx >= dataPoints.length) break;

    const targetValue = values[0];
    const secondaryValue = values[1];

    if (values.length >= 2) {
      const xNum = parseFloat(targetValue);
      const yNum = parseFloat(secondaryValue);
      if (!isNaN(xNum)) {
        dataPoints[currentIdx].x = clamp(xNum);
        hasChanges = true;
      }
      if (!isNaN(yNum)) {
        dataPoints[currentIdx].y = clamp(yNum);
        hasChanges = true;
      }
    } else {
      const num = parseFloat(targetValue);
      if (!isNaN(num)) {
        dataPoints[currentIdx][targetCol] = clamp(num);
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    renderDataPoints();
  }
}

async function pasteDataPointsFromClipboard() {
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.readText === "function"
  ) {
    try {
      const rawText = await navigator.clipboard.readText();
      if (rawText && rawText.trim()) {
        const rows = parseClipboardData(rawText);
        if (rows.length > 0 && applyClipboardRows(rows)) {
          return;
        }
      }
    } catch (err) {
      console.warn("Clipboard read failed, falling back to manual paste.", err);
    }
  }
  showClipboardPasteModal();
}

function applyClipboardRows(rows) {
  let hasChanges = false;
  const maxRows = Math.min(rows.length, MAX_POINTS);

  for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
    const values = rows[rowIndex];
    if (values.length < 2) continue;

    while (rowIndex >= dataPoints.length && dataPoints.length < MAX_POINTS) {
      dataPoints.push({ x: 0, y: 0 });
    }
    if (rowIndex >= dataPoints.length) break;

    const xNum = parseFloat(values[0]);
    const yNum = parseFloat(values[1]);
    if (!isNaN(xNum)) {
      dataPoints[rowIndex].x = clamp(xNum);
      hasChanges = true;
    }
    if (!isNaN(yNum)) {
      dataPoints[rowIndex].y = clamp(yNum);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    renderDataPoints();
  }
  return hasChanges;
}

function parseCsvText(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      if (line.includes(",")) {
        return line.split(",").map((cell) => cell.trim());
      }
      if (line.includes(";")) {
        return line.split(";").map((cell) => cell.trim());
      }
      if (line.includes("\t")) {
        return line.split(/\t/).map((cell) => cell.trim());
      }
      return line.split(/\s+/).map((cell) => cell.trim());
    });
}

function resetCsvUploadInput() {
  const input = document.getElementById("csv-upload-input");
  if (input) input.value = null;
}

function applyCsvRows(rows) {
  const parsedRows = [];

  for (let i = 0; i < rows.length; i++) {
    const values = rows[i];
    if (values.length < 2) continue;
    const xNum = parseFloat(values[0]);
    const yNum = parseFloat(values[1]);
    if (isNaN(xNum) || isNaN(yNum)) continue;
    parsedRows.push({ x: clamp(xNum), y: clamp(yNum) });
    if (parsedRows.length >= MAX_POINTS) break;
  }

  if (parsedRows.length === 0) {
    return false;
  }

  dataPoints.length = 0;
  parsedRows.forEach((row) => dataPoints.push(row));
  renderDataPoints();
  return true;
}

function handleCsvUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const rows = parseCsvText(text);
    if (rows.length === 0) {
      alert("No valid CSV rows found.");
      resetCsvUploadInput();
      return;
    }

    if (!applyCsvRows(rows)) {
      alert("No valid numeric X/Y values found in the uploaded CSV.");
      resetCsvUploadInput();
      return;
    }

    resetCsvUploadInput();
  };
  reader.onerror = function () {
    alert("Unable to read the selected file.");
    resetCsvUploadInput();
  };
  reader.readAsText(file);
}

function showClipboardPasteModal() {
  if (document.getElementById("clipboard-paste-modal")) return;

  const overlay = document.createElement("div");
  overlay.id = "clipboard-paste-modal";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.35)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "16px";

  const card = document.createElement("div");
  card.style.width = "min(560px,100%)";
  card.style.background = "white";
  card.style.borderRadius = "16px";
  card.style.boxShadow = "0 20px 50px rgba(0,0,0,0.15)";
  card.style.padding = "20px";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "12px";

  const title = document.createElement("h2");
  title.textContent = "Paste Excel Data";
  title.style.margin = "0";
  title.style.fontSize = "1rem";
  title.style.fontWeight = "700";

  const message = document.createElement("p");
  message.textContent =
    "Paste the copied rows here, then click Apply. Only the first two columns are used as X/Y values.";
  message.style.margin = "0";
  message.style.fontSize = "0.9rem";
  message.style.color = "#4a5568";

  const textarea = document.createElement("textarea");
  textarea.style.width = "100%";
  textarea.style.minHeight = "160px";
  textarea.style.padding = "12px";
  textarea.style.fontSize = "0.95rem";
  textarea.style.lineHeight = "1.4";
  textarea.style.border = "1px solid #cbd5e1";
  textarea.style.borderRadius = "8px";
  textarea.style.resize = "vertical";
  textarea.placeholder = "Paste Excel rows here...";
  textarea.autofocus = true;

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.flexWrap = "wrap";
  actions.style.gap = "10px";

  const applyButton = document.createElement("button");
  applyButton.type = "button";
  applyButton.textContent = "Apply";
  applyButton.style.padding = "10px 16px";
  applyButton.style.border = "none";
  applyButton.style.background = "#2563eb";
  applyButton.style.color = "white";
  applyButton.style.borderRadius = "8px";
  applyButton.style.cursor = "pointer";
  applyButton.onclick = function () {
    const rows = parseClipboardData(textarea.value);
    if (rows.length === 0) {
      alert("No valid clipboard data found.");
      return;
    }
    if (!applyClipboardRows(rows)) {
      alert("No numeric X/Y values found in the pasted data.");
      return;
    }
    closeClipboardPasteModal();
  };

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  cancelButton.style.padding = "10px 16px";
  cancelButton.style.border = "1px solid #cbd5e1";
  cancelButton.style.background = "white";
  cancelButton.style.color = "#111827";
  cancelButton.style.borderRadius = "8px";
  cancelButton.style.cursor = "pointer";
  cancelButton.onclick = closeClipboardPasteModal;

  actions.appendChild(applyButton);
  actions.appendChild(cancelButton);

  card.appendChild(title);
  card.appendChild(message);
  card.appendChild(textarea);
  card.appendChild(actions);
  overlay.appendChild(card);
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) closeClipboardPasteModal();
  });

  document.body.appendChild(overlay);
  textarea.focus();
}

function closeClipboardPasteModal() {
  const existing = document.getElementById("clipboard-paste-modal");
  if (existing) {
    existing.remove();
  }
}

function updatePasteButtonState() {
  const btn = document.getElementById("btn-paste-data");
  if (!btn) return;
  btn.removeAttribute("disabled");
  btn.classList.remove("opacity-50", "cursor-not-allowed");
  if (
    !navigator.clipboard ||
    typeof navigator.clipboard.readText !== "function"
  ) {
    btn.title = "Manual paste fallback is available in this environment.";
  } else {
    btn.removeAttribute("title");
  }
}

window.addEventListener("DOMContentLoaded", updatePasteButtonState);

function findDuplicateXIndices(points) {
  const counts = new Map();
  points.forEach((p, i) => {
    const key = String(p.x);
    if (!counts.has(key)) counts.set(key, []);
    counts.get(key).push(i);
  });
  const dups = new Set();
  counts.forEach((list) => {
    if (list.length > 1) list.forEach((i) => dups.add(i));
  });
  return dups;
}

function toggleAddBtn(id, disabled, reasonText) {
  const btn = document.getElementById(id);
  if (!btn) return;
  if (disabled) {
    btn.setAttribute("disabled", "true");
    btn.classList.add("add-btn-disabled");
    btn.title = reasonText;
  } else {
    btn.removeAttribute("disabled");
    btn.classList.remove("add-btn-disabled");
    btn.removeAttribute("title");
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
    const rowClass = isDup ? "dup-row" : "";
    const dupBadge = isDup
      ? `<div class="text-[9px] text-red-600 font-semibold leading-none pb-1 px-1">duplicate x</div>`
      : "";
    const xDisplay = truncateDisplay(p.x);
    const yDisplay = truncateDisplay(p.y);
    html += `<tr id="data-row-${i}" class="${rowClass} transition-colors duration-300">
              <td class="px-3 py-2 border-r text-center text-muted-foreground font-mono bg-muted/20">${i + 1}</td>
              <td class="p-0 border-r">
                <input id="data-x-${i}" type="text" class="input-cell" value="${xDisplay}" onfocus="this.value = dataPoints[${i}].x; this.select()" onblur="truncateInput(this, dataPoints[${i}].x)" onchange="updateDataPoint(${i}, 'x', this.value, this)" onpaste="handleDataPointPaste(event, ${i}, 'x')">
                ${dupBadge}
              </td>
              <td class="p-0 border-r"><input id="data-y-${i}" type="text" class="input-cell" value="${yDisplay}" onfocus="this.value = dataPoints[${i}].y; this.select()" onblur="truncateInput(this, dataPoints[${i}].y)" onchange="updateDataPoint(${i}, 'y', this.value, this)" onpaste="handleDataPointPaste(event, ${i}, 'y')"></td>
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

  const el = document.getElementById("data-points-container");
  if (el) el.innerHTML = html;

  toggleAddBtn(
    "btn-add-data",
    atCap,
    `Maximum of ${MAX_POINTS} data points reached`,
  );

  if (window.lucide) lucide.createIcons();
  Shiny.setInputValue("client_data_points", dataPoints, { priority: "event" });
}

function updateDataPoint(idx, col, val, inputEl) {
  let num = parseFloat(val);
  if (isNaN(num)) return;
  const clamped = clamp(num);
  if (clamped !== num && inputEl) {
    inputEl.value = clamped;
    inputEl.classList.remove("flash-clamp");
    void inputEl.offsetWidth;
    inputEl.classList.add("flash-clamp");
    inputEl.title = `Clamped to [${MIN_VAL}, ${MAX_VAL}]`;
  }
  dataPoints[idx][col] = clamped;
  if (col === "x") {
    renderDataPoints();
  } else {
    Shiny.setInputValue("client_data_points", dataPoints, {
      priority: "event",
    });
  }
}

function addDataPoint() {
  if (dataPoints.length < MAX_POINTS) {
    dataPoints.push({ x: 0, y: 0 });
    renderDataPoints();
  }
}

function removeDataPoint(idx) {
  if (dataPoints.length > 1) {
    dataPoints.splice(idx, 1);
    renderDataPoints();
  }
}

function renderInterpPoints() {
  let html = `<div class="border rounded-md overflow-hidden">
                <table class="w-full text-sm text-left">
                  <thead class="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      <th class="px-3 py-2 border-r font-semibold text-center w-10">#</th>
                      <th class="px-3 py-2 border-r font-semibold text-center">Eval X</th>
                      <th class="px-3 py-2 border-r font-semibold text-center">Result Y</th>
                      <th class="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y">`;

  interpX.forEach((x, i) => {
    let yVal = "...";
    const interpYArr =
      plotData && !plotData.error && plotData.interp_y
        ? ensureArray(plotData.interp_y)
        : [];
    if (interpYArr[i] !== undefined) {
      yVal = interpYArr[i].toFixed(3);
    }
    const xDisplay = truncateDisplay(x);

    html += `<tr>
              <td class="px-3 py-2 border-r text-center text-muted-foreground font-mono bg-muted/20">${i + 1}</td>
              <td class="p-0 border-r bg-background"><input id="interp-x-${i}" type="number" class="input-cell font-mono text-sm" value="${xDisplay}" onfocus="this.value = interpX[${i}]" onblur="truncateInput(this, interpX[${i}])" onchange="updateInterpPoint(${i}, this.value, this)"></td>
              <td class="p-0 border-r bg-muted/20"><input type="text" readonly class="input-cell font-bold font-mono text-sm text-primary cursor-not-allowed" value="${yVal}"></td>
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

  let el = document.getElementById("interp-points-container");
  if (el) el.innerHTML = html;

  toggleAddBtn(
    "btn-add-interp",
    atCap,
    `Maximum of ${MAX_INTERP} interpolation points reached`,
  );

  if (window.lucide) lucide.createIcons();
}

function updateInterpPoint(idx, val, inputEl) {
  let num = parseFloat(val);
  if (isNaN(num)) return;
  const clamped = clamp(num);
  if (clamped !== num && inputEl) {
    inputEl.value = clamped;
    inputEl.classList.remove("flash-clamp");
    void inputEl.offsetWidth;
    inputEl.classList.add("flash-clamp");
    inputEl.title = `Clamped to [${MIN_VAL}, ${MAX_VAL}]`;
  }
  interpX[idx] = clamped;
  Shiny.setInputValue("client_interp_x", interpX, { priority: "event" });
}

function addInterpPoint() {
  if (interpX.length < MAX_INTERP) {
    interpX.push(0);
    renderInterpPoints();
    Shiny.setInputValue("client_interp_x", interpX, { priority: "event" });
  }
}

function removeInterpPoint(idx) {
  if (interpX.length > 1) {
    interpX.splice(idx, 1);
    renderInterpPoints();
    Shiny.setInputValue("client_interp_x", interpX, { priority: "event" });
  }
}

function parseInterpClipboardData(clipboardText) {
  return clipboardText
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      const cells = line.includes("\t") ? line.split(/\t/) : line.split(/\s+/);
      return cells.map((cell) => cell.trim()).filter((cell) => cell !== "");
    })
    .filter((row) => row.length > 0);
}

function applyInterpClipboardRows(rows) {
  let hasChanges = false;
  const maxRows = Math.min(rows.length, MAX_INTERP);

  for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
    const values = rows[rowIndex];
    if (values.length === 0) continue;

    while (rowIndex >= interpX.length && interpX.length < MAX_INTERP) {
      interpX.push(0);
    }
    if (rowIndex >= interpX.length) break;

    const xNum = parseFloat(values[0]);
    if (!isNaN(xNum)) {
      interpX[rowIndex] = clamp(xNum);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    renderInterpPoints();
  }
  return hasChanges;
}

async function pasteInterpXFromClipboard() {
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.readText === "function"
  ) {
    try {
      const rawText = await navigator.clipboard.readText();
      if (rawText && rawText.trim()) {
        const rows = parseInterpClipboardData(rawText);
        if (rows.length > 0 && applyInterpClipboardRows(rows)) {
          return;
        }
      }
    } catch (err) {
      console.warn("Clipboard read failed, falling back to manual paste.", err);
    }
  }
  showInterpClipboardPasteModal();
}

function showInterpClipboardPasteModal() {
  if (document.getElementById("interp-clipboard-paste-modal")) return;

  const overlay = document.createElement("div");
  overlay.id = "interp-clipboard-paste-modal";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.35)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "16px";

  const card = document.createElement("div");
  card.style.width = "min(560px,100%)";
  card.style.background = "white";
  card.style.borderRadius = "16px";
  card.style.boxShadow = "0 20px 50px rgba(0,0,0,0.15)";
  card.style.padding = "20px";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "12px";

  const title = document.createElement("h2");
  title.textContent = "Paste Eval X Values";
  title.style.margin = "0";
  title.style.fontSize = "1rem";
  title.style.fontWeight = "700";

  const message = document.createElement("p");
  message.textContent =
    "Paste a single column of X values here, then click Apply. Only the first value from each row will be used.";
  message.style.margin = "0";
  message.style.fontSize = "0.9rem";
  message.style.color = "#4a5568";

  const textarea = document.createElement("textarea");
  textarea.style.width = "100%";
  textarea.style.minHeight = "160px";
  textarea.style.padding = "12px";
  textarea.style.fontSize = "0.95rem";
  textarea.style.lineHeight = "1.4";
  textarea.style.border = "1px solid #cbd5e1";
  textarea.style.borderRadius = "8px";
  textarea.style.resize = "vertical";
  textarea.placeholder = "Paste X values here...";
  textarea.autofocus = true;

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.flexWrap = "wrap";
  actions.style.gap = "10px";

  const applyButton = document.createElement("button");
  applyButton.type = "button";
  applyButton.textContent = "Apply";
  applyButton.style.padding = "10px 16px";
  applyButton.style.border = "none";
  applyButton.style.background = "#2563eb";
  applyButton.style.color = "white";
  applyButton.style.borderRadius = "8px";
  applyButton.style.cursor = "pointer";
  applyButton.onclick = function () {
    const rows = parseInterpClipboardData(textarea.value);
    if (rows.length === 0) {
      alert("No valid values found.");
      return;
    }
    if (!applyInterpClipboardRows(rows)) {
      alert("No numeric values found in the pasted data.");
      return;
    }
    closeInterpClipboardPasteModal();
  };

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  cancelButton.style.padding = "10px 16px";
  cancelButton.style.border = "1px solid #cbd5e1";
  cancelButton.style.background = "white";
  cancelButton.style.color = "#111827";
  cancelButton.style.borderRadius = "8px";
  cancelButton.style.cursor = "pointer";
  cancelButton.onclick = closeInterpClipboardPasteModal;

  actions.appendChild(applyButton);
  actions.appendChild(cancelButton);

  card.appendChild(title);
  card.appendChild(message);
  card.appendChild(textarea);
  card.appendChild(actions);
  overlay.appendChild(card);
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) closeInterpClipboardPasteModal();
  });

  document.body.appendChild(overlay);
  textarea.focus();
}

function closeInterpClipboardPasteModal() {
  const existing = document.getElementById("interp-clipboard-paste-modal");
  if (existing) {
    existing.remove();
  }
}

function parseInterpCsvText(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      if (line.includes(",")) {
        return line.split(",").map((cell) => cell.trim());
      }
      if (line.includes(";")) {
        return line.split(";").map((cell) => cell.trim());
      }
      if (line.includes("\t")) {
        return line.split(/\t/).map((cell) => cell.trim());
      }
      return line.split(/\s+/).map((cell) => cell.trim());
    });
}

function resetInterpCsvUploadInput() {
  const input = document.getElementById("csv-upload-interp-input");
  if (input) input.value = null;
}

function applyInterpCsvRows(rows) {
  const parsedValues = [];

  for (let i = 0; i < rows.length; i++) {
    const values = rows[i];
    if (values.length === 0) continue;
    const xNum = parseFloat(values[0]);
    if (isNaN(xNum)) continue;
    parsedValues.push(clamp(xNum));
    if (parsedValues.length >= MAX_INTERP) break;
  }

  if (parsedValues.length === 0) {
    return false;
  }

  interpX.length = 0;
  parsedValues.forEach((val) => interpX.push(val));
  renderInterpPoints();
  Shiny.setInputValue("client_interp_x", interpX, { priority: "event" });
  return true;
}

function handleInterpCsvUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const rows = parseInterpCsvText(text);
    if (rows.length === 0) {
      alert("No valid CSV rows found.");
      resetInterpCsvUploadInput();
      return;
    }

    if (!applyInterpCsvRows(rows)) {
      alert("No valid numeric values found in the uploaded CSV.");
      resetInterpCsvUploadInput();
      return;
    }

    resetInterpCsvUploadInput();
  };
  reader.onerror = function () {
    alert("Unable to read the selected file.");
    resetInterpCsvUploadInput();
  };
  reader.readAsText(file);
}
