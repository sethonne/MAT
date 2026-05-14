// ── Physical Constants ────────────────────────────────────────────
const airDensity = 1.225; // kg/m³
const dragCoeff = 0.3; // Modern car Cd
const frontalArea = 2.2; // m²
const rollingResistCoeff = 0.66; // Boosted for noticeable effect

/**
 * Evaluates the curve and its derivative at the car's current T position.
 * Returns { y, slopeDeg, slopeMath, direction }
 * This version uses pure mathematical interpolation.
 */
function evalAtCarT() {
  if (!curveData || curveData.length < 2 || carT == null) return null;
  
  // Find segment
  let idx = 0;
  while (idx < curveData.length - 1 && curveData[idx].x < carT) idx++;
  const p1 = curveData[Math.max(0, idx - 1)];
  const p2 = curveData[idx];
  
  if (!p1 || !p2) return null;
  
  const denom = p2.x - p1.x;
  const factor = denom === 0 ? 0 : (carT - p1.x) / denom;
  const y = p1.y + factor * (p2.y - p1.y);
  
  // Mathematical derivative (slope)
  const slopeMath = denom === 0 ? 0 : (p2.y - p1.y) / denom;
  
  // Mathematical angle (Inverted Y for chart space if needed, but here we use math convention)
  // Newton curves increase Y upwards mathematically, but canvas Y increases downwards.
  // We use atan2 with negative DY to match the visual "up is positive" math.
  const slopeRad = Math.atan2(-(p2.y - p1.y), p2.x - p1.x);
  const slopeDeg = slopeRad * 180 / Math.PI;
  
  return { y, slopeDeg, slopeMath, direction: carDirection };
}

/**
 * Primary physics integration loop.
 * Updates carVelocity and carT based on forces.
 */
function updatePhysics(dt) {
  if (!gameMode || !playing || !plotData || plotData.error || !curveData || curveData.length === 0) return;

  const evalData = evalAtCarT();
  const slopeRad = evalData ? evalData.slopeDeg * Math.PI / 180 : 0;
  
  // Physics constants relative to plot scale
  const physicsScale = (plotMaxX - plotMinX) / 10.0;
  // Engine vs. gravity ratio sets the climb limit. 0.00075 / 0.0008 → engine alone
  // can sustain motion up to ~18° slope; anything steeper stalls and requires momentum
  // banked from a previous downhill. Don't push enginePower close to gravityConst —
  // that re-introduces "hold D wins everywhere" which is what L2+ is meant to forbid.
  const enginePower = 0.00075 * carSpeed * physicsScale;
  const gravityConst = 0.0008 * carSpeed * physicsScale;
  
  const steps = dt / 16;
  const v = carVelocity;

  // Force-Summation Model
  // 0. Fuel Logic
  const engineOn = engineDirection !== 0 && fuel > 0;
  
  // Faster consumption when pressing keys — engine should be expensive enough that
  // holding D through a whole level isn't viable; player has to coast.
  if (engineDirection !== 0 && fuel > 0) {
    fuel -= 0.5 * steps;
  }
  // Passive consumption when moving
  if (Math.abs(v) > 0.001 && fuel > 0) {
    fuel -= 0.05 * Math.abs(v) * steps;
  }
  
  if (fuel < 0) fuel = 0;
  
  // Fuel Collection
  fuelCans.forEach(can => {
    if (!can.collected) {
      const dx = carT - can.x;
      // Simple collision check (distance < 0.3)
      if (Math.abs(dx) < 0.3) {
        can.collected = true;
        fuel = Math.min(100, fuel + 15);
      }
    }
  });

  // 1. Normal Force (N)
  const N = gravityConst * Math.cos(slopeRad);

  // 2. Longitudinal Gravity (a_g)
  const a_g = gravityConst * Math.sin(slopeRad);

  // 3. Aerodynamic Drag (a_drag)
  const dragMultiplier = 0.02 * physicsScale; 
  const a_drag = -0.5 * airDensity * dragCoeff * frontalArea * v * Math.abs(v) * dragMultiplier;

  // 4. Rolling Resistance (a_rr)
  const a_rr = -(rollingResistCoeff * N) * Math.sign(v);

  // Store for debug panel
  lastGravAccel = a_g;
  lastEngAccel = engineOn ? (engineDirection * enginePower) : 0;
  lastDragAccel = a_drag + a_rr;

  const totalAccel = lastEngAccel + a_g + a_drag + a_rr;
  carVelocity += totalAccel * steps;
  
  const oldT = carT;
  carT += carVelocity * steps;
  
  // Update table highlighting if available
  if (typeof updateTableHighlight === 'function') {
    updateTableHighlight(carT, oldT);
  }

  // Update facing direction based on velocity
  if (carVelocity > 0.01) carDirection = 1;
  else if (carVelocity < -0.01) carDirection = -1;

  // Bounce back at edges
  const edgeL = plotMinX + 0.2;
  const edgeR = plotMaxX - 0.2;
  if (carT > edgeR) {
    carT = edgeR;
    carVelocity = -Math.abs(carVelocity) * 0.5; // lose 50% energy on bounce
  } else if (carT < edgeL) {
    carT = edgeL;
    carVelocity = Math.abs(carVelocity) * 0.5;
  }
}
