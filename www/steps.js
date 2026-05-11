// steps.js — Verbose step-by-step divided difference rendering (client-side)
console.log('[Steps] steps.js script loaded and executing');

const STEPS_COLLAPSE_THRESHOLD = 5; // collapse middle orders if > this many

function roundVal(v) {
  return Number(Number(v).toFixed(3));
}

function fmtNum(v) {
  return String(roundVal(v));
}

/** Wrap negative numbers in parens for clean subtraction display */
function fmtParen(v) {
  const r = roundVal(v);
  return r < 0 ? '(' + r + ')' : String(r);
}

/**
 * Build the f[x_a, ..., x_b] subscript label in LaTeX.
 * Uses ellipsis when span > 4.
 */
function ddLabel(startIdx, endIdx) {
  const count = endIdx - startIdx + 1;
  if (count === 1) return 'f[x_{' + startIdx + '}]';
  const parts = [];
  if (count <= 4) {
    for (let k = startIdx; k <= endIdx; k++) parts.push('x_{' + k + '}');
  } else {
    parts.push('x_{' + startIdx + '}');
    parts.push('x_{' + (startIdx + 1) + '}');
    parts.push('\\ldots');
    parts.push('x_{' + endIdx + '}');
  }
  return 'f[' + parts.join(', ') + ']';
}

/**
 * Render order 0 — just the function values.
 */
function renderOrderZero(x, table) {
  const n = x.length;
  let items = '';
  for (let i = 0; i < n; i++) {
    items += '<div class="pl-2 py-1">' +
      '\\[' + ddLabel(i, i) + ' = ' + fmtNum(table[i][0]) + '\\]' +
      '</div>';
  }
  return buildStepCard('Order 0', 'Function Values', items, 'book-open');
}

/**
 * Render a single order k (k >= 1) with full formula + values plugged in.
 */
function renderOrderK(ord, x, table, n) {
  let items = '';
  for (let i = ord; i < n; i++) {
    const startPt = i - ord; // leftmost point index
    const endPt = i;         // rightmost point index

    // Symbolic formula
    const lhs = ddLabel(startPt, endPt);
    const numLabel1 = ddLabel(startPt + 1, endPt);
    const numLabel2 = ddLabel(startPt, endPt - 1);

    // Actual values
    const numVal1 = table[i][ord - 1];     // f[x_{start+1},...,x_end]
    const numVal2 = table[i - 1][ord - 1]; // f[x_start,...,x_{end-1}]
    const denomVal1 = x[endPt];
    const denomVal2 = x[startPt];
    const result = table[i][ord];

    // Build LaTeX: formula → plug values → result
    const latex = lhs +
      ' = \\frac{' + numLabel1 + ' - ' + numLabel2 + '}{x_{' + endPt + '} - x_{' + startPt + '}}' +
      ' = \\frac{' + fmtParen(numVal1) + ' - ' + fmtParen(numVal2) + '}{' + fmtParen(denomVal1) + ' - ' + fmtParen(denomVal2) + '}' +
      ' = ' + fmtNum(result);

    items += '<div class="pl-2 py-1.5 overflow-x-auto overflow-y-hidden mj-container">' +
      '\\[' + latex + '\\]' +
      '</div>';
  }

  const subtitle = ord === 1 ? 'First Divided Differences' :
                   ord === 2 ? 'Second Divided Differences' :
                   ord === 3 ? 'Third Divided Differences' :
                   ordinalSuffix(ord) + ' Divided Differences';

  return buildStepCard('Order ' + ord, subtitle, items, 'git-branch');
}

function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Render the final Newton polynomial assembly.
 */
function renderFinalPolynomial(x, coeffs) {
  const n = coeffs.length;
  if (n === 0) return '';

  // Build P(x) = c0 + c1(x - x0) + c2(x - x0)(x - x1) + ...
  let terms = fmtNum(coeffs[0]);
  for (let k = 1; k < n; k++) {
    if (Math.abs(coeffs[k]) < 1e-10) continue;
    const coeff = coeffs[k];
    const sign = coeff >= 0 ? ' + ' : ' - ';
    const absCoeff = Math.abs(coeff);
    
    // Format coefficient: omit if 1, since there's always at least one factor for k >= 1
    let coeffStr = (Math.abs(absCoeff - 1) < 1e-10) ? '' : fmtNum(absCoeff);
    
    const factors = [];
    for (let j = 0; j < k; j++) {
      const xj = x[j];
      if (Math.abs(xj) < 1e-10) {
        factors.push('x');
      } else if (xj > 0) {
        factors.push('(x - ' + fmtNum(xj) + ')');
      } else {
        factors.push('(x + ' + fmtNum(Math.abs(xj)) + ')');
      }
    }
    terms += sign + coeffStr + factors.join('');
  }

  const latex = 'P(x) = ' + terms;
  const content = '<div class="pl-2 py-2 overflow-x-auto overflow-y-hidden mj-container">' +
    '\\[' + latex + '\\]' +
    '</div>';

  return buildStepCard('Result', 'Newton Interpolating Polynomial', content, 'sigma');
}

/**
 * Render collapsed placeholder for hidden middle orders.
 */
function renderCollapsedOrders(fromOrd, toOrd) {
  const count = toOrd - fromOrd + 1;
  const content = '<div class="text-center text-muted-foreground py-4">' +
    '<p class="text-sm font-medium mb-1">... ' + count + ' intermediate order' + (count > 1 ? 's' : '') + ' hidden ...</p>' +
    '<p class="text-xs">Orders ' + fromOrd + ' through ' + toOrd + '</p>' +
    '</div>';
  return '<div id="steps-collapsed-placeholder" class="rounded-lg border border-dashed bg-muted/30 p-2 mb-3 cursor-pointer hover:bg-muted/50 transition-colors" onclick="expandCollapsedSteps()">' +
    content +
    '<div class="flex items-center justify-center gap-1 text-xs text-primary font-medium mt-1">' +
    '<i data-lucide="chevrons-down" class="w-3.5 h-3.5"></i> Expand all steps</div>' +
    '</div>';
}

/**
 * Wrapper for a step card.
 */
function buildStepCard(title, subtitle, innerHtml, icon) {
  return '<div class="rounded-lg border bg-card p-4 mb-3 shadow-sm">' +
    '<div class="flex items-center gap-2 mb-3">' +
    '<i data-lucide="' + icon + '" class="w-4 h-4 text-primary shrink-0"></i>' +
    '<h4 class="font-semibold text-sm text-foreground">' + title +
    '<span class="font-normal text-muted-foreground ml-1.5">— ' + subtitle + '</span></h4>' +
    '</div>' +
    '<div class="space-y-1">' + innerHtml + '</div>' +
    '</div>';
}

function renderSummaryTable(x, table) {
  const container = document.getElementById('summary-table-container');
  if (!container) return;

  const n = x.length;
  const numCols = n; // Order 0...n-1
  const showAll = _stepsExpanded || (numCols <= 5);
  
  let headerHtml = '<th class="px-3 py-2 border-r font-semibold text-center w-16">X</th>';
  let columnsToShow = [];
  
  if (showAll) {
    for (let j = 0; j < n; j++) columnsToShow.push(j);
  } else {
    columnsToShow = [0, 1, '...', n - 2, n - 1];
  }

  columnsToShow.forEach(col => {
    if (col === '...') {
      headerHtml += '<th class="px-3 py-2 border-r font-semibold text-center text-muted-foreground italic w-12">...</th>';
    } else {
      headerHtml += '<th class="px-3 py-2 border-r font-semibold text-center">' + (col === 0 ? 'f(x)' : 'Order ' + col) + '</th>';
    }
  });

  let bodyHtml = '';
  for (let i = 0; i < n; i++) {
    bodyHtml += '<tr class="hover:bg-muted/30 transition-colors">';
    bodyHtml += '<td class="px-3 py-2 border-r text-center font-mono text-muted-foreground bg-muted/10">' + fmtNum(x[i]) + '</td>';
    
    columnsToShow.forEach(col => {
      if (col === '...') {
        bodyHtml += '<td class="px-3 py-2 border-r text-center text-muted-foreground/30 italic">...</td>';
      } else {
        const val = table[i][col];
        const valStr = val != null ? fmtNum(val) : '-';
        const isDiagonal = (i === col);
        const cellClass = isDiagonal ? 'text-primary font-bold' : '';
        bodyHtml += '<td class="px-3 py-2 border-r text-center font-mono ' + cellClass + '">' + valStr + '</td>';
      }
    });
    bodyHtml += '</tr>';
  }

  let tableHtml = '<div class="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">' +
    '<div class="overflow-x-auto">' +
    '<table class="w-full text-sm text-left border-collapse">' +
    '<thead class="bg-muted/50 text-muted-foreground text-xs uppercase border-b">' +
    '<tr>' + headerHtml + '</tr>' +
    '</thead>' +
    '<tbody class="divide-y">' + bodyHtml + '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>';
  
  if (!showAll) {
    tableHtml += '<div class="flex justify-center mt-4">' +
      '<button onclick="expandCollapsedSteps()" class="text-xs font-medium text-primary hover:underline flex items-center gap-1">' +
      '<i data-lucide="maximize-2" class="w-3 h-3"></i> Expand full table' +
      '</button>' +
      '</div>';
  }

  container.innerHTML = tableHtml;
  if (window.lucide) lucide.createIcons();
}

// --- State for expand/collapse ---
var _stepsData = null;
var _stepsExpanded = false;

function expandCollapsedSteps() {
  _stepsExpanded = true;
  if (_stepsData) renderStepsFromData(_stepsData);
}

/**
 * Main entry: receives data from R and renders the full step-by-step.
 */
function renderStepsFromData(data) {
  console.log('[Steps] renderStepsFromData called with:', data);
  _stepsData = data;
  
  // No redundant summary table call here anymore
  
  const container = document.getElementById('steps-container');
  if (!container) {
    console.error('[Steps] steps-container not found in DOM!');
    return;
  }

  if (data.error || !data.dd_table) {
    console.warn('[Steps] Data error or missing dd_table');
    container.innerHTML =
      '<div class="text-center text-muted-foreground p-8">' +
      '<h3 class="text-lg font-medium mb-2">Awaiting calculation…</h3>' +
      '<p>Input data points and calculate to see steps.</p>' +
      '</div>';
    return;
  }

  const x = ensureArray(data.pts_x);
  const coeffs = ensureArray(data.dd_coeffs);
  const rawTable = data.dd_table;
  const n = x.length;
  const maxOrder = n - 1;

  console.log(`[Steps] Processing ${n} points, max order ${maxOrder}`);

  // Normalise table again for the steps logic (or just reuse from above if we refactored)
  const table = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    const src = rawTable[i];
    for (let j = 0; j < n; j++) {
      row.push(src[j] != null ? Number(src[j]) : null);
    }
    table.push(row);
  }

  let html = '';
  try {
    console.log('[Steps] Building HTML for orders...');
    html += renderOrderZero(x, table);
    if (maxOrder <= STEPS_COLLAPSE_THRESHOLD || _stepsExpanded) {
      for (let ord = 1; ord <= maxOrder; ord++) {
        html += renderOrderK(ord, x, table, n);
      }
    } else {
      html += renderOrderK(1, x, table, n);
      html += renderOrderK(2, x, table, n);
      html += renderCollapsedOrders(3, maxOrder - 2);
      html += renderOrderK(maxOrder - 1, x, table, n);
      html += renderOrderK(maxOrder, x, table, n);
    }
    html += renderFinalPolynomial(x, coeffs);
    html += '<div class="mt-8 pt-4 border-t text-center text-[10px] text-muted-foreground italic">Walkthrough generated successfully.</div>';
    console.log('[Steps] HTML build complete, length:', html.length);
  } catch (e) {
    console.error('[Steps] Error building steps HTML:', e);
  }

  container.innerHTML = html;
  console.log('[Steps] DOM updated with HTML cards');

  // Render Summary Table (TODO 4)
  console.log('[Steps] Rendering summary table...');
  renderSummaryTable(x, table);

  // Typeset MathJax asynchronously after paint
  if (window.MathJax) {
    console.log('[Steps] Scheduling MathJax typeset...');
    requestAnimationFrame(() => {
      MathJax.typesetPromise([container]).then(() => {
        console.log('[Steps] MathJax typeset complete');
      }).catch(function(err) {
        console.error('[Steps] MathJax typeset error:', err);
      });
    });
  }
  if (window.lucide) lucide.createIcons();
}

function initStepsHandlers() {
  if (window.Shiny) {
    console.log('[Steps] Registering update_steps_data handler');
    Shiny.addCustomMessageHandler('update_steps_data', function(msg) {
      _stepsExpanded = false;
      renderStepsFromData(msg);
    });
  } else {
    console.warn('[Steps] Shiny not found, retrying...');
    setTimeout(initStepsHandlers, 100);
  }
}

$(document).on('shiny:connected', function() {
  console.log('[Steps] Shiny connected, initializing handlers');
  initStepsHandlers();
});

