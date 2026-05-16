// steps.js — Step-by-step divided difference rendering

const STEPS_COLLAPSE_THRESHOLD = 5;

var _stepsData              = null;
var _stepsExpanded          = false;
var _currentSimplifiedLatex = '';

// ── Formatting ────────────────────────────────────────────────────────────────

function roundVal(v) { return Number(Number(v).toFixed(4)); }

// Guard: exact zero must never render as "0..." due to floating-point noise
function fmtNum(v) {
  if (Math.abs(v) < 1e-10) return '0';
  return String(parseFloat(roundVal(v).toFixed(4)));
}

function fmtParen(v) {
  const r = roundVal(v);
  return r < 0 ? '(' + r + ')' : String(r);
}

// ── Label helpers ─────────────────────────────────────────────────────────────

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

function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Card builder ──────────────────────────────────────────────────────────────

function buildStepCard(title, subtitle, innerHtml, icon) {
  return '<div class="rounded-lg border bg-card p-4 mb-3 shadow-sm">' +
    '<div class="flex items-center gap-2 mb-3">' +
    '<i data-lucide="' + icon + '" class="w-4 h-4 text-primary shrink-0"></i>' +
    '<h4 class="font-semibold text-sm text-foreground">' + title +
    '<span class="font-normal text-muted-foreground ml-1.5">— ' + subtitle + '</span></h4>' +
    '</div><div class="space-y-1">' + innerHtml + '</div></div>';
}

// ── DD step renderers ─────────────────────────────────────────────────────────

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

function renderOrderK(ord, x, table, n) {
  // Recursive formula reminder with i ≠ j condition
  const banner =
    '<div class="mb-3 rounded-md bg-muted/60 border px-4 py-2 overflow-x-auto overflow-y-hidden mj-container">' +
    '\\[f[x_i,\\ldots,x_j]=\\frac{f[x_{i+1},\\ldots,x_j]-f[x_i,\\ldots,x_{j-1}]}{x_j-x_i},\\quad i\\neq j\\]' +
    '</div>';

  let items = banner;
  for (let i = ord; i < n; i++) {
    const s = i - ord, e = i;
    const latex = ddLabel(s, e) +
      ' = \\frac{' + ddLabel(s + 1, e) + ' - ' + ddLabel(s, e - 1) + '}{x_{' + e + '} - x_{' + s + '}}' +
      ' = \\frac{' + fmtParen(table[i][ord - 1]) + ' - ' + fmtParen(table[i - 1][ord - 1]) + '}{' +
      fmtParen(x[e]) + ' - ' + fmtParen(x[s]) + '}' +
      ' = ' + fmtNum(table[i][ord]);
    items += '<div class="pl-2 py-1.5 overflow-x-auto overflow-y-hidden mj-container">\\[' + latex + '\\]</div>';
  }

  const subtitle = ord === 1 ? 'First Divided Differences'  :
                   ord === 2 ? 'Second Divided Differences' :
                   ord === 3 ? 'Third Divided Differences'  :
                   ordinalSuffix(ord) + ' Divided Differences';
  return buildStepCard('Order ' + ord, subtitle, items, 'git-branch');
}

function renderCollapsedOrders(fromOrd, toOrd) {
  const count = toOrd - fromOrd + 1;
  return '<div id="steps-collapsed-placeholder" ' +
    'class="rounded-lg border border-dashed bg-muted/30 p-2 mb-3 cursor-pointer hover:bg-muted/50 transition-colors" ' +
    'onclick="expandCollapsedSteps()">' +
    '<div class="text-center text-muted-foreground py-4">' +
    '<p class="text-sm font-medium mb-1">... ' + count + ' intermediate order' + (count > 1 ? 's' : '') + ' hidden ...</p>' +
    '<p class="text-xs">Orders ' + fromOrd + ' through ' + toOrd + '</p></div>' +
    '<div class="flex items-center justify-center gap-1 text-xs text-primary font-medium mt-1">' +
    '<i data-lucide="chevrons-down" class="w-3.5 h-3.5"></i> Expand all steps</div></div>';
}

// ── Polynomial expansion ──────────────────────────────────────────────────────

// Multiply out Newton basis terms into flat coefficient array (index = degree)
function expandNewtonPoly(x, coeffs) {
  const n = coeffs.length;
  const poly = new Array(n).fill(0);
  poly[0] = coeffs[0];
  let prod = new Array(n).fill(0);
  prod[0] = 1;

  for (let k = 1; k < n; k++) {
    const next = new Array(n).fill(0);
    const xk = x[k - 1];
    for (let d = 0; d < n - 1; d++) {
      if (prod[d] === 0) continue;
      next[d + 1] += prod[d];
      next[d]     -= xk * prod[d];
    }
    prod = next;
    for (let d = 0; d < n; d++) poly[d] += coeffs[k] * prod[d];
  }

  for (let d = 0; d < n; d++) if (Math.abs(poly[d]) < 1e-9) poly[d] = 0;
  return poly;
}

// Build simplified LaTeX using actual degree label P_{k}(x)
function simplifiedLatex(x, coeffs) {
  const degree = coeffs.length - 1;
  const label  = 'P_{' + degree + '}(x)';
  const poly   = expandNewtonPoly(x, coeffs);

  const terms = [];
  for (let d = 0; d < poly.length; d++) {
    const val = poly[d];
    if (Math.abs(val) < 1e-9) continue;
    const abs    = Math.abs(val);
    const absStr = parseFloat(abs.toFixed(4)).toString();
    const isOne  = Math.abs(abs - 1) < 1e-9;
    let term;
    if (d === 0)      term = absStr;
    else if (d === 1) term = isOne ? 'x' : absStr + 'x';
    else              term = isOne ? 'x^{' + d + '}' : absStr + 'x^{' + d + '}';
    terms.push({ sign: val >= 0 ? '+' : '-', term });
  }

  if (terms.length === 0) return label + ' = 0';

  let latex = label + ' = ';
  terms.forEach((t, i) => {
    if (i === 0) latex += (t.sign === '-' ? '-' : '') + t.term;
    else         latex += ' ' + t.sign + ' ' + t.term;
  });
  return latex;
}

// ── Final polynomial card ─────────────────────────────────────────────────────

function renderFinalPolynomial(x, coeffs) {
  const n      = coeffs.length;
  const degree = n - 1;
  const Plabel = 'P_{' + degree + '}(x)';
  if (n === 0) return '';

  // Newton form string
  let newtonTerms = fmtNum(coeffs[0]);
  for (let k = 1; k < n; k++) {
    if (Math.abs(coeffs[k]) < 1e-10) continue;
    const val   = coeffs[k];
    const abs   = Math.abs(val);
    const isOne = Math.abs(abs - 1) < 1e-10;
    const cStr  = isOne ? '' : fmtNum(abs);
    const sign  = val >= 0 ? ' + ' : ' - ';
    const factors = [];
    for (let j = 0; j < k; j++) {
      const xj = x[j];
      if (Math.abs(xj) < 1e-10) factors.push('x');
      else if (xj > 0)          factors.push('(x - ' + fmtNum(xj) + ')');
      else                      factors.push('(x + ' + fmtNum(Math.abs(xj)) + ')');
    }
    newtonTerms += sign + cStr + factors.join('');
  }

  const simp = simplifiedLatex(x, coeffs);
  _currentSimplifiedLatex = simp;

  const content =
    '<div class="mb-2">' +
    '<p class="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Newton Form</p>' +
    '<div class="pl-2 py-2 overflow-x-auto overflow-y-hidden mj-container">' +
    '\\[' + Plabel + ' = ' + newtonTerms + '\\]</div></div>' +
    '<div class="rounded-md bg-primary/5 border border-primary/20 p-3">' +
    '<p class="text-xs font-medium text-primary mb-1 uppercase tracking-wide">Simplified Form</p>' +
    '<div class="pl-2 py-2 overflow-x-auto overflow-y-hidden mj-container">\\[' + simp + '\\]</div></div>';

  return buildStepCard('Result', 'Newton Interpolating Polynomial', content, 'sigma');
}

// ── Unified DD table ──────────────────────────────────────────────────────────

// Renders to both #steps-table-container (Steps tab) and #summary-table-container (Table tab)
function renderSummaryTable(x, table) {
  const n       = x.length;
  const showAll = _stepsExpanded || (n <= 5);
  const cols    = showAll
    ? Array.from({ length: n }, (_, i) => i)
    : [0, 1, '...', n - 2, n - 1];

  // Column headers
  let headerHtml = '<th class="px-3 py-2 border-r font-semibold text-center text-xs uppercase text-muted-foreground w-16">X</th>';
  cols.forEach(col => {
    if (col === '...') {
      headerHtml += '<th class="px-3 py-2 border-r text-center text-muted-foreground italic w-10">···</th>';
    } else {
      const label = col === 0 ? 'f(x<sub>i</sub>)' : ordinalSuffix(col) + ' Order';
      headerHtml += '<th class="px-3 py-2 border-r font-semibold text-center text-xs uppercase text-muted-foreground">' + label + '</th>';
    }
  });

  // Body rows — diagonal cells (i === col) are Newton coefficients: highlight prominently
  let bodyHtml = '';
  for (let i = 0; i < n; i++) {
    bodyHtml += '<tr class="hover:bg-muted/20 transition-colors">';
    bodyHtml += '<td class="px-3 py-2 border-r text-center font-mono text-xs bg-muted/10 text-muted-foreground">' + fmtNum(x[i]) + '</td>';
    cols.forEach(col => {
      if (col === '...') {
        bodyHtml += '<td class="px-3 py-2 border-r text-center text-muted-foreground/25 text-xs">···</td>';
        return;
      }
      const val    = table[i][col];
      const isDiag = (i === col); // Newton coefficient — on the diagonal
      if (isDiag) {
        const v = val != null ? fmtNum(val) : '—';
        // Bold, primary colour, tinted background, and inset ring to make coefficients stand out
        bodyHtml += '<td class="px-3 py-2 border-r text-center font-mono text-xs font-bold text-primary bg-primary/10 ring-1 ring-inset ring-primary/30">' + v + '</td>';
      } else if (val != null) {
        bodyHtml += '<td class="px-3 py-2 border-r text-center font-mono text-xs">' + fmtNum(val) + '</td>';
      } else {
        bodyHtml += '<td class="px-3 py-2 border-r text-center text-muted-foreground/25 text-xs">—</td>';
      }
    });
    bodyHtml += '</tr>';
  }

  const legend =
    '<div class="flex items-center gap-2 mt-2 text-xs text-muted-foreground">' +
    '<span class="inline-block w-3 h-3 rounded-sm bg-primary/10 ring-1 ring-primary/30 shrink-0"></span>' +
    '<span>Newton coefficients (diagonal entries used in interpolation)</span></div>';

  const expandBtn = showAll ? '' :
    '<div class="flex justify-center mt-3">' +
    '<button onclick="expandCollapsedSteps()" class="text-xs font-medium text-primary hover:underline flex items-center gap-1">' +
    '<i data-lucide="maximize-2" class="w-3 h-3"></i> Expand full table</button></div>';

  const html =
    '<div class="rounded-xl border bg-card shadow-sm overflow-hidden">' +
    '<div class="overflow-x-auto">' +
    '<table class="w-full text-sm border-collapse">' +
    '<thead class="bg-muted/50 border-b"><tr>' + headerHtml + '</tr></thead>' +
    '<tbody class="divide-y">' + bodyHtml + '</tbody>' +
    '</table></div></div>' + legend + expandBtn;

  // Single source of truth — write identical table to both tab containers
  ['steps-table-container', 'summary-table-container'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });

  if (window.lucide) lucide.createIcons();
}

// ── Clipboard ─────────────────────────────────────────────────────────────────

function copyEquationToClipboard(context) {
  const latex = _currentSimplifiedLatex;
  if (!latex) { showCopyToast('Nothing to copy yet.', true); return; }
  const text = '\\[' + latex + '\\]';
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showCopyToast('LaTeX copied!')).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); showCopyToast('LaTeX copied!'); }
  catch (e) { showCopyToast('Copy failed.', true); }
  document.body.removeChild(ta);
}

function showCopyToast(msg, isError) {
  const toast = document.getElementById('copy-toast');
  const msgEl = document.getElementById('copy-toast-msg');
  if (!toast) return;
  msgEl.textContent = msg;
  toast.style.backgroundColor = isError ? 'hsl(var(--destructive))' : '';
  toast.classList.remove('hidden');
  toast.classList.add('flex');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.classList.add('hidden'); toast.classList.remove('flex'); }, 2200);
}

// ── Expand collapsed state ────────────────────────────────────────────────────

function expandCollapsedSteps() {
  _stepsExpanded = true;
  if (_stepsData) renderStepsFromData(_stepsData);
}

// ── Main renderer ─────────────────────────────────────────────────────────────

function renderStepsFromData(data) {
  _stepsData = data;
  const container = document.getElementById('steps-container');
  if (!container) return;

  if (data.error || !data.dd_table) {
    container.innerHTML =
      '<div class="text-center text-muted-foreground p-8">' +
      '<h3 class="text-lg font-medium mb-2">Awaiting calculation…</h3>' +
      '<p>Input data points and calculate to see steps.</p></div>';
    return;
  }

  const x      = ensureArray(data.pts_x);
  const coeffs = ensureArray(data.dd_coeffs);
  const n      = x.length;
  const maxOrd = n - 1;

  // Normalise DD table from R's row-major JSON
  const table = data.dd_table.map(row =>
    Array.from({ length: n }, (_, j) => row[j] != null ? Number(row[j]) : null)
  );

  // Cache simplified LaTeX for clipboard before building HTML
  _currentSimplifiedLatex = simplifiedLatex(x, coeffs);

  // Render unified DD table to both Steps tab and Table tab (req 4 + 5 + 6)
  renderSummaryTable(x, table);

  // Build order-by-order breakdown cards
  let html = '';
  try {
    html += renderOrderZero(x, table);
    if (maxOrd <= STEPS_COLLAPSE_THRESHOLD || _stepsExpanded) {
      for (let ord = 1; ord <= maxOrd; ord++) html += renderOrderK(ord, x, table, n);
    } else {
      html += renderOrderK(1, x, table, n);
      html += renderOrderK(2, x, table, n);
      html += renderCollapsedOrders(3, maxOrd - 2);
      html += renderOrderK(maxOrd - 1, x, table, n);
      html += renderOrderK(maxOrd, x, table, n);
    }
    html += renderFinalPolynomial(x, coeffs);
    html += '<div class="mt-8 pt-4 border-t text-center text-[10px] text-muted-foreground italic">Walkthrough generated successfully.</div>';
  } catch (e) {
    console.error('[Steps] render error:', e);
  }

  container.innerHTML = html;

  if (window.MathJax) {
    requestAnimationFrame(() => {
      MathJax.typesetPromise([container]).catch(err => console.error('[Steps] MathJax error:', err));
    });
  }
  if (window.lucide) lucide.createIcons();
}

// ── Shiny handler ─────────────────────────────────────────────────────────────

function initStepsHandlers() {
  if (!window.Shiny) { setTimeout(initStepsHandlers, 100); return; }
  Shiny.addCustomMessageHandler('update_steps_data', function(msg) {
    _stepsExpanded = false;
    renderStepsFromData(msg);
  });
}

$(document).on('shiny:connected', initStepsHandlers);