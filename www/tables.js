function renderDataPoints() {
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
    html += `<tr>
              <td class="px-3 py-2 border-r text-center text-muted-foreground font-mono bg-muted/20">${i + 1}</td>
              <td class="p-0 border-r"><input type="number" class="input-cell" value="${p.x}" onchange="updateDataPoint(${i}, 'x', this.value)"></td>
              <td class="p-0 border-r"><input type="number" class="input-cell" value="${p.y}" onchange="updateDataPoint(${i}, 'y', this.value)"></td>
              <td class="p-2 text-center">
                <button class="text-muted-foreground hover:text-destructive w-full h-full flex justify-center items-center" onclick="removeDataPoint(${i})">
                  <i data-lucide="x" class="w-4 h-4"></i>
                </button>
              </td>
             </tr>`;
  });
  
  html += `</tbody></table></div>`;
  const el = document.getElementById('data-points-container');
  if (el) el.innerHTML = html;
  
  if (window.lucide) lucide.createIcons();
  Shiny.setInputValue('client_data_points', dataPoints, {priority: 'event'});
}

function updateDataPoint(idx, col, val) {
  let num = parseFloat(val);
  if (!isNaN(num)) {
    dataPoints[idx][col] = num;
    Shiny.setInputValue('client_data_points', dataPoints, {priority: 'event'});
  }
}

function addDataPoint() {
  dataPoints.push({x: 0, y: 0});
  renderDataPoints();
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
    const interpYArr = plotData && !plotData.error && plotData.interp_y ? (Array.isArray(plotData.interp_y) ? plotData.interp_y : [plotData.interp_y]) : [];
    if (interpYArr[i] !== undefined) {
      yVal = interpYArr[i].toFixed(4);
    }
    
    html += `<tr>
              <td class="px-3 py-2 border-r text-center text-muted-foreground font-mono bg-muted/20">${i + 1}</td>
              <td class="p-0 border-r bg-background"><input type="number" class="input-cell font-mono text-sm" value="${x}" onchange="updateInterpPoint(${i}, this.value)"></td>
              <td class="p-0 border-r bg-muted/20"><input type="text" readonly class="input-cell font-bold font-mono text-sm text-primary cursor-not-allowed" value="${yVal}"></td>
              <td class="p-2 text-center">
                <button class="text-muted-foreground hover:text-destructive w-full h-full flex justify-center items-center" onclick="removeInterpPoint(${i})">
                  <i data-lucide="x" class="w-4 h-4"></i>
                </button>
              </td>
             </tr>`;
  });
  
  html += `</tbody></table></div>`;
  let el = document.getElementById('interp-points-container');
  if (el) el.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

function updateInterpPoint(idx, val) {
  let num = parseFloat(val);
  if (!isNaN(num)) {
    interpX[idx] = num;
    Shiny.setInputValue('client_interp_x', interpX, {priority: 'event'});
  }
}

function addInterpPoint() {
  interpX.push(0);
  renderInterpPoints();
  Shiny.setInputValue('client_interp_x', interpX, {priority: 'event'});
}

function removeInterpPoint(idx) {
  if (interpX.length > 1) {
    interpX.splice(idx, 1);
    renderInterpPoints();
    Shiny.setInputValue('client_interp_x', interpX, {priority: 'event'});
  }
}
