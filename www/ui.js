// Initialize Lucide icons
if (window.lucide) {
    lucide.createIcons();
}

$(document).on('shiny:value', function(event) {
  setTimeout(function() {
    if (window.MathJax) {
      const el = document.getElementById(event.name);
      if (el) {
        MathJax.typesetPromise([el]).catch(function(err) {
          console.error("MathJax typeset failed: " + err.message);
        });
      }
    }
    if (window.lucide) {
      lucide.createIcons();
    }
  }, 10);
});

Shiny.addCustomMessageHandler('update_equation_text', function(eqString) {
  if (!window.MathJax) return;
  
  const containers = document.querySelectorAll('.mj-container');
  const hiddenBuffers = [];
  const visibleBuffers = [];
  
  containers.forEach(container => {
    const buffers = container.querySelectorAll('.mj-buffer');
    if (buffers.length === 2) {
      let b1 = buffers[0];
      let b2 = buffers[1];
      let visible = b1.classList.contains('mj-hidden') ? b2 : b1;
      let hidden = b1.classList.contains('mj-hidden') ? b1 : b2;
      
      hidden.innerHTML = eqString;
      hiddenBuffers.push(hidden);
      visibleBuffers.push(visible);
    }
  });
  
  if (hiddenBuffers.length > 0) {
    MathJax.typesetPromise(hiddenBuffers).then(() => {
      hiddenBuffers.forEach(b => { b.classList.remove('mj-hidden'); b.style.opacity = '1'; });
      visibleBuffers.forEach(b => { b.classList.add('mj-hidden'); b.style.opacity = '0'; });
    }).catch(err => console.error("MathJax double buffer error: ", err));
  }
});

// Settings Dropdown (click toggle)
function toggleSettingsDropdown() {
  var dd = document.getElementById('settings-dropdown');
  if (dd) dd.classList.toggle('hidden');
}
document.addEventListener('click', function(e) {
  var dd = document.getElementById('settings-dropdown');
  if (!dd) return;
  var wrapper = dd.parentElement;
  if (!wrapper.contains(e.target)) dd.classList.add('hidden');
});


function openEquationModal() {
  document.getElementById('equation-modal').classList.remove('hidden');
  setTimeout(function() { if (window.MathJax) MathJax.typesetPromise(); }, 50);
}
function closeEquationModal() {
  document.getElementById('equation-modal').classList.add('hidden');
}

function toggleAutoCalc(btn) {
  var isChecked = btn.getAttribute('aria-checked') === 'true';
  btn.setAttribute('aria-checked', !isChecked);
  
  const dot = btn.querySelector('span');
  if (isChecked) {
      btn.classList.remove('bg-primary');
      btn.classList.add('bg-muted');
      dot.classList.remove('translate-x-3');
      dot.classList.add('translate-x-0');
      document.getElementById('calculate-btn').style.display = 'inline-flex';
  } else {
      btn.classList.remove('bg-muted');
      btn.classList.add('bg-primary');
      dot.classList.remove('translate-x-0');
      dot.classList.add('translate-x-3');
      document.getElementById('calculate-btn').style.display = 'none';
  }
  
  Shiny.setInputValue('auto_calc', !isChecked);
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => {
      el.classList.add('hidden');
      el.classList.remove('active');
  });
  
  document.querySelectorAll('.tab-btn').forEach(el => {
      el.classList.remove('bg-muted', 'text-foreground');
      el.classList.add('text-muted-foreground');
      el.setAttribute('data-state', 'inactive');
  });
  
  document.getElementById(tabId).classList.remove('hidden');
  document.getElementById(tabId).classList.add('active');
  
  document.querySelectorAll('.tab-btn').forEach(el => {
    if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(tabId)) {
      el.classList.remove('text-muted-foreground');
      el.classList.add('bg-muted', 'text-foreground');
      el.setAttribute('data-state', 'active');
    }
  });
  
  const gameCtrl = document.getElementById('game-controls');
  if (tabId === 'tab-game') {
    gameMode = true;
    if (gameCtrl) gameCtrl.classList.remove('hidden');
  } else {
    gameMode = false;
    if (gameCtrl) gameCtrl.classList.add('hidden');
  }
  
  Shiny.setInputValue('active_tab', tabId);
  if (window.jQuery) {
    $(window).trigger('resize');
  }
}

function switchSubTab(subTabId) {
  document.querySelectorAll('.sub-tab-content').forEach(el => {
    el.classList.remove('active');
    el.style.display = 'none';
    el.style.setProperty('display', 'none', 'important');
  });
  
  document.querySelectorAll('.sub-tab-btn').forEach(el => {
    el.classList.remove('bg-background', 'text-foreground', 'shadow-sm', 'active');
    el.classList.add('text-muted-foreground');
    el.setAttribute('data-state', 'inactive');
  });
  
  const targetEl = document.getElementById(subTabId);
  if (targetEl) {
    targetEl.classList.add('active');
    const isFlex = targetEl.classList.contains('flex');
    const displayMode = isFlex ? 'flex' : 'block';
    targetEl.style.display = displayMode;
    targetEl.style.setProperty('display', displayMode, 'important');
  } else {
    console.warn('[UI] Target element NOT found:', subTabId);
  }
  
  document.querySelectorAll('.sub-tab-btn').forEach(el => {
    if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(subTabId)) {
      el.classList.remove('text-muted-foreground');
      el.classList.add('bg-background', 'text-foreground', 'shadow-sm');
      el.setAttribute('data-state', 'active');
    }
  });
  
  const resultsEq = document.getElementById('results-equation-container');
  if (resultsEq) resultsEq.style.display = (subTabId === 'plot') ? 'none' : 'block';
  Shiny.setInputValue('active_sub_tab', subTabId);
  if (window.jQuery) {
    $(window).trigger('resize');
  }
}

// Draggable Utility
function makeDraggable(el, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  handle.onmousedown = dragMouseDown;
  handle.ontouchstart = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    // Allow checkbox interaction
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    
    e.preventDefault();
    if (e.type === 'touchstart') {
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
    } else {
      pos3 = e.clientX;
      pos4 = e.clientY;
    }
    document.onmouseup = closeDragElement;
    document.ontouchend = closeDragElement;
    document.onmousemove = elementDrag;
    document.ontouchmove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    let clientX, clientY;
    if (e.type === 'touchmove') {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    pos1 = pos3 - clientX;
    pos2 = pos4 - clientY;
    pos3 = clientX;
    pos4 = clientY;
    
    // Switch from bottom-4 to top/left based positioning
    const parentRect = el.parentElement.getBoundingClientRect();
    let newTop = el.offsetTop - pos2;
    let newLeft = el.offsetLeft - pos1;
    
    // Constrain to parent
    newTop = Math.max(0, Math.min(newTop, parentRect.height - el.offsetHeight));
    newLeft = Math.max(0, Math.min(newLeft, parentRect.width - el.offsetWidth));
    
    el.style.top = newTop + "px";
    el.style.left = newLeft + "px";
    el.style.bottom = "auto"; // Override the initial bottom-4
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.ontouchend = null;
    document.onmousemove = null;
    document.ontouchmove = null;
  }
}

// Initialize Nerd Panel Dragging
document.addEventListener('DOMContentLoaded', function() {
  const nerdPanel = document.getElementById('nerd-panel');
  const nerdHeader = document.getElementById('nerd-panel-header');
  if (nerdPanel && nerdHeader) {
    makeDraggable(nerdPanel, nerdHeader);
  }
});
