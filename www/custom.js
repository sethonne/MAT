// MathJax re-render and Lucide icon initialization on Shiny output changes
$(document).on('shiny:value', function(event) {
  setTimeout(function() {
    if (window.MathJax) {
      MathJax.typesetPromise().catch(function(err) {
        console.error("MathJax typeset failed: " + err.message);
      });
    }
    if (window.lucide) {
      lucide.createIcons();
    }
  }, 100);
});

// Send initial input values when Shiny connects
$(document).on('shiny:connected', function() {
  Shiny.setInputValue('auto_calc', true);
  Shiny.setInputValue('show_pts', true);
  Shiny.setInputValue('draggable_pts', true);
  Shiny.setInputValue('game_mode', false);
  Shiny.setInputValue('custom_car', false);
  Shiny.setInputValue('speed', 1);
  Shiny.setInputValue('active_sub_tab', 'plot');
});

// Initialize Lucide icons on page load
document.addEventListener('DOMContentLoaded', function() {
  lucide.createIcons();
});

// Auto-calc Toggle
function toggleAutoCalc(btn) {
  var isChecked = btn.getAttribute('aria-checked') === 'true';
  btn.setAttribute('aria-checked', !isChecked);
  var span = btn.querySelector('span');
  var calcBtn = document.getElementById('calculate-btn');

  if (isChecked) {
    btn.classList.remove('bg-primary');
    btn.classList.add('bg-input');
    span.classList.remove('translate-x-3');
    span.classList.add('translate-x-0');
    if (calcBtn) calcBtn.style.display = 'inline-flex';
  } else {
    btn.classList.remove('bg-input');
    btn.classList.add('bg-primary');
    span.classList.remove('translate-x-0');
    span.classList.add('translate-x-3');
    if (calcBtn) calcBtn.style.display = 'none';
  }

  Shiny.setInputValue('auto_calc', !isChecked);
}

// Game Mode Toggle
function toggleGameMode(chk) {
  var controls = document.getElementById('game-controls');
  if (controls) {
    controls.style.display = chk.checked ? 'block' : 'none';
  }
  Shiny.setInputValue('game_mode', chk.checked);
}

// Equation Modal
function openEquationModal() {
  document.getElementById('equation-modal').classList.remove('hidden');
  // Re-typeset MathJax in modal
  setTimeout(function() {
    if (window.MathJax) MathJax.typesetPromise();
  }, 50);
}
function closeEquationModal() {
  document.getElementById('equation-modal').classList.add('hidden');
}

// Main Tabs Switcher
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(el) { el.setAttribute('data-state', 'inactive'); });
  document.getElementById(tabId).classList.add('active');
  var btns = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].getAttribute('onclick').indexOf(tabId) !== -1) {
      btns[i].setAttribute('data-state', 'active');
    }
  }
}

// Sub Tabs Switcher
function switchSubTab(subTabId) {
  document.querySelectorAll('.sub-tab-content').forEach(function(el) { el.classList.remove('active'); });
  document.querySelectorAll('.sub-tab-btn').forEach(function(el) { el.setAttribute('data-state', 'inactive'); });
  document.getElementById(subTabId).classList.add('active');
  event.currentTarget.setAttribute('data-state', 'active');

  // Equation container visibility
  var resultsEq = document.getElementById('results-equation-container');
  if (resultsEq) {
    resultsEq.style.display = (subTabId === 'plot') ? 'none' : 'block';
  }

  // Notify Shiny
  Shiny.setInputValue('active_sub_tab', subTabId);
}
