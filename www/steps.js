// Step-by-step divided difference rendering
console.log('[Steps] steps.js script loaded and executing');

// Constants and state
const STEPS_COLLAPSE_THRESHOLD = 5; // Collapse middle orders if more than this

var _stepsData     = null;   // Latest data from Shiny
var _stepsExpanded = false;  // Show all collapsed orders
var _stepsMode     = 'dd';   // 'dd' or 'matrix'

// Simplified polynomial LaTeX
var _currentSimplifiedLatex = '';

// Number formatting

function roundVal(v) {
  return Number(Number(v).toFixed(4));
}

function fmtNum(v) {
  // Round to 4 decimals and remove trailing zeros
  return String(parseFloat(roundVal(v).toFixed(4)));
}

// Wrap negative numbers in parentheses
function fmtParen(v) {
  const r = roundVal(v);
  return r < 0 ? '(' + r + ')' : String(r);
}

// LaTeX labels

// Build f[x_i, ..., x_j]
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

// Step cards

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

// Divided difference steps

// Render order 0 values
function renderOrderZero(x, table) {
  const n = x.length;
  let items = '';
  for (let i = 0; i < n; i++) {
    items += '<div class="pl-2 py-1 overflow-x-auto overflow-y-hidden mj-container">' +
      '\\[' + ddLabel(i, i) + ' = f(x_{' + i + '}) = ' + fmtNum(table[i][0]) + '\\]' +
      '</div>';
  }
  return buildStepCard('Order 0', 'Function Values', items, 'book-open');
}

// Render one divided-difference order
function renderOrderK(ord, x, table, n) {
  const formulaBanner =
    '<div class="mb-3 rounded-md bg-muted/60 border px-4 py-2 overflow-x-auto overflow-y-hidden mj-container">' +
    '\\[f[x_i, \\ldots, x_j] = ' +
    '\\frac{f[x_{i+1}, \\ldots, x_j] - f[x_i, \\ldots, x_{j-1}]}{x_j - x_i}, ' +
    '\\quad i \\neq j\\]' +
    '</div>';

  let items = formulaBanner;

  for (let i = ord; i < n; i++) {
    const startPt = i - ord;
    const endPt   = i;

    const lhs       = ddLabel(startPt, endPt);
    const numLabel1 = ddLabel(startPt + 1, endPt);
    const numLabel2 = ddLabel(startPt, endPt - 1);

    const numVal1  = table[i][ord - 1];
    const numVal2  = table[i - 1][ord - 1];
    const denomVal1 = x[endPt];
    const denomVal2 = x[startPt];
    const result   = table[i][ord];

    const latex = lhs +
      ' = \\frac{' + numLabel1 + ' - ' + numLabel2 + '}{x_{' + endPt + '} - x_{' + startPt + '}}' +
      ' = \\frac{' + fmtParen(numVal1) + ' - ' + fmtParen(numVal2) + '}{' +
      fmtParen(denomVal1) + ' - ' + fmtParen(denomVal2) + '}' +
      ' = ' + fmtNum(result);

    items += '<div class="pl-2 py-1.5 overflow-x-auto overflow-y-hidden mj-container">' +
      '\\[' + latex + '\\]' +
      '</div>';
  }

  const subtitle = ord === 1 ? 'First Divided Differences'  :
                   ord === 2 ? 'Second Divided Differences' :
                   ord === 3 ? 'Third Divided Differences'  :
                   ordinalSuffix(ord) + ' Divided Differences';

  return buildStepCard('Order ' + ord, subtitle, items, 'git-branch');
}

// Convert to ordinal text
function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Render collapsed placeholder
function renderCollapsedOrders(fromOrd, toOrd) {
  const count = toOrd - fromOrd + 1;
  const content =
    '<div class="text-center text-muted-foreground py-4">' +
    '<p class="text-sm font-medium mb-1">... ' + count + ' intermediate order' +
    (count > 1 ? 's' : '') + ' hidden ...</p>' +
    '<p class="text-xs">Orders ' + fromOrd + ' through ' + toOrd + '</p>' +
    '</div>';

  return '<div id="steps-collapsed-placeholder" ' +
    'class="rounded-lg border border-dashed bg-muted/30 p-2 mb-3 cursor-pointer hover:bg-muted/50 transition-colors" ' +
    'onclick="expandCollapsedSteps()">' +
    content +
    '<div class="flex items-center justify-center gap-1 text-xs text-primary font-medium mt-1">' +
    '<i data-lucide="chevrons-down" class="w-3.5 h-3.5"></i> Expand all steps</div>' +
    '</div>';
}

// Simplified final polynomial renderer

// Expand Newton form into standard polynomial coefficients.
function expandNewtonPoly(x, coeffs) {
  const n = coeffs.length;
  // Coefficients of x^d
  const poly = new Array(n).fill(0);
  poly[0] = coeffs[0];

  // Running product term
  let prodPoly = new Array(n).fill(0);
  prodPoly[0] = 1;

  for (let k = 1; k < n; k++) {
    // Multiply by (x - x[k - 1])
    const newProd = new Array(n).fill(0);
    const xk = x[k - 1];
    for (let d = 0; d < n - 1; d++) {
      if (prodPoly[d] === 0) continue;
      newProd[d + 1] += prodPoly[d];
      newProd[d]     -= xk * prodPoly[d];
    }
    prodPoly = newProd;

    // Add coeffs[k] * prodPoly
    for (let d = 0; d < n; d++) {
      poly[d] += coeffs[k] * prodPoly[d];
    }
  }

  // Remove tiny values
  for (let d = 0; d < n; d++) {
    if (Math.abs(poly[d]) < 1e-9) poly[d] = 0;
  }
  return poly;
}

// Build simplified polynomial LaTeX.
function simplifiedLatex(x, coeffs) {
  const poly = expandNewtonPoly(x, coeffs);
  const n    = poly.length;

  const terms = [];
  for (let deg = 0; deg < n; deg++) {
    const val = poly[deg];
    if (Math.abs(val) < 1e-9) continue;

    const absVal    = Math.abs(val);
    const absStr    = parseFloat(absVal.toFixed(4)).toString();
    const isOne     = Math.abs(absVal - 1) < 1e-9;
    const sign      = val >= 0 ? '+' : '-';

    let term;
    if (deg === 0) {
      term = absStr;
    } else if (deg === 1) {
      term = isOne ? 'x' : absStr + 'x';
    } else {
      term = isOne ? 'x^{' + deg + '}' : absStr + 'x^{' + deg + '}';
    }
    terms.push({ sign, term });
  }

  if (terms.length === 0) return 'P(x) = 0';

  let latex = 'P(x) = ';
  terms.forEach((t, i) => {
    if (i === 0) {
      latex += (t.sign === '-' ? '-' : '') + t.term;
    } else {
      latex += ' ' + t.sign + ' ' + t.term;
    }
  });
  return latex;
}

// Render the final polynomial card.
function renderFinalPolynomial(x, coeffs) {
  const n = coeffs.length;
  if (n === 0) return '';

  // Build Newton form
  let newtonTerms = fmtNum(coeffs[0]);
  for (let k = 1; k < n; k++) {
    if (Math.abs(coeffs[k]) < 1e-10) continue;
    const val     = coeffs[k];
    const sign    = val >= 0 ? ' + ' : ' - ';
    const absVal  = Math.abs(val);
    const isOne   = Math.abs(absVal - 1) < 1e-10;
    const cStr    = isOne ? '' : fmtNum(absVal);

    const factors = [];
    for (let j = 0; j < k; j++) {
      const xj = x[j];
      if (Math.abs(xj) < 1e-10)     factors.push('x');
      else if (xj > 0)               factors.push('(x - ' + fmtNum(xj) + ')');
      else                           factors.push('(x + ' + fmtNum(Math.abs(xj)) + ')');
    }
    newtonTerms += sign + cStr + factors.join('');
  }

  // Save simplified form
  const simpLatex = simplifiedLatex(x, coeffs);
  _currentSimplifiedLatex = simpLatex;

  const content =
    // Newton form
    '<div class="mb-2">' +
    '<p class="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Newton Form</p>' +
    '<div class="pl-2 py-2 overflow-x-auto overflow-y-hidden mj-container">' +
    '\\[P(x) = ' + newtonTerms + '\\]' +
    '</div>' +
    '</div>' +
    // Simplified form
    '<div class="rounded-md bg-primary/5 border border-primary/20 p-3">' +
    '<p class="text-xs font-medium text-primary mb-1 uppercase tracking-wide">Simplified Form</p>' +
    '<div class="pl-2 py-2 overflow-x-auto overflow-y-hidden mj-container">' +
    '\\[' + simpLatex + '\\]' +
    '</div>' +
    '</div>';

  return buildStepCard('Result', 'Newton Interpolating Polynomial', content, 'sigma');
}

// Summary table

function renderSummaryTable(x, table) {
  const container = document.getElementById('summary-table-container');
  if (!container) return;

  const n       = x.length;
  const showAll = _stepsExpanded || (n <= 5);

  let headerHtml   = '<th class="px-3 py-2 border-r font-semibold text-center w-16">X</th>';
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
      headerHtml += '<th class="px-3 py-2 border-r font-semibold text-center">' +
        (col === 0 ? 'f(x)' : 'Order ' + col) + '</th>';
    }
  });

  let bodyHtml = '';
  for (let i = 0; i < n; i++) {
    bodyHtml += '<tr class="hover:bg-muted/30 transition-colors">';
    bodyHtml += '<td class="px-3 py-2 border-r text-center font-mono text-muted-foreground bg-muted/10">' +
      fmtNum(x[i]) + '</td>';

    columnsToShow.forEach(col => {
      if (col === '...') {
        bodyHtml += '<td class="px-3 py-2 border-r text-center text-muted-foreground/30 italic">...</td>';
      } else {
        const val      = table[i][col];
        const valStr   = val != null ? fmtNum(val) : '-';
        const isDiag   = (i === col);
        const cellCls  = isDiag ? 'text-primary font-bold' : '';
        bodyHtml += '<td class="px-3 py-2 border-r text-center font-mono ' + cellCls + '">' + valStr + '</td>';
      }
    });
    bodyHtml += '</tr>';
  }

  let tableHtml =
    '<div class="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">' +
    '<div class="overflow-x-auto">' +
    '<table class="w-full text-sm text-left border-collapse">' +
    '<thead class="bg-muted/50 text-muted-foreground text-xs uppercase border-b">' +
    '<tr>' + headerHtml + '</tr>' +
    '</thead>' +
    '<tbody class="divide-y">' + bodyHtml + '</tbody>' +
    '</table></div></div>';

  if (!showAll) {
    tableHtml +=
      '<div class="flex justify-center mt-4">' +
      '<button onclick="expandCollapsedSteps()" class="text-xs font-medium text-primary hover:underline flex items-center gap-1">' +
      '<i data-lucide="maximize-2" class="w-3 h-3"></i> Expand full table' +
      '</button></div>';
  }

  container.innerHTML = tableHtml;
  if (window.lucide) lucide.createIcons();
}

// Matrix form

// Render the matrix system L a = y.
function renderMatrixForm(data) {
  const container = document.getElementById('matrix-container');
  if (!container) return;

  if (!data || !data.pts_x || !data.dd_coeffs) {
    container.innerHTML =
      '<div class="text-center text-muted-foreground p-8">' +
      '<h3 class="text-lg font-medium mb-2">Awaiting calculation…</h3>' +
      '<p>Input data points and calculate to see the matrix form.</p>' +
      '</div>';
    return;
  }

  const x      = ensureArray(data.pts_x);
  const a      = ensureArray(data.dd_coeffs);  // Newton coefficients = diag(DD table)
  const y      = ensureArray(data.pts_y || []);
  const n      = x.length;

  // Build L matrix
  const L = [];
  for (let i = 0; i < n; i++) {
    L.push(new Array(n).fill(0));
    for (let j = 0; j <= i; j++) {
      if (j === 0) {
        L[i][j] = 1;
      } else {
        let prod = 1;
        for (let k = 0; k < j; k++) prod *= (x[i] - x[k]);
        L[i][j] = prod;
      }
    }
  }

  // Explanation card
  const explainHtml =
    '<div class="rounded-lg border bg-card p-4 mb-3 shadow-sm">' +
    '<div class="flex items-center gap-2 mb-3">' +
    '<i data-lucide="info" class="w-4 h-4 text-primary shrink-0"></i>' +
    '<h4 class="font-semibold text-sm text-foreground">Matrix Form' +
    '<span class="font-normal text-muted-foreground ml-1.5">— Lower Triangular System</span></h4>' +
    '</div>' +
    '<div class="text-sm text-muted-foreground space-y-3">' +
    '<p>The Newton interpolating polynomial can be written as a linear system ' +
    '\\(L\\,\\mathbf{a} = \\mathbf{y}\\), where:</p>' +
    '<ul class="list-disc pl-5 space-y-1 text-xs">' +
    '<li><strong class="text-foreground">\\(L\\)</strong> — lower-triangular matrix with ' +
    '\\(L_{ij} = \\prod_{k=0}^{j-1}(x_i - x_k)\\) for \\(j \\le i\\), else 0</li>' +
    '<li><strong class="text-foreground">\\(\\mathbf{a}\\)</strong> — vector of Newton ' +
    'coefficients (the diagonal of the divided-difference table)</li>' +
    '<li><strong class="text-foreground">\\(\\mathbf{y}\\)</strong> — vector of function ' +
    'values \\(f(x_i)\\)</li>' +
    '</ul>' +
    '<div class="rounded-md bg-muted p-3 overflow-x-auto mj-container mt-2">' +
    '\\[L_{ij} = \\prod_{k=0}^{j-1}(x_i - x_k), \\quad j \\le i; \\quad L_{ij} = 0, \\quad j > i\\]' +
    '</div>' +
    '<p class="text-xs">Because \\(L\\) is lower-triangular, forward substitution solves ' +
    'for \\(\\mathbf{a}\\) in \\(O(n^2)\\) — the same cost as building the divided-difference table.</p>' +
    '</div></div>';

  // Limit display to 6 × 6
  const displayN = Math.min(n, 6);
  const truncated = n > 6;

  // Build L rows
  const lRows = [];
  for (let i = 0; i < displayN; i++) {
    const cells = [];
    for (let j = 0; j < displayN; j++) {
      const val = L[i][j];
      cells.push(Math.abs(val) < 1e-9 ? '0' : fmtNum(val));
    }
    if (truncated) cells.push('\\cdots');
    lRows.push(cells.join(' & '));
  }
  if (truncated) {
    const dots = new Array(displayN).fill('\\vdots');
    dots.push('\\ddots');
    lRows.push(dots.join(' & '));
  }

   // Build vectors
  const aVec = a.slice(0, displayN).map((v, i) => 'a_{' + i + '} = ' + fmtNum(v));
  if (truncated) aVec.push('\\vdots');

  const yVec = y.slice(0, displayN).map((v, i) => 'y_{' + i + '} = ' + fmtNum(v));
  if (truncated) yVec.push('\\vdots');

  // Build LaTeX
  const lTex = '\\begin{bmatrix}' + lRows.join(' \\\\ ') + '\\end{bmatrix}';
  const aTex = '\\begin{bmatrix}' + aVec.join(' \\\\ ') + '\\end{bmatrix}';
  const yTex = '\\begin{bmatrix}' + yVec.join(' \\\\ ') + '\\end{bmatrix}';

  const systemLatex = lTex + ' ' + aTex + ' = ' + yTex;

  const matrixCard =
    '<div class="rounded-lg border bg-card p-4 mb-3 shadow-sm">' +
    '<div class="flex items-center gap-2 mb-3">' +
    '<i data-lucide="grid" class="w-4 h-4 text-primary shrink-0"></i>' +
    '<h4 class="font-semibold text-sm text-foreground">System \\(L\\,\\mathbf{a} = \\mathbf{y}\\)' +
    '<span class="font-normal text-muted-foreground ml-1.5">— Populated Values</span></h4>' +
    '</div>' +
    (truncated
      ? '<p class="text-xs text-muted-foreground mb-2">Showing first 6 × 6 block (full system is ' + n + ' × ' + n + ').</p>'
      : '') +
    '<div class="overflow-x-auto mj-container">' +
    '\\[' + systemLatex + '\\]' +
    '</div>' +
    '</div>';

  // Verification card
  let verifyItems = '';
  for (let i = 0; i < n; i++) {
    // Compute row result
    let dot = 0;
    for (let j = 0; j <= i; j++) dot += L[i][j] * a[j];

    let rowTerms = '';
    for (let j = 0; j <= i; j++) {
      const lval = fmtNum(L[i][j]);
      const aval = fmtNum(a[j]);
      rowTerms += (j > 0 ? ' + ' : '') + lval + ' \\cdot ' + aval;
    }
    const check = Math.abs(dot - (y[i] || 0)) < 1e-6
      ? '<span class="text-green-600 font-mono text-xs ml-2">✓</span>'
      : '<span class="text-red-500 font-mono text-xs ml-2">✗</span>';

    verifyItems +=
      '<div class="pl-2 py-1.5 overflow-x-auto overflow-y-hidden mj-container flex items-center">' +
      '\\[' + 'L_{' + i + ',\\bullet} \\cdot \\mathbf{a} = ' + rowTerms + ' = ' + fmtNum(dot) + '\\]' +
      check +
      '</div>';
  }

  const verifyCard = buildStepCard(
    'Verification',
    'Row-by-Row Check',
    verifyItems,
    'check-circle'
  );

  container.innerHTML = explainHtml + matrixCard + verifyCard;
  if (window.lucide) lucide.createIcons();

  if (window.MathJax) {
    requestAnimationFrame(() => {
      MathJax.typesetPromise([container]).catch(err =>
        console.error('[Steps] MathJax matrix typeset error:', err)
      );
    });
  }
}

// Steps mode toggle

// Switch between divided differences and matrix form.
function switchStepsMode(mode) {
  _stepsMode = mode;

  const ddPane     = document.getElementById('steps-dd-pane');
  const matrixPane = document.getElementById('steps-matrix-pane');
  const btnDD      = document.getElementById('steps-mode-dd');
  const btnMatrix  = document.getElementById('steps-mode-matrix');

  if (!ddPane || !matrixPane) return;

  // Show selected pane
  if (mode === 'dd') {
    ddPane.classList.remove('hidden');
    matrixPane.classList.add('hidden');
  } else {
    ddPane.classList.add('hidden');
    matrixPane.classList.remove('hidden');
    // Render matrix form if needed
    if (_stepsData) renderMatrixForm(_stepsData);
  }

  // Reset button styles
  [btnDD, btnMatrix].forEach(btn => {
    if (!btn) return;
    btn.classList.remove('bg-background', 'text-foreground', 'shadow-sm', 'active');
    btn.classList.add('text-muted-foreground');
  });

  // Highlight active button
  const activeBtn = mode === 'dd' ? btnDD : btnMatrix;
  if (activeBtn) {
    activeBtn.classList.remove('text-muted-foreground');
    activeBtn.classList.add('bg-background', 'text-foreground', 'shadow-sm', 'active');
  }
}

// Copy to clipboard

// Copy the simplified polynomial.
function copyEquationToClipboard(context) {
  const latex = _currentSimplifiedLatex;
  if (!latex) {
    showCopyToast('Nothing to copy yet.', true);
    return;
  }

  // Wrap in display math
  const textToCopy = '\\[' + latex + '\\]';

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(textToCopy)
      .then(() => showCopyToast('LaTeX copied to clipboard!'))
      .catch(() => fallbackCopy(textToCopy));
  } else {
    fallbackCopy(textToCopy);
  }
}

// Fallback copy method
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity  = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    showCopyToast('LaTeX copied to clipboard!');
  } catch (e) {
    showCopyToast('Copy failed — please copy manually.', true);
  }
  document.body.removeChild(ta);
}

// Show copy notification
function showCopyToast(msg, isError) {
  const toast    = document.getElementById('copy-toast');
  const toastMsg = document.getElementById('copy-toast-msg');
  if (!toast) return;

  toastMsg.textContent = msg || 'Copied!';
  toast.style.backgroundColor = isError
    ? 'hsl(var(--destructive))'
    : 'hsl(var(--foreground))';
  toast.classList.remove('hidden');
  toast.classList.add('flex');

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.add('hidden');
    toast.classList.remove('flex');
  }, 2200);
}

// Expand collapsed steps

function expandCollapsedSteps() {
  _stepsExpanded = true;
  if (_stepsData) renderStepsFromData(_stepsData);
}

// Main renderer

// Render all steps from server data.
function renderStepsFromData(data) {
  console.log('[Steps] renderStepsFromData called');
  _stepsData = data;

  const container = document.getElementById('steps-container');
  if (!container) {
    console.error('[Steps] steps-container not found in DOM!');
    return;
  }

  if (data.error || !data.dd_table) {
    container.innerHTML =
      '<div class="text-center text-muted-foreground p-8">' +
      '<h3 class="text-lg font-medium mb-2">Awaiting calculation…</h3>' +
      '<p>Input data points and calculate to see steps.</p>' +
      '</div>';
    return;
  }

  const x      = ensureArray(data.pts_x);
  const coeffs = ensureArray(data.dd_coeffs);
  const rawTable = data.dd_table;
  const n      = x.length;
  const maxOrder = n - 1;

  console.log('[Steps] Processing', n, 'points, max order', maxOrder);

  // Convert table values to numbers
  const table = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    const src = rawTable[i];
    for (let j = 0; j < n; j++) {
      row.push(src[j] != null ? Number(src[j]) : null);
    }
    table.push(row);
  }

  // Prepare LaTeX for clipboard
  _currentSimplifiedLatex = simplifiedLatex(x, coeffs);

  // Build HTML
  let html = '';
  try {
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
    html += '<div class="mt-8 pt-4 border-t text-center text-[10px] text-muted-foreground italic">' +
            'Walkthrough generated successfully.</div>';
  } catch (e) {
    console.error('[Steps] Error building steps HTML:', e);
  }

  container.innerHTML = html;
  console.log('[Steps] DOM updated');

  // Refresh matrix form if active
  if (_stepsMode === 'matrix') renderMatrixForm(data);

  // Render summary table
  renderSummaryTable(x, table);

  // Render MathJax
  if (window.MathJax) {
    requestAnimationFrame(() => {
      MathJax.typesetPromise([container]).then(() => {
        console.log('[Steps] MathJax typeset complete');
      }).catch(err => console.error('[Steps] MathJax typeset error:', err));
    });
  }

  if (window.lucide) lucide.createIcons();
}

// Shiny handlers

function initStepsHandlers() {
  if (window.Shiny) {
    console.log('[Steps] Registering update_steps_data handler');

    Shiny.addCustomMessageHandler('update_steps_data', function(msg) {
      _stepsExpanded = false;
      renderStepsFromData(msg);
    });

    // Update matrix form
    Shiny.addCustomMessageHandler('update_matrix_data', function(msg) {
      if (_stepsMode === 'matrix') renderMatrixForm(_stepsData);
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