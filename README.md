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

## Getting Started & Running the App

You can run this application in two ways:

### Option 1: Run Locally (Development)

1. **Download/Clone** this repository to your machine.
2. Ensure you have the required R packages installed:
   ```r
   install.packages(c("shiny", "DT", "htmltools"))
   ```
3. Open the project folder in **RStudio**.
4. Open the `app.R` file and click the **"Run App"** button at the top of the editor, or execute:
   ```r
   shiny::runApp()
   ```

### Option 2: Run Directly from GitHub

You can launch the latest version of the app directly from the R console without manual downloading:

```r
if (!require("shiny")) install.packages("shiny")
shiny::runGitHub("MAT", "sethonne")
```

---

## Quick Setup Script

For a completely automated setup, you can use the included `setup.R` script:

1. Open `setup.R`.
2. Run the script to automatically install dependencies and launch the app.

---

## External Dependencies

The application leverages several modern libraries via CDN:

- **Tailwind CSS:** For styling and layout.
- **Chart.js:** For interactive data visualization.
- **MathJax 3:** For rendering high-quality mathematical equations.
- **Lucide Icons:** For the UI icon system.
- **Inter Font:** For modern typography.

---

## Development Team

- **JAPETH T. GUZON** — Project concept, mathematical verification & QA
- **MATTHEW CEDRIC D. CALAYCAY** — UI architecture, simulation engine & QA
- **PHILIP ISIDRO J. GO** — UI enhancements & visual refinements
- **SAMUEL ETHAN S. BONGHANOY** — Interactive features & gameplay QA
- **VENZHOWER M. MANLANGIT** — Logic implementation & mathematical corrections
