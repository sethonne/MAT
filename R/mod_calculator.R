utils::globalVariables(c("tags", "divided_differences", "newton_latex", "newton_eval", "show_eq_modal"))
library(shiny)
library(bslib)
library(bsicons)
library(shinyjs)

mod_calculator_ui <- function(id) {
  ns <- NS(id)
  tags$div(
    class = "d-flex flex-column gap-4",
    # Calculator Inputs
    card(
      card_header(
        class = "d-flex align-items-center justify-content-between fw-semibold",
        "Calculator Inputs"
      ),
      card_body(
        tags$div(
          class = "d-flex align-items-center justify-content-between mb-2",
          tags$label("Data Points", class = "fw-medium"),
          input_switch(ns("auto_calc"), "Auto-calc", value = TRUE)
        ),
        uiOutput(ns("data_points_ui")),
        actionButton(ns("add_row"), tagList(bs_icon("plus"), "Add Data Point"), class = "btn btn-outline-secondary w-100 btn-sm mt-2 border-dashed"),
        hidden(
          actionButton(ns("calc_btn"), tagList(bs_icon("play"), "Calculate"), class = "btn btn-primary w-100 mt-4")
        ),
        tags$div(
          class = "mt-3 p-2 bg-light rounded text-muted small d-flex gap-2 align-items-start",
          bs_icon("exclamation-triangle", class = "text-warning mt-1"),
          tags$p(tags$strong("Computational Limits:"), " High degree polynomials may cause performance issues.", class = "mb-0")
        )
      )
    ),

    # Results Card
    card(
      id = ns("results_card"),
      card_body(
        # Equation Container
        tags$div(
          id = ns("results_equation_container"),
          class = "mb-4",
          tags$div(
            class = "d-flex align-items-center justify-content-between mb-2",
            tags$span("Resulting Equation \\(P_n(x)\\)", class = "fw-medium text-muted small"),
            actionLink(ns("view_full_eq_btn"), tagList(bs_icon("arrows-angle-expand"), "View Full"), class = "small text-primary text-decoration-none")
          ),
          tags$div(
            class = "mathjax-container text-center",
            uiOutput(ns("eq_text_sidebar"))
          ),
          tags$hr(class = "my-4")
        ),

        # Live Interpolation
        tags$div(
          class = "d-flex align-items-center justify-content-between mb-2",
          tags$h6("Live Interpolation", class = "fw-semibold mb-0")
        ),
        tags$p("Add points below to interpolate. Input \\(X\\) to compute \\(Y\\).", class = "small text-muted mb-3"),
        uiOutput(ns("interp_points_ui")),
        actionButton(ns("add_interp_row"), tagList(bs_icon("plus"), "Add Interpolation Point"), class = "btn btn-outline-secondary w-100 btn-sm mt-2 border-dashed")
      )
    )
  )
}

mod_calculator_server <- function(id, rv, active_right_tab) {
  moduleServer(id, function(input, output, session) {
    ns <- session$ns

    # Logic to show/hide calc button
    observe({
      shinyjs::toggle("calc_btn", condition = !input$auto_calc)
    })

    # Logic to show/hide equation container in sidebar based on active right tab
    observe({
      req(active_right_tab())
      if (active_right_tab() == "plot") {
        shinyjs::hide("results_equation_container")
      } else {
        shinyjs::show("results_equation_container")
      }
    })

    output$data_points_ui <- renderUI({
      req(rv$data_points)
      n <- nrow(rv$data_points)

      rows <- lapply(seq_len(n), function(i) {
        tags$tr(
          tags$td(class = "p-0 border-end", tags$input(type = "number", class = "input-cell", id = ns(paste0("dp_x_", i)), value = rv$data_points$x[i], onchange = sprintf("Shiny.setInputValue('%s', this.value)", ns(paste0("dp_x_", i))))),
          tags$td(class = "p-0 border-end", tags$input(type = "number", class = "input-cell", id = ns(paste0("dp_y_", i)), value = rv$data_points$y[i], onchange = sprintf("Shiny.setInputValue('%s', this.value)", ns(paste0("dp_y_", i))))),
          tags$td(class = "p-0 text-center", actionButton(ns(paste0("rm_dp_", i)), bs_icon("x"), class = "btn btn-link text-danger p-0 border-0 m-0", onclick = sprintf("Shiny.setInputValue('%s', %d, {priority: 'event'})", ns("rm_dp"), i)))
        )
      })

      tags$div(
        class = "table-responsive border rounded",
        tags$table(
          class = "table table-borderless table-sm mb-0",
          tags$thead(
            class = "table-muted-header",
            tags$tr(
              tags$th("X", class = "text-center border-end w-50"),
              tags$th("Y", class = "text-center border-end w-50"),
              tags$th("", class = "w-auto")
            )
          ),
          tags$tbody(class = "divide-y", rows)
        )
      )
    })

    observe({
      req(nrow(rv$data_points) > 0)
      for (i in seq_len(nrow(rv$data_points))) {
        x_val <- input[[paste0("dp_x_", i)]]
        y_val <- input[[paste0("dp_y_", i)]]

        changed <- FALSE
        if (!is.null(x_val)) {
          rv$data_points$x[i] <- as.numeric(x_val)
          changed <- TRUE
        }
        if (!is.null(y_val)) {
          rv$data_points$y[i] <- as.numeric(y_val)
          changed <- TRUE
        }

        if (changed && input$auto_calc) {
          rv$calc_trigger <- rv$calc_trigger + 1
        }
      }
    })

    observeEvent(input$add_row, {
      rv$data_points <- rbind(rv$data_points, data.frame(x = 0, y = 0))
      if (input$auto_calc) rv$calc_trigger <- rv$calc_trigger + 1
    })

    observeEvent(input$rm_dp, {
      idx <- as.numeric(input$rm_dp)
      if (nrow(rv$data_points) > 1 && !is.na(idx)) {
        rv$data_points <- rv$data_points[-idx, ]
        if (input$auto_calc) rv$calc_trigger <- rv$calc_trigger + 1
      }
    })

    observeEvent(input$calc_btn, {
      rv$calc_trigger <- rv$calc_trigger + 1
    })

    dd_result <- reactive({
      req(rv$calc_trigger) # triggers on change
      x_vals <- rv$data_points$x
      y_vals <- rv$data_points$y
      if (length(unique(x_vals)) != length(x_vals)) {
        return(NULL)
      }
      divided_differences(x_vals, y_vals)
    })

    eq_ui <- reactive({
      res <- dd_result()
      if (is.null(res)) {
        return("$$P(x) = \\text{Error: Duplicate X values}$$")
      }
      latex_str <- newton_latex(res)
      paste0("$$", latex_str, "$$")
    })

    output$eq_text_sidebar <- renderUI({
      HTML(eq_ui())
    })

    observeEvent(input$view_full_eq_btn, {
      show_eq_modal(eq_ui())
    })

    output$interp_points_ui <- renderUI({
      req(rv$interp_points)
      n <- nrow(rv$interp_points)

      res <- dd_result()
      y_eval <- rep(NA, n)
      if (!is.null(res)) {
        y_eval <- newton_eval(res, rv$interp_points$x)
      }

      rows <- lapply(seq_len(n), function(i) {
        y_val <- if (is.na(y_eval[i])) "..." else round(y_eval[i], 4)
        tags$tr(
          tags$td(class = "p-0 border-end bg-white", tags$input(type = "number", class = "input-cell font-monospace text-sm", id = ns(paste0("ip_x_", i)), value = rv$interp_points$x[i], onchange = sprintf("Shiny.setInputValue('%s', this.value)", ns(paste0("ip_x_", i))))),
          tags$td(class = "p-0 border-end bg-light", tags$input(type = "text", class = "input-cell font-monospace text-sm fw-bold text-primary", readonly = NA, value = y_val)),
          tags$td(class = "p-0 text-center", actionButton(ns(paste0("rm_ip_", i)), bs_icon("x"), class = "btn btn-link text-danger p-0 border-0 m-0", onclick = sprintf("Shiny.setInputValue('%s', %d, {priority: 'event'})", ns("rm_ip"), i)))
        )
      })

      tags$div(
        class = "table-responsive border rounded",
        tags$table(
          class = "table table-borderless table-sm mb-0",
          tags$thead(
            class = "table-muted-header",
            tags$tr(
              tags$th("Evaluate at X", class = "text-center border-end w-50"),
              tags$th("Result Y", class = "text-center border-end w-50"),
              tags$th("", class = "w-auto")
            )
          ),
          tags$tbody(class = "divide-y", rows)
        )
      )
    })

    observe({
      req(nrow(rv$interp_points) > 0)
      for (i in seq_len(nrow(rv$interp_points))) {
        x_val <- input[[paste0("ip_x_", i)]]
        if (!is.null(x_val)) {
          rv$interp_points$x[i] <- as.numeric(x_val)
        }
      }
    })

    observeEvent(input$add_interp_row, {
      rv$interp_points <- rbind(rv$interp_points, data.frame(x = 0))
    })

    observeEvent(input$rm_ip, {
      idx <- as.numeric(input$rm_ip)
      if (nrow(rv$interp_points) > 1 && !is.na(idx)) {
        rv$interp_points <- rv$interp_points[-idx, , drop = FALSE]
      }
    })

    list(dd_result = dd_result, eq_ui = eq_ui)
  })
}
