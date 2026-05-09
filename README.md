# MAT — Newton's Divided Differences Calculator

An interactive R Shiny web application for polynomial interpolation using **Newton's Divided Differences**. Features a modern Shadcn-inspired UI, real-time chart visualization with Chart.js, MathJax equation rendering, and a "car fuel" game mode.

---

## Architecture Overview

This app uses a **hybrid R + vanilla web** architecture:

| Layer | Responsibility |
|---|---|
| **R / Shiny** (backend) | Complex numerical computation — divided differences, polynomial evaluation, LaTeX equation generation, and reactive data flow. |
| **HTML / JS / CSS** (frontend) | All UI rendering, DOM manipulation, animations, Chart.js plotting, MathJax typesetting, user input handling, and lightweight/constant simulation (car animation, point dragging). |

> [!IMPORTANT]
> **Design principle:** R still owns the math. JS handles the _presentation_ of that math and any straightforward, constant-time simulation (e.g. the car animation loop). For anything numerically complex (divided difference tables, polynomial evaluation across 800 sample points, LaTeX generation), the R server does the work and sends results to the client via Shiny custom messages.

---

## Project Structure

```
MAT/
├── app.R                  # Shiny entry point — UI definition (htmlTemplate) + server logic
├── global.R               # Global R functions: divided_differences(), newton_eval(), newton_latex()
├── template.html          # Full HTML template — Shadcn/Tailwind UI, MathJax, Chart.js canvas
│
├── R/
│   └── server_logic.R     # Helper R functions (car polygon drawing, SVG icons)
│
├── www/                   # Static frontend assets (served by Shiny)
│   ├── state.js           # Global JS state variables (plotData, dataPoints, carT, flags)
│   ├── ui.js              # UI logic — tab switching, auto-calc toggle, MathJax double-buffering, modals
│   ├── tables.js          # Data points & interpolation points table rendering + CRUD
│   └── chart.js           # Chart.js initialization, curve/point rendering, car plugin, animation loop
│
├── docs/                  # Reference / legacy files
│   ├── index.R            # Earlier version / reference R script
│   ├── template.html      # Earlier version / reference HTML template
│   └── FinalActivity_BorromeoGarciaSamson.R  # Original activity submission
│
├── MAT.Rproj              # RStudio project file
└── .gitignore
```

---

## Key Files Breakdown

### `app.R`
- Defines the Shiny `ui` via `htmlTemplate("template.html", ...)` injecting `uiOutput` and `DTOutput` slots.
- Server: manages `reactiveValues` for data points & interpolation points, listens to client inputs (`client_data_points`, `client_interp_x`), computes divided differences, and pushes results back via `session$sendCustomMessage()`.

### `global.R`
- **`divided_differences(x, y)`** — Builds the full DD table matrix + extracts diagonal coefficients.
- **`newton_eval(dd_result, x_eval)`** — Evaluates the Newton polynomial at arbitrary x values.
- **`newton_latex(dd_result)`** — Generates a LaTeX string of the polynomial for MathJax rendering.

### `template.html`
- Full-page HTML with Shadcn design tokens as CSS custom properties.
- Two main tabs: **Introduction** (definition, applications, input guidelines) and **Calculate & Visualize**.
- Calculate tab has a left sidebar (data point inputs, auto-calc toggle, live interpolation) and a right panel with sub-tabs: **Plot** (Chart.js canvas + car game mode), **Steps** (R-rendered), **Table** (DT-rendered DD table).
- Equation modal for full-screen polynomial view.
- Tailwind CDN config extends the theme with Shadcn color tokens.

### `www/state.js`
Global mutable state: `plotData`, `dataPoints`, `interpX`, chart instance, car animation flags, etc.

### `www/ui.js`
- MathJax double-buffer swap handler (prevents flicker on equation updates).
- Tab/sub-tab switching with proper `data-state` attribute management.
- Auto-calc toggle, settings dropdown, equation modal open/close.

### `www/tables.js`
- `renderDataPoints()` / `renderInterpPoints()` — Dynamically builds editable HTML tables, syncs state back to Shiny via `Shiny.setInputValue()`.
- Add / remove / update CRUD operations.

### `www/chart.js`
- Chart.js scatter + line chart with custom plugins:
  - **`carPlugin`** — Draws a 2D car sprite on the polynomial curve (game mode).
  - **`customBg`** — Sky background + sun.
  - **`pointLabels`** — Numbered labels on control points.
- `animateLoop()` — `requestAnimationFrame` loop driving the car along the curve.

---

## External Dependencies (CDN)

| Library | Purpose |
|---|---|
| [Tailwind CSS](https://cdn.tailwindcss.com) | Utility-first styling (CDN play mode) |
| [Inter Font](https://fonts.googleapis.com) | Typography |
| [Lucide Icons](https://unpkg.com/lucide@latest) | Icon system |
| [Chart.js](https://cdn.jsdelivr.net/npm/chart.js) | Canvas-based charting |
| [MathJax 3](https://cdn.jsdelivr.net/npm/mathjax@3) | LaTeX equation rendering |

---

## Running the App

```r
# From RStudio — open MAT.Rproj, then:
shiny::runApp()
```

Or from terminal:
```bash
Rscript -e "shiny::runApp('.')"
```

Requires R packages: `shiny`, `DT`, `htmltools`.

---

## Data Flow

```
User edits data table (JS)
  → Shiny.setInputValue('client_data_points', ...)
    → R observeEvent parses input → updates rv$data_points
      → reactive dd_result() computes divided differences
        → observe() sends 'update_plot_data' + 'update_equation_text' to client
          → JS updates Chart.js + MathJax double-buffer swap
```
