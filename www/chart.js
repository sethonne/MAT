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
  controlPts = ensureArray(msg.pts_x).map((x, i) => ({x: x, y: ensureArray(msg.pts_y)[i]}));
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
    
    const pixelPerX = xAxis.getPixelForValue(1) - xAxis.getPixelForValue(0);
    const pixelPerY = yAxis.getPixelForValue(0) - yAxis.getPixelForValue(1); 
    
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    
    const lift = 0.32 * pixelPerY;
    ctx.translate(0, -lift);
    
    const cw = 1.6 * pixelPerX;
    const ch = 0.5 * pixelPerY;
    
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
    }]
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
function animateLoop(time) {
  if (gameMode && playing && plotData && !plotData.error && curveData.length > 0) {
    const dt = (time - lastTime) || 16;
    carT += carSpeed * 0.002 * dt;
    if (carT > plotMaxX - 0.2) carT = plotMinX + 0.2;
    if (myChart) myChart.update('none');
  }
  lastTime = time;
  requestAnimationFrame(animateLoop);
}
requestAnimationFrame(animateLoop);
