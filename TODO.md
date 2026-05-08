# TODO — Planned Features

> [!NOTE]
> R handles complex calculations. JS handles UI rendering, formatting, and constant-time simulation. Keep this boundary clean.

---

## 1. 📌 Plot Draggable Points

**Priority:** High

Make each data point on the Chart.js plot **interactable / draggable**. Dragging a point should update the data table, trigger recalculation, and re-render the polynomial curve in real time.

- [ ] Implement `mousedown` / `mousemove` / `mouseup` (+ touch equivalents) hit-testing against chart point elements.
- [ ] On drag, update `dataPoints[i]` in `state.js` and call `Shiny.setInputValue('client_data_points', ...)` to sync.
- [ ] Snap-to-grid option (optional).
- [ ] **Settings toggle:** Add a checkbox in the settings dropdown to **enable/disable** draggable points (`#chk-drag-pts` already exists in `template.html` — wire it up to actually guard the drag logic).
- [ ] Visual feedback: cursor change on hover, highlight ring on active drag, coordinate tooltip near cursor while dragging.

---

## 2. 📝 Step-by-Step Solution

**Priority:** High

Replace the current minimal steps output with a **complete, verbose, non-redundant** step-by-step walkthrough showing every divided difference computation.

### Structure:

1. **Step 1 — First-order divided differences** (between every pair of consecutive points)
   - Show formula with values plugged in:  
     `f[x₀, x₁] = (f[x₁] - f[x₀]) / (x₁ - x₀) = (0 - 2) / (2 - 0) = -1`
   - List all first-order results.

2. **Step 2 — Second-order divided differences** (using the first-order results)
   - Reference the previously computed values (non-redundant):  
     `f[x₀, x₁, x₂] = (f[x₁, x₂] - f[x₀, x₁]) / (x₂ - x₀) = (1.5 - (-1)) / (4 - 0) = 0.625`
   - Each step uses results from the prior step, not re-deriving from scratch.

3. **...** (ellipsis for intermediate orders when `n` is large)

4. **Step n — Final (n-1)th-order divided difference**

5. **Final Product — The Newton Polynomial**
   - Show `P(x) = f[x₀] + f[x₀,x₁](x - x₀) + f[x₀,x₁,x₂](x - x₀)(x - x₁) + ...`
   - With actual coefficient values plugged in.

### Display Rules:
- If the number of steps exceeds a threshold (e.g., > 5 orders), **collapse middle steps** behind an ellipsis with an "Expand all" toggle.
- Each step card should show: order label, formula template, values plugged in, and result.
- Use MathJax for formula rendering.
- This logic can live in **JS** (formatting/presentation) but the **DD table data comes from R**.

---

## 3. 📊 Interpolation Error Bound

**Priority:** Medium

Add an **error estimation** for interpolated points, analogous to the Lagrange remainder / Newton form error bound.

- [ ] Display the error formula:  
  `E(x) = f[x₀, x₁, ..., xₙ, x] · ∏(x - xᵢ)`
- [ ] For each interpolation point, show the estimated error magnitude (requires the next-order divided difference or a known `f^(n+1)` bound).
- [ ] If the true function is unknown (just data points), note that the error bound is an approximation based on the next DD term.
- [ ] Show error value in the interpolation results table (new column).
- [ ] R computes the error; JS renders it.

---

## 4. 📋 Divided Difference Summary Tables

**Priority:** Medium

Enhance the existing DD table tab with a **step-by-step summary view** that breaks down the full DD table into digestible chunks.

### Layout:
- Show sub-tables: "Order 1" (pairs), "Order 2" (triples), ..., "Order n-1".
- Each sub-table lists the inputs, the formula applied, and the resulting value.
- **Ellipsis rule:** If there are more than **4–5 columns** of divided differences, collapse intermediate columns with `⋯` and show only the first 2 and last 2 orders. Provide an "Expand" button to reveal all.
- Same ellipsis logic for **rows** if the number of data points is large.

---

## 5. 🤓 "Show All Formulas" (Nerd Mode) Button

**Priority:** Low

A toggle button (e.g., in the header or settings) that reveals **all current calculations being performed by JS**, especially useful for the car simulation.

### What to show:
- Current polynomial evaluation: `P(x) = ...` with live `x` value from car position.
- Car physics: `slope = atan2(dy, dx)`, pixel interpolation formulas.
- Curve sampling: "800 points from x_min to x_max via `newton_eval()`".
- Chart scale calculations: `yMin`, `yMax`, padding math.
- Animation: `carT += speed * 0.002 * dt`.

### UI:
- Floating panel or slide-out drawer.
- Each formula block is collapsible.
- Live-updating values highlighted (e.g., pulsing text or color change on value change).

---

## 6. 🚧 Input Limits & Validation

**Priority:** High

Add hard caps on data point count and value ranges to prevent performance degradation and numerical instability.

- [ ] **Max data points:** Cap at a reasonable limit (e.g., **20 points**). Disable "Add Data Point" button when limit is reached. Show a tooltip explaining why.
- [ ] **Value range:** Restrict X and Y inputs to a sane range (e.g., `-10000 ≤ x, y ≤ 10000`). Clamp or reject out-of-range values with inline validation feedback.
- [ ] **Duplicate X detection:** Already partially handled (`length(unique(x_vals)) != length(x_vals)` in R). Surface this as a clear inline error in the data table (highlight the offending row red).
- [ ] **Interpolation point limits:** Similar cap (e.g., **10 interpolation points**).
- [ ] Enforce limits in **both JS (client-side UX)** and **R (server-side safety)**.

---

## Implementation Notes

| Feature | JS Responsibility | R Responsibility |
|---|---|---|
| Draggable points | All drag logic, hit detection, visual feedback, state sync | Receives updated points, recomputes DD |
| Step-by-step | Formatting, MathJax rendering, collapse/expand UI | Provides the DD table + coefficients |
| Error bound | Display + formatting | Compute error terms |
| Summary tables | Rendering, ellipsis logic, expand/collapse | Provides raw DD matrix |
| Nerd mode formulas | Everything — read from live JS state | N/A (these are JS-side computations) |
| Input limits | Client-side enforcement, UI feedback | Server-side validation fallback |
