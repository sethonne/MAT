utils::globalVariables(c(
  "app_theme", "page_header_ui",
  "mod_intro_ui", "mod_calculator_ui",
  "mod_plot_ui", "mod_steps_ui", "mod_table_ui",
  "mod_calculator_server", "mod_plot_server",
  "mod_steps_server", "mod_table_server",
  "useShinyjs"
))

# app.R
source("global.R")

ui <- page_navbar(
  title = div(
    class = "d-flex align-items-center gap-2",
    bs_icon("calculator", class = "text-primary"),
    span("Polynomial Interpolation", class = "fw-semibold tracking-tight")
  ),
  theme = app_theme,
  fillable = FALSE,
  header = tagList(
    useShinyjs(),
    tags$head(
      tags$script(src = "https://polyfill.io/v3/polyfill.min.js?features=es6"),
      tags$script(
        id = "MathJax-script", async = NA,
        src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
      ),
      tags$script(src = "custom.js")
    )
  ),

  # Page Header Content
  page_header_ui(),

  # Intro Tab
  mod_intro_ui("intro"),

  # Calculate & Visualize Tab
  nav_panel(
    title = tagList(
      bs_icon("activity", class = "me-2"), "Calculate & Visualize"
    ),
    tags$div(
      class = "container mx-auto px-4 md:px-8 pb-8",
      layout_columns(
        col_widths = c(4, 8),
        mod_calculator_ui("calc"),
        card(
          class = "h-100",
          navset_card_underline(
            id = "right_tabs",
            mod_plot_ui("plot"),
            mod_steps_ui("steps"),
            mod_table_ui("table")
          )
        )
      )
    )
  )
)

server <- function(input, output, session) {
  # Global Reactive State
  rv <- reactiveValues(
    data_points = data.frame(x = c(0, 2, 4), y = c(2, 0, 3)),
    interp_points = data.frame(x = c(3.5)),
    calc_trigger = 0,
    t = 0.2,
    playing = TRUE
  )

  # Active tab reactive for conditional UI logic in calculator
  active_right_tab <- reactive({
    input$right_tabs
  })

  # Server modules
  calc_res <- mod_calculator_server("calc", rv, active_right_tab)

  dd_result <- calc_res$dd_result
  eq_ui <- calc_res$eq_ui

  mod_plot_server("plot", rv, dd_result, eq_ui)
  mod_steps_server("steps", dd_result)
  mod_table_server("table", dd_result)
}

shinyApp(ui = ui, server = server)
