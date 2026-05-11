function updateSpeed(val) {
  carSpeed = parseFloat(val);
}

function toggleAnimation() {
  playing = !playing;
}

function resetAnimation() {
  if (plotData && plotData.xs && plotData.xs.length > 0) {
    carT = plotMinX + 0.2;
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
    
    const dy = p2.y - p1.y;
    const dx = p2.x - p1.x;
    const angle = Math.atan2(-dy, dx); 
    
    const px = xAxis.getPixelForValue(t);
    const py = yAxis.getPixelForValue(cy);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    const cw = 64;
    const ch = 20;
    const lift = ch * 0.64;
    ctx.translate(0, -lift);
    
    ctx.fillStyle = '#FF7F2A';
    ctx.fillRect(-cw/2, -ch/2, cw, ch);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(-cw/2, -ch/2, cw, ch);
    
    ctx.fillStyle = '#A0C4FF';
    ctx.fillRect(cw*0.1, -ch/2, cw*0.3, ch);
    ctx.strokeRect(cw*0.1, -ch/2, cw*0.3, ch);
    
    ctx.fillStyle = '#333';
    ctx.fillRect(-cw/2+cw*0.1, -ch/2-ch*0.2, cw*0.25, ch*0.2);
    ctx.fillRect(-cw/2+cw*0.1, ch/2, cw*0.25, ch*0.2);
    ctx.fillRect(cw/2-cw*0.3, -ch/2-ch*0.2, cw*0.25, ch*0.2);
    ctx.fillRect(cw/2-cw*0.3, ch/2, cw*0.25, ch*0.2);
    
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
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        y: { 
          type: 'linear',
          min: -5,
          max: 15,
          grid: { color: 'rgba(0,0,0,0.05)' }
        }
      },
      plugins: {
        legend: { display: false },
        title: { display: false }
      },
      layout: {
        padding: 0
      }
    },
    plugins: [carPlugin, {
      id: 'customBg',
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = '#87CEEB'; 
        ctx.fillRect(0, 0, chart.width, chart.height);
        
        if (plotData && !plotData.error) {
           const xAxis = chart.scales.x;
           const yAxis = chart.scales.y;
           
           // Draw sun at a fixed pixel coordinate in the top left
           ctx.fillStyle = '#FFE066';
           ctx.beginPath();
           ctx.arc(60, 60, 25, 0, 2*Math.PI);
           ctx.fill();
        }
        ctx.restore();
      }
    }, {
      id: 'pointLabels',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = 'white';

        chart.data.datasets.forEach((meta, datasetIndex) => {
          if (meta.pointRadius === 8) {
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
  }
  
  const datasets = [];
  
  if (curveData.length > 0) {
    datasets.push({
      type: 'line',
      data: curveData,
      borderColor: '#2F2F2F',
      borderWidth: 3,
      pointRadius: 0,
      tension: 0.1,
      fill: { value: -1000 }, 
      backgroundColor: '#3b82f640'
    });
  }
  
  if (controlPts.length > 0) {
    datasets.push({
      type: 'scatter',
      data: controlPts,
      backgroundColor: '#FF6B6B',
      borderColor: 'white',
      borderWidth: 2,
      pointRadius: 8,
      pointHoverRadius: 10
    });
  }
  
  if (interpPts.length > 0) {
    datasets.push({
      type: 'scatter',
      data: interpPts,
      backgroundColor: 'yellow',
      borderColor: 'orange',
      borderWidth: 1,
      pointRadius: 7,
      pointStyle: 'rectRot'
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
    carT += carSpeed * 0.002 * dt;
    if (carT > plotMaxX - 0.2) carT = plotMinX + 0.2;
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
  const dy = p2.y - p1.y;
  const dx = p2.x - p1.x;
  const slopeRad = Math.atan2(-dy, dx);
  return { y, slopeDeg: slopeRad * 180 / Math.PI };
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
    setText('nerd-anim', '—');
    setText('nerd-drag', dragEnabled ? 'on' : 'off');
    return;
  }
  const carInfo = evalAtCarT();
  setText('nerd-cart', carT != null ? carT.toFixed(3) : '—');
  setText('nerd-px', carInfo ? carInfo.y.toFixed(3) : '—');
  setText('nerd-slope', carInfo ? carInfo.slopeDeg.toFixed(2) : '—');
  setText('nerd-curve-info', `${curveData.length} pts`);
  setText('nerd-xrange', `[${plotMinX.toFixed(2)}, ${plotMaxX.toFixed(2)}]`);
  if (myChart && myChart.options && myChart.options.scales) {
    const ys = myChart.options.scales.y;
    setText('nerd-yscale', `[${ys.min?.toFixed?.(2) ?? '?'}, ${ys.max?.toFixed?.(2) ?? '?'}] (±15% pad)`);
  }
  setText('nerd-dt', lastDt.toFixed(1));
  const inc = carSpeed * 0.002 * lastDt;
  setText('nerd-anim', `${carSpeed.toFixed(2)} × 0.002 × ${lastDt.toFixed(1)} = ${inc.toFixed(4)}`);
  setText('nerd-drag', dragEnabled ? (dragIdx >= 0 ? `dragging pt ${dragIdx + 1}` : 'on') : 'off');
}
