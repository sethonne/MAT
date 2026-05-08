# app.R — Entry Point
source("global.R")

ui <- htmlTemplate(
  "www/index.html",
  data_points_ui   = uiOutput("data_points_ui"),
  interp_points_ui = uiOutput("interp_points_ui"),
  eq_text_sidebar  = uiOutput("eq_text_sidebar"),
  eq_text_plot     = uiOutput("eq_text_plot"),
  eq_text_modal    = uiOutput("eq_text_modal"),
  main_plot        = plotOutput("main_plot", height = "500px"),
  steps_output     = uiOutput("steps_output"),
  dd_table         = DTOutput("dd_table")
)

server <- function(input, output, session) {

  # --- Reactive State ---
  rv <- reactiveValues(
    data_points   = data.frame(x = c(0, 2, 4), y = c(2, 0, 3)),
    interp_points = data.frame(x = c(3.5)),
    calc_trigger  = 0,
    t             = 0.2,
    playing       = TRUE
  )

  # --- Data Points Table (renderUI) ---
  output$data_points_ui <- renderUI({
    req(rv$data_points)
    n <- nrow(rv$data_points)

    rows <- lapply(seq_len(n), function(i) {
      tags$tr(
        tags$td(class = "p-0 border-r",
          tags$input(type = "number", class = "input-cell",
            id = paste0("dp_x_", i), value = rv$data_points$x[i],
            onchange = sprintf("Shiny.setInputValue('dp_x_%d', this.value)", i)
          )
        ),
        tags$td(class = "p-0 border-r",
          tags$input(type = "number", class = "input-cell",
            id = paste0("dp_y_", i), value = rv$data_points$y[i],
            onchange = sprintf("Shiny.setInputValue('dp_y_%d', this.value)", i)
          )
        ),
        tags$td(class = "p-0 text-center",
          tags$button(
            class = "text-muted-foreground hover:text-destructive w-full h-full flex justify-center items-center",
            onclick = sprintf("Shiny.setInputValue('rm_dp', %d, {priority: 'event'})", i),
            HTML(delete_icon_svg)
          )
        )
      )
    })

    tags$div(class = "border rounded-md overflow-hidden",
      tags$table(class = "w-full text-sm text-left",
        tags$thead(class = "bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider",
          tags$tr(
            tags$th("X", class = "px-3 py-2 border-r font-medium text-center"),
            tags$th("Y", class = "px-3 py-2 border-r font-medium text-center"),
            tags$th("", class = "px-2 py-2 w-8")
          )
        ),
        tags$tbody(class = "divide-y", rows)
      )
    )
  })

  # --- Observe Data Point Changes ---
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
      if (changed && isTRUE(input$auto_calc)) {
        rv$calc_trigger <- rv$calc_trigger + 1
      }
    }
  })

  observeEvent(input$add_row, {
    rv$data_points <- rbind(rv$data_points, data.frame(x = 0, y = 0))
    if (isTRUE(input$auto_calc)) rv$calc_trigger <- rv$calc_trigger + 1
  })

  observeEvent(input$rm_dp, {
    idx <- as.numeric(input$rm_dp)
    if (nrow(rv$data_points) > 1 && !is.na(idx)) {
      rv$data_points <- rv$data_points[-idx, ]
      if (isTRUE(input$auto_calc)) rv$calc_trigger <- rv$calc_trigger + 1
    }
  })

  observeEvent(input$calc_btn, {
    rv$calc_trigger <- rv$calc_trigger + 1
  })

  # --- Core DD Computation ---
  dd_result <- reactive({
    req(rv$calc_trigger)
    x_vals <- rv$data_points$x
    y_vals <- rv$data_points$y
    if (length(unique(x_vals)) != length(x_vals)) return(NULL)
    divided_differences(x_vals, y_vals)
  })

  # --- Equation Output ---
  eq_str <- reactive({
    res <- dd_result()
    if (is.null(res)) return("$$P(x) = \\text{Error: Duplicate X values}$$")
    paste0("$$", newton_latex(res), "$$")
  })

  output$eq_text_sidebar <- renderUI({ HTML(eq_str()) })
  output$eq_text_plot    <- renderUI({ HTML(eq_str()) })
  output$eq_text_modal   <- renderUI({ HTML(eq_str()) })

  # --- Interpolation Table ---
  output$interp_points_ui <- renderUI({
    req(rv$interp_points)
    n <- nrow(rv$interp_points)

    res <- dd_result()
    y_eval <- rep(NA, n)
    if (!is.null(res)) y_eval <- newton_eval(res, rv$interp_points$x)

    rows <- lapply(seq_len(n), function(i) {
      y_val <- if (is.na(y_eval[i])) "..." else round(y_eval[i], 4)
      tags$tr(
        tags$td(class = "p-0 border-r bg-background",
          tags$input(type = "number", class = "input-cell font-mono text-sm",
            id = paste0("ip_x_", i), value = rv$interp_points$x[i],
            onchange = sprintf("Shiny.setInputValue('ip_x_%d', this.value)", i)
          )
        ),
        tags$td(class = "p-0 border-r bg-muted/20",
          tags$input(type = "text", readonly = NA,
            class = "input-cell font-bold font-mono text-sm text-primary cursor-not-allowed",
            value = y_val
          )
        ),
        tags$td(class = "p-0 text-center",
          tags$button(
            class = "text-muted-foreground hover:text-destructive w-full h-full flex justify-center items-center",
            onclick = sprintf("Shiny.setInputValue('rm_ip', %d, {priority: 'event'})", i),
            HTML(delete_icon_svg)
          )
        )
      )
    })

    tags$div(class = "border rounded-md overflow-hidden",
      tags$table(class = "w-full text-sm text-left",
        tags$thead(class = "bg-primary/5 text-primary border-b text-xs uppercase tracking-wider",
          tags$tr(
            tags$th("Evaluate at X", class = "px-3 py-2 border-r font-semibold text-center w-1/2"),
            tags$th("Result Y", class = "px-3 py-2 border-r font-semibold text-center w-1/2"),
            tags$th("", class = "px-2 py-2 w-8")
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

  # --- Car Animation ---
  observeEvent(input$toggle, { rv$playing <- !rv$playing })
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

  # --- Plot ---
  output$main_plot <- renderPlot({
    res <- dd_result()
    pts <- rv$data_points

    if (is.null(res) || nrow(pts) < 2) {
      plot(NA, xlim = c(0, 10), ylim = c(0, 10), axes = FALSE, xlab = "", ylab = "")
      text(5, 5, "Please input distinct X values", col = "red")
      return()
    }

    min_x <- min(pts$x); max_x <- max(pts$x)
    xs <- seq(min_x, max_x, length.out = 800)
    ys <- newton_eval(res, xs)
    y_min <- min(c(ys, pts$y)) - 2
    y_max <- max(c(ys, pts$y)) + 5

    op <- par(mar = c(0, 0, 0, 0), bg = "#87CEEB")
    on.exit(par(op))

    plot(NA, xlim = c(min_x, max_x), ylim = c(y_min, y_max),
         xlab = "", ylab = "", xaxs = "i", yaxs = "i", axes = FALSE, asp = 1)
    rect(par("usr")[1], par("usr")[3], par("usr")[2], par("usr")[4], col = "#87CEEB", border = NA)
    symbols(min_x + 1.5, y_max - 1.5, circles = 0.6, inches = FALSE, add = TRUE, bg = "#FFE066", fg = "#FFD43B")
    polygon(c(xs, rev(xs)), c(ys, rep(par("usr")[3], length(xs))), col = "#2E8B57", border = "#1F6B41", lwd = 2)

    # Interpolated points
    ip_x <- rv$interp_points$x
    if (length(ip_x) > 0) {
      ip_y <- newton_eval(res, ip_x)
      points(ip_x, ip_y, pch = 23, bg = "yellow", col = "orange", cex = 1.5)
    }

    # Control points
    if (isTRUE(input$show_pts)) {
      points(pts$x, pts$y, pch = 21, bg = adjustcolor("red", 0.45), col = "darkred", cex = 1.8)
    }

    # Car
    if (isTRUE(input$game_mode)) {
      cx <- rv$t
      cy <- newton_eval(res, cx)
      h <- 0.01
      dy <- (newton_eval(res, cx + h) - newton_eval(res, cx - h)) / (2 * h)
      angle <- atan(dy)
      lift <- 0.32
      bx <- cx - sin(angle) * lift
      by <- cy + cos(angle) * lift
      car_w <- 1.6; car_h <- 0.5

      draw_rot(bx, by, c(-car_w/2, car_w/2, car_w/2-0.1, -car_w/2+0.1), c(-car_h/2, -car_h/2, car_h/2, car_h/2), angle, col = "#FF7F2A", lwd = 2)
      draw_rot(bx, by, c(-0.45, 0.35, 0.25, -0.35), c(car_h/2, car_h/2, car_h/2+0.4, car_h/2+0.4), angle, col = "#E86A1F", lwd = 2)
      draw_rot(bx, by, c(-0.35, 0.22, 0.15, -0.28), c(car_h/2+0.05, car_h/2+0.05, car_h/2+0.35, car_h/2+0.35), angle, col = "#BEE3F8", lwd = 1)

      wheel_r <- 0.22
      for (wox in c(-car_w/2+0.3, car_w/2-0.3)) {
        w <- rot_pt(bx, by, wox, -car_h/2, angle)
        symbols(w[1], w[2], circles = wheel_r, inches = FALSE, add = TRUE, bg = "#1a1a1a")
        symbols(w[1], w[2], circles = wheel_r*0.4, inches = FALSE, add = TRUE, bg = "#888", fg = "#444")
      }
      hl <- rot_pt(bx, by, car_w/2-0.05, 0, angle)
      symbols(hl[1], hl[2], circles = 0.07, inches = FALSE, add = TRUE, bg = "#FFF7AE")
    }
  })

  # --- DD Table ---
  output$dd_table <- renderDT({
    res <- dd_result()
    if (is.null(res)) return(NULL)
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
      return(tags$div(class = "flex-1 flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/20 text-muted-foreground p-8",
        tags$h3("Awaiting calculation...", class = "text-lg font-medium"),
        tags$p("Input data points and calculate to see steps.", class = "text-sm mt-1")
      ))
    }

    x <- res$x; n <- length(x); coeffs <- res$coeffs

    step_cards <- lapply(seq_len(n), function(i) {
      if (i == 1) {
        val <- paste0("$$f[x_0] = y_0 = ", round(coeffs[i], 4), "$$")
        tags$div(class = "rounded-lg border bg-card p-4 mb-3",
          tags$h4(paste("Order 0"), class = "font-semibold text-sm mb-2 text-muted-foreground"),
          tags$div(class = "text-center", HTML(val))
        )
      } else {
        val <- paste0("$$f[x_0, \\dots, x_{", i - 1, "}] = ", round(coeffs[i], 4), "$$")
        tags$div(class = "rounded-lg border bg-card p-4 mb-3",
          tags$h4(paste("Order", i - 1), class = "font-semibold text-sm mb-2 text-muted-foreground"),
          tags$div(class = "text-center", HTML(val))
        )
      }
    })

    tagList(step_cards)
  })
}

shinyApp(ui = ui, server = server)
