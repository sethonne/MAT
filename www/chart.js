function updateSpeed(val) {
  carSpeed = parseFloat(val);
}

function toggleAnimation() {
  playing = !playing;
}

function resetAnimation() {
  if (plotData && plotData.xs && plotData.xs.length > 0) {
    carT = plotMinX + 0.2;
    carDirection = 1;
  }
}

$(document).on('shiny:connected', function() {
  $('#chk-show-pts').on('change', function(e) {
    showPts = e.target.checked;
    updateChart();
  });
  $('#chk-drag-pts').on('change', function(e) {
    dragEnabled = e.target.checked;
    const canvas = document.getElementById('animation-canvas');
    if (canvas) canvas.style.cursor = dragEnabled ? 'grab' : 'default';
  });
  renderDataPoints();
  renderInterpPoints();
  Shiny.setInputValue('auto_calc', true);
  Shiny.setInputValue('calc_btn', Math.random(), {priority: 'event'});
});

Shiny.addCustomMessageHandler('update_plot_data', function(msg) {
  plotData = msg;

  if (msg.error) {
    if (myChart) {
      myChart.data.datasets = [];
      myChart.options.plugins.title = {display: true, text: "Please input distinct X values", color: 'red', font: {size: 16}};
      myChart.update();
    }
    return;
  }

  curveData = ensureArray(msg.xs).map((x, i) => ({x: x, y: ensureArray(msg.ys)[i]}));
  // Don't clobber controlPts during an active drag — preserve the local optimistic state.
  if (dragIdx < 0) {
    controlPts = ensureArray(msg.pts_x).map((x, i) => ({x: x, y: ensureArray(msg.pts_y)[i]}));
  }
  interpPts = ensureArray(msg.interp_x).map((x, i) => ({x: x, y: ensureArray(msg.interp_y)[i]}));

  plotMinX = msg.min_x;
  plotMaxX = msg.max_x;

  if (carT === null || carT < plotMinX || carT > plotMaxX) {
    carT = plotMinX + 0.2;
  }

  updateChart();
  renderInterpPoints();
});

const carPlugin = {
  id: 'carPlugin',
  afterDraw: (chart) => {
    if (!gameMode || !plotData || plotData.error || curveData.length === 0) return;
    
    const ctx = chart.ctx;
    const xAxis = chart.scales.x;
    const yAxis = chart.scales.y;
    
    const t = carT;
    
    let idx = 0;
    while(idx < curveData.length - 1 && curveData[idx].x < t) idx++;
    
    const p1 = curveData[Math.max(0, idx-1)];
    const p2 = curveData[idx];
    
    if (!p1 || !p2) return;
    
    const factor = (p2.x - p1.x === 0) ? 0 : (t - p1.x) / (p2.x - p1.x);
    const cy = p1.y + factor * (p2.y - p1.y);
    
    const px1 = xAxis.getPixelForValue(p1.x);
    const py1 = yAxis.getPixelForValue(p1.y);
    const px2 = xAxis.getPixelForValue(p2.x);
    const py2 = yAxis.getPixelForValue(p2.y);
    const pxDx = px2 - px1;
    const pxDy = py2 - py1;
    const angle = Math.atan2(pxDy, pxDx);
    
    const px = xAxis.getPixelForValue(t);
    const py = yAxis.getPixelForValue(cy);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    
    if (carDirection < 0) {
      ctx.scale(-1, 1);
    }

    // --- Side-view car ---
    const cw = 60;  // car width
    const ch = 18;  // body height
    const lift = ch + 4; // lift car above the curve (wheels sit on curve)
    ctx.translate(0, -lift);
    
    // Body (main rectangle with rounded corners)
    ctx.fillStyle = '#FF7F2A';
    ctx.beginPath();
    const bx = -cw/2, by = 0, bw = cw, bh = ch, br = 3;
    ctx.moveTo(bx + br, by);
    ctx.lineTo(bx + bw - br, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + br, br);
    ctx.lineTo(bx + bw, by + bh - br);
    ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);
    ctx.lineTo(bx + br, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - br, br);
    ctx.lineTo(bx, by + br);
    ctx.arcTo(bx, by, bx + br, by, br);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c45a10';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Cabin / roof (trapezoid)
    ctx.fillStyle = '#A0D4FF';
    ctx.beginPath();
    ctx.moveTo(-cw * 0.15, 0);       // bottom-left of cabin
    ctx.lineTo(-cw * 0.08, -ch * 0.7); // top-left
    ctx.lineTo( cw * 0.22, -ch * 0.7); // top-right
    ctx.lineTo( cw * 0.32, 0);         // bottom-right
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5a9fd4';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Wheels
    const wheelR = 5;
    const wheelY = ch + 1;
    ctx.fillStyle = '#333';
    // Front wheel
    ctx.beginPath();
    ctx.arc(cw * 0.25, wheelY, wheelR, 0, 2 * Math.PI);
    ctx.fill();
    // Rear wheel
    ctx.beginPath();
    ctx.arc(-cw * 0.25, wheelY, wheelR, 0, 2 * Math.PI);
    ctx.fill();
    // Wheel hubcaps
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(cw * 0.25, wheelY, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-cw * 0.25, wheelY, 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Headlight
    ctx.fillStyle = '#FFE066';
    ctx.beginPath();
    ctx.arc(cw/2 - 2, ch * 0.45, 2.5, 0, 2 * Math.PI);
    ctx.fill();
    
    // Taillight
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-cw/2 + 2, ch * 0.45, 2, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.restore();
  }
};

function initChart() {
  const canvas = document.getElementById('animation-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  Chart.defaults.font.family = 'Inter';
  
  myChart = new Chart(ctx, {
    type: 'scatter',
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { 
          type: 'linear', 
          position: 'bottom',
          min: plotMinX,
          max: plotMaxX,
          grid: { color: 'hsl(214.3 31.8% 91.4%)' },
          ticks: { color: 'hsl(215.4 16.3% 46.9%)', font: { size: 11 } },
          border: { color: 'hsl(214.3 31.8% 91.4%)' }
        },
        y: { 
          type: 'linear',
          min: -5,
          max: 15,
          grid: { color: 'hsl(214.3 31.8% 91.4%)' },
          ticks: { color: 'hsl(215.4 16.3% 46.9%)', font: { size: 11 } },
          border: { color: 'hsl(214.3 31.8% 91.4%)' }
        }
      },
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          enabled: true,
          callbacks: {
            label: function(context) {
              const ds = context.dataset;
              // Only label control points (the scatter dataset with order -1)
              if (ds.order === -1) {
                return 'Point ' + (context.dataIndex + 1) + ': (' + context.parsed.x.toFixed(3) + ', ' + context.parsed.y.toFixed(3) + ')';
              }
              if (ds.order === -2) {
                return 'Interp ' + (context.dataIndex + 1) + ': (' + context.parsed.x.toFixed(3) + ', ' + context.parsed.y.toFixed(3) + ')';
              }
              return '';
            },
            title: function() { return ''; }
          },
          filter: function(tooltipItem) {
            // Only show tooltips for scatter point datasets, not the line
            return tooltipItem.dataset.order != null;
          },
          backgroundColor: 'hsl(222.2 84% 4.9%)',
          titleFont: { size: 0 },
          bodyFont: { family: 'Inter', size: 12 },
          padding: { x: 10, y: 6 },
          cornerRadius: 6,
          displayColors: false
        }
      },
      layout: {
        padding: 0
      }
    },
    plugins: [carPlugin, {
      id: 'customBg',
      beforeDraw: (chart) => {
        if (!gameMode) return;
        const ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, chart.width, chart.height);
        // Draw sun
        ctx.fillStyle = '#FFE066';
        ctx.beginPath();
        ctx.arc(60, 60, 25, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    }, {
      id: 'pointLabels',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = 'white';

        chart.data.datasets.forEach((ds, datasetIndex) => {
          // Match control-point scatter datasets (pointRadius 7, order -1)
          if (ds.order === -1 && ds.pointRadius === 8) {
            const metaData = chart.getDatasetMeta(datasetIndex);
            metaData.data.forEach((element, index) => {
              const {x, y} = element.tooltipPosition();
              ctx.fillText(index + 1, x, y);
            });
          }
        });
        ctx.restore();
      }
    }, {
      id: 'dragHover',
      afterDatasetsDraw(chart) {
        if (!plotData || plotData.error) return;
        const idx = dragIdx >= 0 ? dragIdx : (dragHoverIdx >= 0 ? dragHoverIdx : -1);
        if (idx < 0 || !controlPts[idx]) return;
        const ctx = chart.ctx;
        const px = chart.scales.x.getPixelForValue(controlPts[idx].x);
        const py = chart.scales.y.getPixelForValue(controlPts[idx].y);
        const now = performance.now();
        const flashing = dragFlashIdx === idx && now < dragFlashUntil;
        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = flashing ? '#ef4444' : (dragIdx === idx ? '#1d4ed8' : '#60a5fa');
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
      }
    }]
  });

  initDragHandlers();
}

function pointHitIndex(canvas, mx, my) {
  if (!myChart || !controlPts.length) return -1;
  const RADIUS = 14;
  for (let i = 0; i < controlPts.length; i++) {
    const px = myChart.scales.x.getPixelForValue(controlPts[i].x);
    const py = myChart.scales.y.getPixelForValue(controlPts[i].y);
    const dx = px - mx, dy = py - my;
    if (dx * dx + dy * dy <= RADIUS * RADIUS) return i;
  }
  return -1;
}

function canvasCoords(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width) / (window.devicePixelRatio || 1),
    y: (clientY - rect.top) * (canvas.height / rect.height) / (window.devicePixelRatio || 1)
  };
}

function showDragTooltip(canvas, mx, my, xVal, yVal) {
  const tip = document.getElementById('drag-coord-tooltip');
  if (!tip) return;
  const rect = canvas.getBoundingClientRect();
  const parentRect = tip.offsetParent ? tip.offsetParent.getBoundingClientRect() : rect;
  const screenX = rect.left + mx * (rect.width / canvas.width) * (window.devicePixelRatio || 1);
  const screenY = rect.top + my * (rect.height / canvas.height) * (window.devicePixelRatio || 1);
  tip.classList.remove('hidden');
  tip.textContent = `(${xVal.toFixed(3)}, ${yVal.toFixed(3)})`;
  tip.style.left = (screenX - parentRect.left + 12) + 'px';
  tip.style.top = (screenY - parentRect.top - 28) + 'px';
}

function hideDragTooltip() {
  const tip = document.getElementById('drag-coord-tooltip');
  if (tip) tip.classList.add('hidden');
}

function dragBeginPick(canvas, clientX, clientY) {
  if (!dragEnabled || !plotData || plotData.error) return false;
  const {x: mx, y: my} = canvasCoords(canvas, clientX, clientY);
  const hit = pointHitIndex(canvas, mx, my);
  if (hit < 0) return false;
  dragIdx = hit;
  dragOriginalX = controlPts[hit].x;
  dragOriginalY = controlPts[hit].y;
  canvas.classList.add('drag-active');
  return true;
}

function dragMoveTo(canvas, clientX, clientY) {
  if (dragIdx < 0 || !myChart) return;
  const {x: mx, y: my} = canvasCoords(canvas, clientX, clientY);
  const xScale = myChart.scales.x;
  const yScale = myChart.scales.y;
  let newX = xScale.getValueForPixel(mx);
  let newY = yScale.getValueForPixel(my);
  newX = clamp(newX);
  newY = clamp(newY);
  controlPts[dragIdx].x = newX;
  controlPts[dragIdx].y = newY;
  showDragTooltip(canvas, mx, my, newX, newY);
  myChart.update('none');
}

function dragEnd(canvas) {
  if (dragIdx < 0) return;
  const idx = dragIdx;
  const newX = controlPts[idx].x;
  const newY = controlPts[idx].y;
  // Reject duplicate-X collisions.
  let duplicate = false;
  for (let j = 0; j < controlPts.length; j++) {
    if (j !== idx && Math.abs(controlPts[j].x - newX) < 1e-9) { duplicate = true; break; }
  }
  if (duplicate) {
    controlPts[idx].x = dragOriginalX;
    controlPts[idx].y = dragOriginalY;
    dragFlashIdx = idx;
    dragFlashUntil = performance.now() + 500;
    if (myChart) myChart.update('none');
    setTimeout(() => { dragFlashIdx = -1; if (myChart) myChart.update('none'); }, 520);
  } else {
    dataPoints[idx] = {x: newX, y: newY};
    renderDataPoints();
  }
  dragIdx = -1;
  dragOriginalX = null;
  dragOriginalY = null;
  hideDragTooltip();
  canvas.classList.remove('drag-active');
  canvas.style.cursor = dragEnabled ? 'grab' : 'default';
}

function initDragHandlers() {
  const canvas = document.getElementById('animation-canvas');
  if (!canvas || canvas.dataset.dragWired) return;
  canvas.dataset.dragWired = '1';

  canvas.addEventListener('mousedown', function(e) {
    if (dragBeginPick(canvas, e.clientX, e.clientY)) {
      e.preventDefault();
    }
  });

  canvas.addEventListener('mousemove', function(e) {
    if (!dragEnabled) return;
    if (dragIdx >= 0) return;
    const {x: mx, y: my} = canvasCoords(canvas, e.clientX, e.clientY);
    const hit = pointHitIndex(canvas, mx, my);
    const prev = dragHoverIdx;
    dragHoverIdx = hit;
    canvas.style.cursor = hit >= 0 ? 'grab' : 'default';
    if (prev !== hit && myChart) myChart.update('none');
  });

  canvas.addEventListener('mouseleave', function() {
    if (dragIdx < 0 && dragHoverIdx !== -1) {
      dragHoverIdx = -1;
      if (myChart) myChart.update('none');
    }
  });

  window.addEventListener('mousemove', function(e) {
    if (dragIdx < 0) return;
    dragMoveTo(canvas, e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', function() {
    if (dragIdx < 0) return;
    dragEnd(canvas);
  });

  canvas.addEventListener('touchstart', function(e) {
    if (!e.touches.length) return;
    const t = e.touches[0];
    if (dragBeginPick(canvas, t.clientX, t.clientY)) {
      e.preventDefault();
    }
  }, {passive: false});

  window.addEventListener('touchmove', function(e) {
    if (dragIdx < 0 || !e.touches.length) return;
    const t = e.touches[0];
    dragMoveTo(canvas, t.clientX, t.clientY);
    e.preventDefault();
  }, {passive: false});

  window.addEventListener('touchend', function() {
    if (dragIdx < 0) return;
    dragEnd(canvas);
  });
}

function updateChart() {
  if (!document.getElementById('animation-canvas')) return;
  if (!myChart) initChart();
  
  if (myChart && plotData && !plotData.error) {
    myChart.options.scales.x.min = plotMinX;
    myChart.options.scales.x.max = plotMaxX;
    
    const ptsY = ensureArray(plotData.pts_y);
    const curveY = ensureArray(plotData.ys);
    if (ptsY.length > 0) {
      let minY = Math.min(...ptsY, ...curveY);
      let maxY = Math.max(...ptsY, ...curveY);
      let yRange = maxY - minY;
      if (yRange === 0) yRange = 10;
      
      // Pad by 15% of the total visible height so the peaks are never touching the ceiling
      myChart.options.scales.y.min = minY - (yRange * 0.15);
      myChart.options.scales.y.max = maxY + (yRange * 0.15);
    }
    
    // Hide axes entirely in game mode so there is no padding/margin
    myChart.options.scales.x.display = !gameMode;
    myChart.options.scales.y.display = !gameMode;
  }
  
  const chartCard = document.getElementById('chart-card');
  const mobCtrl = document.getElementById('mobile-controls');
  const gameInds = document.getElementById('game-indicators');
  if (chartCard) {
    if (!gameMode) {
      chartCard.classList.remove('border', 'shadow-sm');
      if (mobCtrl) mobCtrl.classList.add('hidden');
      if (gameInds) gameInds.classList.add('hidden');
    } else {
      chartCard.classList.add('border', 'shadow-sm');
      if (mobCtrl) mobCtrl.classList.remove('hidden');
      if (gameInds) gameInds.classList.remove('hidden');
    }
  }
  
  const datasets = [];
  
  // Line goes first (lowest z-index) — represents the ground in game mode
  if (curveData.length > 0) {
    datasets.push({
      type: 'line',
      data: curveData,
      borderColor: gameMode ? 'hsl(142 71% 29%)' : 'hsl(221.2 83.2% 53.3%)',
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.1,
      fill: { value: -1000 }, 
      backgroundColor: gameMode ? 'hsl(142 71% 45%)' : 'hsla(221.2, 83.2%, 53.3%, 0.08)'
    });
  }
  
  // Points go after the line (higher z-index, rendered on top)
  if (showPts && controlPts.length > 0) {
    datasets.push({
      type: 'scatter',
      data: controlPts,
      backgroundColor: 'hsl(0 84.2% 60.2%)',
      borderColor: 'hsl(0 84.2% 50%)',
      borderWidth: 1,
      pointRadius: 8,
      pointHoverRadius: 10,
      order: -1
    });
  }
  
  if (interpPts.length > 0) {
    datasets.push({
      type: 'scatter',
      data: interpPts,
      backgroundColor: 'hsl(45 93% 58%)',
      borderColor: 'hsl(25 95% 53%)',
      borderWidth: 1.5,
      pointRadius: 7,
      pointHoverRadius: 10,
      pointStyle: 'rectRot',
      order: -2
    });
  }
  
  myChart.options.plugins.title = {display: false};
  myChart.data.datasets = datasets;
  myChart.update('none');
}

let lastTime = 0;
let lastNerdTime = 0;
let lastDt = 16;
function animateLoop(time) {
  if (gameMode && playing && plotData && !plotData.error && curveData.length > 0) {
    const dt = (time - lastTime) || 16;
    lastDt = dt;
    
    const evalData = evalAtCarT();
    const slopeRad = evalData ? evalData.slopeDeg * Math.PI / 180 : 0;
    
    // Physics constants
    const enginePower = 0.001 * carSpeed;
    const gravityConst = 0.0008 * carSpeed;
    const friction = 0.995; // Retain 99.5% velocity per 16ms (great for coasting)
    
    // Math.sin(slopeRad) is positive when going downhill to the right.
    lastGravAccel = Math.sin(slopeRad) * gravityConst;
    lastEngAccel = engineDirection * enginePower;
    
    const steps = dt / 16;
    carVelocity += (lastGravAccel + lastEngAccel) * steps;
    carVelocity *= Math.pow(friction, steps);
    
    carT += carVelocity * steps;

    // Update facing direction based on velocity
    if (carVelocity > 0.01) carDirection = 1;
    else if (carVelocity < -0.01) carDirection = -1;

    // Bounce back at edges instead of resetting
    const edgeL = plotMinX + 0.2;
    const edgeR = plotMaxX - 0.2;
    if (carT > edgeR) {
      carT = edgeR;
      carVelocity = -Math.abs(carVelocity) * 0.5; // lose some energy on bounce
    } else if (carT < edgeL) {
      carT = edgeL;
      carVelocity = Math.abs(carVelocity) * 0.5; // lose some energy on bounce
    }
    if (myChart) myChart.update('none');
  }
  if (nerdOpen && (time - lastNerdTime > 66)) {
    lastNerdTime = time;
    updateNerdPanel();
  }
  lastTime = time;
  requestAnimationFrame(animateLoop);
}
requestAnimationFrame(animateLoop);

let engineKeys = { left: false, right: false };

function updateEngineDirection() {
  if (engineKeys.left && !engineKeys.right) engineDirection = -1;
  else if (engineKeys.right && !engineKeys.left) engineDirection = 1;
  else engineDirection = 0;
  
  const indLeft = document.getElementById('ind-left');
  const indRight = document.getElementById('ind-right');
  if (indLeft) {
    if (engineKeys.left) {
      indLeft.classList.add('bg-primary', 'border-primary', 'text-primary-foreground');
      indLeft.classList.remove('bg-background/80', 'text-muted-foreground', 'border-border');
    } else {
      indLeft.classList.remove('bg-primary', 'border-primary', 'text-primary-foreground');
      indLeft.classList.add('bg-background/80', 'text-muted-foreground', 'border-border');
    }
  }
  if (indRight) {
    if (engineKeys.right) {
      indRight.classList.add('bg-primary', 'border-primary', 'text-primary-foreground');
      indRight.classList.remove('bg-background/80', 'text-muted-foreground', 'border-border');
    } else {
      indRight.classList.remove('bg-primary', 'border-primary', 'text-primary-foreground');
      indRight.classList.add('bg-background/80', 'text-muted-foreground', 'border-border');
    }
  }
}

window.addEventListener('keydown', function(e) {
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') engineKeys.left = true;
  if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') engineKeys.right = true;
  updateEngineDirection();
});

window.addEventListener('keyup', function(e) {
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') engineKeys.left = false;
  if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') engineKeys.right = false;
  updateEngineDirection();
});

function bindMobileControls() {
  const btnL = document.getElementById('btn-left');
  const btnR = document.getElementById('btn-right');
  if (!btnL || !btnR) return;
  
  const downL = (e) => { e.preventDefault(); engineKeys.left = true; updateEngineDirection(); };
  const upL = (e) => { e.preventDefault(); engineKeys.left = false; updateEngineDirection(); };
  
  const downR = (e) => { e.preventDefault(); engineKeys.right = true; updateEngineDirection(); };
  const upR = (e) => { e.preventDefault(); engineKeys.right = false; updateEngineDirection(); };

  btnL.addEventListener('mousedown', downL);
  btnL.addEventListener('touchstart', downL, {passive: false});
  btnL.addEventListener('mouseup', upL);
  btnL.addEventListener('mouseleave', upL);
  btnL.addEventListener('touchend', upL);

  btnR.addEventListener('mousedown', downR);
  btnR.addEventListener('touchstart', downR, {passive: false});
  btnR.addEventListener('mouseup', upR);
  btnR.addEventListener('mouseleave', upR);
  btnR.addEventListener('touchend', upR);
}

bindMobileControls();

function toggleNerdMode(on) {
  nerdOpen = !!on;
  const el = document.getElementById('nerd-panel');
  if (el) el.classList.toggle('hidden', !nerdOpen);
  if (nerdOpen) updateNerdPanel();
}

function evalAtCarT() {
  if (!curveData.length || carT == null) return null;
  let idx = 0;
  while (idx < curveData.length - 1 && curveData[idx].x < carT) idx++;
  const p1 = curveData[Math.max(0, idx - 1)];
  const p2 = curveData[idx];
  if (!p1 || !p2) return null;
  const denom = p2.x - p1.x;
  const factor = denom === 0 ? 0 : (carT - p1.x) / denom;
  const y = p1.y + factor * (p2.y - p1.y);
  // Compute angle in pixel-space if chart is available
  let slopeDeg = 0;
  if (myChart && myChart.scales) {
    const xAxis = myChart.scales.x;
    const yAxis = myChart.scales.y;
    const px1 = xAxis.getPixelForValue(p1.x);
    const py1 = yAxis.getPixelForValue(p1.y);
    const px2 = xAxis.getPixelForValue(p2.x);
    const py2 = yAxis.getPixelForValue(p2.y);
    slopeDeg = Math.atan2(py2 - py1, px2 - px1) * 180 / Math.PI;
  } else {
    const slopeRad = Math.atan2(-(p2.y - p1.y), p2.x - p1.x);
    slopeDeg = slopeRad * 180 / Math.PI;
  }
  return { y, slopeDeg, direction: carDirection };
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function updateNerdPanel() {
  if (!plotData || plotData.error) {
    setText('nerd-cart', '—');
    setText('nerd-px', '—');
    setText('nerd-slope', '—');
    setText('nerd-curve-info', '—');
    setText('nerd-xrange', '—');
    setText('nerd-yscale', '—');
    setText('nerd-dt', '—');
    setText('nerd-vel', '—');
    setText('nerd-grav', '—');
    setText('nerd-eng', '—');
    setText('nerd-drag', dragEnabled ? 'on' : 'off');
    return;
  }
  const carInfo = evalAtCarT();
  setText('nerd-cart', carT != null ? carT.toFixed(3) : '—');
  setText('nerd-px', carInfo ? carInfo.y.toFixed(3) : '—');
  setText('nerd-slope', carInfo ? `${carInfo.slopeDeg.toFixed(2)}° (${carInfo.direction > 0 ? 'fwd' : 'rev'})` : '—');
  setText('nerd-curve-info', `${curveData.length} pts`);
  setText('nerd-xrange', `[${plotMinX.toFixed(2)}, ${plotMaxX.toFixed(2)}]`);
  if (myChart && myChart.options && myChart.options.scales) {
    const ys = myChart.options.scales.y;
    setText('nerd-yscale', `[${ys.min?.toFixed?.(2) ?? '?'}, ${ys.max?.toFixed?.(2) ?? '?'}] (±15% pad)`);
  }
  setText('nerd-dt', lastDt.toFixed(1));
  setText('nerd-vel', carVelocity.toFixed(5));
  setText('nerd-grav', lastGravAccel.toFixed(5));
  setText('nerd-eng', lastEngAccel.toFixed(5));
  setText('nerd-drag', dragEnabled ? (dragIdx >= 0 ? `dragging pt ${dragIdx + 1}` : 'on') : 'off');
}
