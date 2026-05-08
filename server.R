server <- function(input, output, session) {
  # Reactive states for dynamic UI
  rv <- reactiveValues(
    data_points = data.frame(x = c(0, 2, 4), y = c(2, 0, 3)),
    interp_points = data.frame(x = c(3.5)),
    calc_trigger = 0,
    t = 0.2,
    playing = TRUE
  )

  # Logic to show/hide calc button
  observe({
    shinyjs::toggle("calc_btn", condition = !input$auto_calc)
  })

  # Logic to show/hide equation container in sidebar based on active right tab
  observe({
    req(input$right_tabs)
    if (input$right_tabs == "plot") {
      shinyjs::hide("results_equation_container")
    } else {
      shinyjs::show("results_equation_container")
    }
  })

  # Render Data Points UI manually using numericInputs
  output$data_points_ui <- renderUI({
    req(rv$data_points)
    n <- nrow(rv$data_points)

    rows <- lapply(1:n, function(i) {
      tags$tr(
        tags$td(
          class = "p-0 border-end",
          tags$input(
            type = "number", class = "input-cell", id = paste0("dp_x_", i),
            value = rv$data_points$x[i],
            onchange = sprintf("Shiny.setInputValue('dp_x_%d', this.value)", i)
          )
        ),
        tags$td(
          class = "p-0 border-end",
          tags$input(
            type = "number", class = "input-cell",
            id = paste0("dp_y_", i), value = rv$data_points$y[i],
            onchange = sprintf("Shiny.setInputValue('dp_y_%d', this.value)", i)
          )
        ),
        tags$td(
          class = "p-0 text-center",
          actionButton(paste0("rm_dp_", i), bs_icon("x"),
            class = "btn btn-link text-danger p-0 border-0 m-0",
            onclick = sprintf(
              "Shiny.setInputValue('rm_dp', %d, {priority: 'event'})", i
            )
          )
        )
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

  # Observe inputs for data points
  observe({
    req(nrow(rv$data_points) > 0)
    for (i in 1:nrow(rv$data_points)) {
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

  # Core Algorithm Computation
  dd_result <- reactive({
    req(rv$calc_trigger) # triggers on change

    x_vals <- rv$data_points$x
    y_vals <- rv$data_points$y

    # Need distinct x values
    if (length(unique(x_vals)) != length(x_vals)) {
      # Handle error or return simple dummy
      return(NULL)
    }

    divided_differences(x_vals, y_vals)
  })

  # Output Equations
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
  output$eq_text_plot <- renderUI({
    HTML(eq_ui())
  })

  # Modal handlers
  show_eq_modal <- function() {
    showModal(modalDialog(
      title = tagList(
        bs_icon("sigma", class = "text-primary me-2"),
        "Full Polynomial Equation"
      ),
      size = "xl",
      easyClose = TRUE,
      tags$div(
        class = "mathjax-container text-center",
        uiOutput("eq_text_modal")
      )
    ))
  }

  output$eq_text_modal <- renderUI({
    HTML(eq_ui())
  })

  observeEvent(input$view_full_eq_btn, {
    show_eq_modal()
  })
  observeEvent(input$view_full_eq_btn_plot, {
    show_eq_modal()
  })


  # Interpolation Table
  output$interp_points_ui <- renderUI({
    req(rv$interp_points)
    n <- nrow(rv$interp_points)

    res <- dd_result()
    y_eval <- rep(NA, n)
    if (!is.null(res)) {
      y_eval <- newton_eval(res, rv$interp_points$x)
    }

    rows <- lapply(1:n, function(i) {
      y_val <- if (is.na(y_eval[i])) "..." else round(y_eval[i], 4)
      tags$tr(
        tags$td(class = "p-0 border-end bg-white", tags$input(type = "number", class = "input-cell font-monospace text-sm", id = paste0("ip_x_", i), value = rv$interp_points$x[i], onchange = sprintf("Shiny.setInputValue('ip_x_%d', this.value)", i))),
        tags$td(class = "p-0 border-end bg-light", tags$input(type = "text", class = "input-cell font-monospace text-sm fw-bold text-primary", readonly = NA, value = y_val)),
        tags$td(class = "p-0 text-center", actionButton(paste0("rm_ip_", i), bs_icon("x"), class = "btn btn-link text-danger p-0 border-0 m-0", onclick = sprintf("Shiny.setInputValue('rm_ip', %d, {priority: 'event'})", i)))
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
    for (i in 1:nrow(rv$interp_points)) {
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

  # --- CAR ANIMATION AND PLOT ---
  observeEvent(input$toggle, {
    rv$playing <- !rv$playing
  })
  observeEvent(input$reset, {
    pts <- rv$data_points
    if (nrow(pts) > 0) rv$t <- min(pts$x) + 0.2
  })

  observe({
    invalidateLater(40, session)
    isolate({
      if (isTRUE(input$game_mode) && rv$playing) {
        pts <- rv$data_points
        if (nrow(pts) > 0) {
          spd <- if (is.null(input$speed)) 1 else input$speed
          rv$t <- rv$t + spd * 0.08
          if (rv$t > max(pts$x) - 0.2) rv$t <- min(pts$x) + 0.2
        }
      }
    })
  })

  draw_rot <- function(cx, cy, xs, ys, angle, col, border = "black", lwd = 1) {
    cs <- cos(angle)
    sn <- sin(angle)
    rx <- cx + xs * cs - ys * sn
    ry <- cy + xs * sn + ys * cs
    polygon(rx, ry, col = col, border = border, lwd = lwd)
  }

  rot_pt <- function(cx, cy, x, y, angle) {
    cs <- cos(angle)
    sn <- sin(angle)
    c(cx + x * cs - y * sn, cy + x * sn + y * cs)
  }

  output$main_plot <- renderPlot({
    res <- dd_result()
    pts <- rv$data_points

    if (is.null(res) || nrow(pts) < 2) {
      plot(NA, xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
      text(5, 5, "Please input distinct X values", col = "red")
      return()
    }

    min_x <- min(pts$x)
    max_x <- max(pts$x)

    # Determine bounds
    # Evaluate polynomial over range
    xs <- seq(min_x, max_x, length.out = 800)
    ys <- newton_eval(res, xs)

    y_min <- min(c(ys, pts$y)) - 2
    y_max <- max(c(ys, pts$y)) + 5

    op <- par(mar = c(0, 0, 0, 0), bg = "#87CEEB")
    on.exit(par(op))

    plot(NA, xlim = c(min_x, max_x), ylim = c(y_min, y_max), xlab = "", ylab = "", xaxs = "i", yaxs = "i", axes = FALSE, asp = 1)

    # Sky
    rect(par("usr")[1], par("usr")[3], par("usr")[2], par("usr")[4], col = "#87CEEB", border = NA)

    # Sun
    symbols(min_x + 1.5, y_max - 1.5, circles = 0.6, inches = FALSE, add = TRUE, bg = "#FFE066", fg = "#FFD43B")

    # Curve (Hill)
    polygon(c(xs, rev(xs)), c(ys, rep(par("usr")[3], length(xs))), col = "#2E8B57", border = "#1F6B41", lwd = 2)

    # Interpolated points from table
    ip_x <- rv$interp_points$x
    if (length(ip_x) > 0) {
      ip_y <- newton_eval(res, ip_x)
      points(ip_x, ip_y, pch = 23, bg = "yellow", col = "orange", cex = 1.5)
    }

    # Control points
    if (isTRUE(input$show_pts)) {
      points(pts$x, pts$y, pch = 21, bg = adjustcolor("red", 0.45), col = "darkred", cex = 1.8)
    }

    # Car Animation
    if (isTRUE(input$game_mode)) {
      t <- rv$t
      cx <- t
      cy <- newton_eval(res, cx)

      h <- 0.01
      dy <- (newton_eval(res, cx + h) - newton_eval(res, cx - h)) / (2 * h)
      angle <- atan(dy)

      lift <- 0.32
      bx <- cx - sin(angle) * lift
      by <- cy + cos(angle) * lift

      car_w <- 1.6
      car_h <- 0.5

      draw_rot(bx, by, c(-car_w / 2, car_w / 2, car_w / 2 - 0.1, -car_w / 2 + 0.1), c(-car_h / 2, -car_h / 2, car_h / 2, car_h / 2), angle, col = "#FF7F2A", lwd = 2)
      draw_rot(bx, by, c(-0.45, 0.35, 0.25, -0.35), c(car_h / 2, car_h / 2, car_h / 2 + 0.4, car_h / 2 + 0.4), angle, col = "#E86A1F", lwd = 2)
      draw_rot(bx, by, c(-0.35, 0.22, 0.15, -0.28), c(car_h / 2 + 0.05, car_h / 2 + 0.05, car_h / 2 + 0.35, car_h / 2 + 0.35), angle, col = "#BEE3F8", lwd = 1)

      wheel_r <- 0.22
      for (wox in c(-car_w / 2 + 0.3, car_w / 2 - 0.3)) {
        w <- rot_pt(bx, by, wox, -car_h / 2, angle)
        symbols(w[1], w[2], circles = wheel_r, inches = FALSE, add = TRUE, bg = "#1a1a1a")
        symbols(w[1], w[2], circles = wheel_r * 0.4, inches = FALSE, add = TRUE, bg = "#888", fg = "#444")
      }

      hl <- rot_pt(bx, by, car_w / 2 - 0.05, 0, angle)
      symbols(hl[1], hl[2], circles = 0.07, inches = FALSE, add = TRUE, bg = "#FFF7AE")
    }
  })

  # DD Table View
  output$dd_table <- renderDT({
    res <- dd_result()
    if (is.null(res)) {
      return(NULL)
    }

    df <- as.data.frame(res$table)
    # round values
    df[] <- lapply(df, function(x) round(x, 4))

    # Rename cols
    colnames(df) <- c("f(x)", paste0("Order ", 1:(ncol(df) - 1)))
    df <- cbind(X = res$x, df)

    datatable(df, options = list(dom = "t", paging = FALSE, ordering = FALSE), rownames = FALSE)
  })

  # Steps View
  output$steps_output <- renderUI({
    res <- dd_result()
    if (is.null(res)) {
      return(tags$div(class = "text-danger p-4", "Requires valid input points."))
    }

    x <- res$x
    n <- length(x)
    coeffs <- res$coeffs

    steps <- lapply(1:n, function(i) {
      if (i == 1) {
        val <- paste0("$$f[x_0] = y_0 = ", round(coeffs[i], 4), "$$")
        card(card_header(paste("Order 0")), card_body(class = "mathjax-container", HTML(val)))
      } else {
        val <- paste0("$$f[x_0, \\dots, x_{", i - 1, "}] = ", round(coeffs[i], 4), "$$")
        card(card_header(paste("Order", i - 1)), card_body(class = "mathjax-container", HTML(val)))
      }
    })

    tagList(steps)
  })
}
