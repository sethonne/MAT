# app.R — htmlTemplate Entry Point
source("global.R")

ui <- htmlTemplate(
  "www/index.html"
)

server <- function(input, output, session) {
  rv <- reactiveValues(
    data_points = local({
      n_pts <- 3
      max_x <- 3
      max_y <- 10
      interval <- max_x / n_pts

      data.frame(
        x = round(sapply(1:n_pts, function(i) runif(1, (i - 1) * interval, i * interval)), 2),
        y = round(runif(n_pts, 0, max_y), 2)
      )
    }),
    interp_points = data.frame(x = c(0)),
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
      # Server-side safety cap (mirrors MAX_POINTS in tables.js)
      if (nrow(df) > 20) df <- df[1:20, ]
      # Clamp to sane range (mirrors MIN_VAL/MAX_VAL in tables.js)
      df$x <- pmax(pmin(df$x, 10000), -10000)
      df$y <- pmax(pmin(df$y, 10000), -10000)
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
    if (length(x_vals) > 10) x_vals <- x_vals[1:10]
    x_vals <- pmax(pmin(x_vals, 10000), -10000)
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
      session$sendCustomMessage("update_steps_data", list(error = TRUE))
      return()
    }

    min_x_data <- min(pts$x)
    max_x_data <- max(pts$x)
    range_x <- max_x_data - min_x_data
    if (range_x == 0) range_x <- 1

    # functional +- padding depending on data point spread
    padding <- max(1, range_x * 0.05)

    min_x <- min_x_data - padding
    max_x <- max_x_data + padding
    xs <- seq(min_x, max_x, length.out = 800)
    ys <- newton_eval(res, xs)

    ip_y <- numeric(0)
    ip_err <- numeric(0)
    if (length(ip_x) > 0) {
      ip_y <- newton_eval(res, ip_x)
      ip_err <- newton_error_bound(res, ip_x)
    }

    # Convert DD table matrix to list-of-lists for JSON
    dd_rows <- lapply(1:nrow(res$table), function(r) {
      as.list(unname(res$table[r, ]))
    })

    session$sendCustomMessage("update_plot_data", list(
      error = FALSE,
      xs = xs,
      ys = ys,
      pts_x = pts$x,
      pts_y = pts$y,
      interp_x = ip_x,
      interp_y = ip_y,
      interp_err = ip_err,
      min_x = min_x,
      max_x = max_x
    ))

    # Send DD data for step-by-step rendering in JS
    session$sendCustomMessage("update_steps_data", list(
      error = FALSE,
      pts_x = pts$x,
      pts_y = pts$y,
      dd_table = dd_rows,
      dd_coeffs = res$coeffs
    ))
  })


  # Ensure outputs render even when hidden in inactive tabs
}

shinyApp(ui = ui, server = server)
