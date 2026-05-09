# MAT — Newton's Divided Differences Calculator

An interactive R Shiny web application for polynomial interpolation using **Newton's Divided Differences**. Features a modern Shadcn-inspired UI, real-time chart visualization with Chart.js, MathJax equation rendering, and a "car fuel" game mode.

---

## Architecture Overview

This app uses a **hybrid R + vanilla web** architecture:

- **R / Shiny (Backend):** Handles complex numerical computations—divided differences, polynomial evaluation, LaTeX equation generation, and reactive data flow.
- **HTML / JS / CSS (Frontend):** Manages UI rendering, DOM manipulation, Chart.js plotting, MathJax typesetting, and interactive simulations.

---

## Project Structure

```text
MAT/
├── app.R              # Shiny entry point (loads www/index.html)
├── global.R           # Core math: divided_differences(), newton_eval(), newton_latex()
│
├── www/               # Frontend Assets (Served as root '/')
│   ├── index.html     # Main UI Template (Shadcn/Tailwind UI)
│   ├── state.js       # Global JS state management
│   ├── ui.js          # UI interactions & MathJax buffering
│   ├── chart.js       # Chart.js logic & Car animation loop
│   ├── tables.js      # Interactive data tables logic
│   └── steps.js       # Step-by-step calculation renderer
│
├── docs/              # Reference materials & Legacy versions
└── README.md          # Project documentation
```

### Folder Descriptions

- **Root Directory:** Contains the primary R scripts (`app.R`, `global.R`). The backend handles all numerical computations and sends results to the frontend via Shiny custom messages.
- **www/:** The heart of the frontend. It contains the `index.html` template and all JavaScript modules that handle the application's reactivity, visualization, and user interface.
- **docs/:** Stores documentation, original activity submissions, and older versions of the application for reference.

---

## Running the App

To run the application locally, ensure you have the required R packages installed (`shiny`, `DT`, `htmltools`), then execute:

```r
# Open the project in RStudio and run:
shiny::runApp()
```

---

## External Dependencies

The application leverages several modern libraries via CDN:
- **Tailwind CSS:** For styling and layout.
- **Chart.js:** For interactive data visualization.
- **MathJax 3:** For rendering high-quality mathematical equations.
- **Lucide Icons:** For the UI icon system.
- **Inter Font:** For modern typography.

