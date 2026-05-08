# app.R — htmlTemplate Entry Point
source("global.R")

ui <- htmlTemplate(
  "template.html",
  steps_output     = uiOutput("steps_output"),
  dd_table         = DTOutput("dd_table")
)

server <- function(input, output, session) {
  rv <- reactiveValues(
    data_points = data.frame(x = c(0, 2, 4), y = c(2, 0, 3)),
    interp_points = data.frame(x = c(3.5)),
    calc_trigger = 1,
    interp_trigger = 1
  )

  observeEvent(input$client_data_points, {
    pts <- input$client_data_points
    if (is.null(pts)) {
      return()
    }

    if (is.data.frame(pts)) {
      df <- pts
    } else if (is.list(pts) && length(pts) > 0) {
      df <- do.call(rbind, lapply(pts, as.data.frame))
    } else if (is.numeric(pts) && !is.null(names(pts))) {
      x_vals <- pts[names(pts) == "x"]
      y_vals <- pts[names(pts) == "y"]
      if (length(x_vals) == length(y_vals)) {
        df <- data.frame(x = as.numeric(x_vals), y = as.numeric(y_vals))
      } else {
        return()
      }
    } else if (is.matrix(pts)) {
      df <- as.data.frame(pts)
      if (ncol(df) == 2) names(df) <- c("x", "y")
    } else {
      return()
    }

    if (nrow(df) > 0 && "x" %in% names(df) && "y" %in% names(df)) {
      # Ensure numeric
      df$x <- as.numeric(df$x)
      df$y <- as.numeric(df$y)
      rv$data_points <- df

      if (is.null(input$auto_calc) || isTRUE(input$auto_calc)) {
        rv$calc_trigger <- rv$calc_trigger + 1
      }
    }
  })

  observeEvent(input$calc_btn, {
    rv$calc_trigger <- rv$calc_trigger + 1
  })

  dd_result <- reactive({
    req(rv$calc_trigger)
    isolate({
      x_vals <- rv$data_points$x
      y_vals <- rv$data_points$y
    })
    if (length(unique(x_vals)) != length(x_vals)) {
      return(NULL)
    }
    divided_differences(x_vals, y_vals)
  })

  # --- Equation ---
  eq_str <- reactive({
    res <- dd_result()
    if (is.null(res)) {
      return("$$P(x) = \\text{Error: Duplicate X values}$$")
    }
    paste0("$$", newton_latex(res), "$$")
  })
  observe({
    str <- eq_str()
    session$sendCustomMessage("update_equation_text", str)
  })

  observeEvent(input$client_interp_x, {
    x_vals <- as.numeric(input$client_interp_x)
    if (length(x_vals) > 0) {
      rv$interp_points <- data.frame(x = x_vals)
      if (is.null(input$auto_calc) || isTRUE(input$auto_calc)) {
        rv$interp_trigger <- rv$interp_trigger + 1
      }
    }
  })
  # --- Send Data to Client for Animation ---
  observe({
    force_run <- rv$calc_trigger
    force_run_interp <- rv$interp_trigger
    res <- dd_result()
    pts <- isolate(rv$data_points)
    ip_x <- isolate(rv$interp_points$x)

    if (is.null(res) || nrow(pts) < 2) {
      session$sendCustomMessage("update_plot_data", list(error = TRUE))
      return()
    }

    min_x <- min(pts$x)
    max_x <- max(pts$x)
    xs <- seq(min_x, max_x, length.out = 800)
    ys <- newton_eval(res, xs)

    ip_y <- numeric(0)
    if (length(ip_x) > 0) {
      ip_y <- newton_eval(res, ip_x)
    }

    session$sendCustomMessage("update_plot_data", list(
      error = FALSE,
      xs = xs,
      ys = ys,
      pts_x = pts$x,
      pts_y = pts$y,
      interp_x = ip_x,
      interp_y = ip_y,
      min_x = min_x,
      max_x = max_x
    ))
  })

  # --- DD Table ---
  output$dd_table <- renderDT({
    res <- dd_result()
    if (is.null(res)) {
      return(NULL)
    }
    df <- as.data.frame(res$table)
    df[] <- lapply(df, function(x) round(x, 4))
    colnames(df) <- c("f(x)", paste0("Order ", seq_len(ncol(df) - 1)))
    df <- cbind(X = res$x, df)
    datatable(df, options = list(dom = "t", paging = FALSE, ordering = FALSE), rownames = FALSE)
  })

  # --- Steps ---
  output$steps_output <- renderUI({
    res <- dd_result()
    if (is.null(res)) {
      return(tags$div(class = "text-center text-muted-foreground p-8", tags$h3("Awaiting calculation...", class = "text-lg font-medium"), tags$p("Input data points and calculate to see steps.")))
    }
    n <- length(res$x)
    coeffs <- res$coeffs
    step_cards <- lapply(seq_len(n), function(i) {
      if (i == 1) {
        val <- paste0("$$f[x_0] = y_0 = ", round(coeffs[i], 4), "$$")
      } else {
        val <- paste0("$$f[x_0, \\dots, x_{", i - 1, "}] = ", round(coeffs[i], 4), "$$")
      }
      tags$div(
        class = "rounded-lg border bg-card p-4 mb-3",
        tags$h4(paste("Order", i - 1), class = "font-semibold text-sm mb-2 text-muted-foreground"),
        tags$div(class = "text-center", HTML(val))
      )
    })
    tagList(step_cards)
  })

  # Ensure outputs render even when hidden in inactive tabs
  outputOptions(output, "steps_output", suspendWhenHidden = FALSE)
  outputOptions(output, "dd_table", suspendWhenHidden = FALSE)
}

shinyApp(ui = ui, server = server)
