mod_plot_ui <- function(id) {
  ns <- NS(id)
  nav_panel(
    title = tagList(bs_icon("graph-up"), "Plot"),
    value = "plot",
    tags$div(
      class = "bg-light border rounded p-3 mb-3 position-relative",
      tags$div(
        class = "d-flex align-items-center justify-content-between mb-2",
        tags$span("Generated Polynomial Equation", class = "fw-medium text-muted small"),
        actionLink(ns("view_full_eq_btn_plot"), tagList(bs_icon("arrows-angle-expand"), "View Full"), class = "small text-primary text-decoration-none")
      ),
      tags$div(
        class = "mathjax-container text-center bg-white",
        uiOutput(ns("eq_text_plot"))
      ),
      tags$p(tagList(bs_icon("info-circle"), " This equation is shown here because the Plot tab is active."), class = "small text-muted text-center mt-2 mb-0 fst-italic")
    ),
    
    tags$div(
      class = "position-relative flex-grow-1 min-h-[400px]",
      tags$div(
        class = "position-absolute top-0 end-0 p-2 z-3",
        popover(
          bs_icon("gear"),
          title = "Plot Settings",
          checkboxInput(ns("show_pts"), "Show points on table", value = TRUE),
          checkboxInput(ns("draggable_pts"), "Draggable Points", value = TRUE),
          tags$hr(),
          checkboxInput(ns("game_mode"), "Gameify: Car Fuel Mode", value = FALSE),
          checkboxInput(ns("custom_car"), "Custom Car Sprite", value = FALSE),
          conditionalPanel(
            condition = sprintf("input['%s'] == true", ns("game_mode")),
            sliderInput(ns("speed"), "Speed", min = 0.1, max = 3, value = 1, step = 0.1),
            actionButton(ns("toggle"), "Play / Pause", class = "btn-sm w-100 mb-2"),
            actionButton(ns("reset"), "Reset", class = "btn-sm w-100")
          )
        )
      ),
      plotOutput(ns("main_plot"), height = "500px")
    )
  )
}

mod_plot_server <- function(id, rv, dd_result, eq_ui) {
  moduleServer(id, function(input, output, session) {
    output$eq_text_plot <- renderUI({ HTML(eq_ui()) })
    
    observeEvent(input$view_full_eq_btn_plot, { show_eq_modal(eq_ui()) })
    
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
      
      xs <- seq(min_x, max_x, length.out = 800)
      ys <- newton_eval(res, xs)
      
      y_min <- min(c(ys, pts$y)) - 2
      y_max <- max(c(ys, pts$y)) + 5
      
      op <- par(mar = c(0, 0, 0, 0), bg = "#87CEEB")
      on.exit(par(op))
      
      plot(NA, xlim = c(min_x, max_x), ylim = c(y_min, y_max), xlab = "", ylab = "", xaxs = "i", yaxs = "i", axes = FALSE, asp = 1)
      
      rect(par("usr")[1], par("usr")[3], par("usr")[2], par("usr")[4], col = "#87CEEB", border = NA)
      symbols(min_x + 1.5, y_max - 1.5, circles = 0.6, inches = FALSE, add = TRUE, bg = "#FFE066", fg = "#FFD43B")
      polygon(c(xs, rev(xs)), c(ys, rep(par("usr")[3], length(xs))), col = "#2E8B57", border = "#1F6B41", lwd = 2)
      
      ip_x <- rv$interp_points$x
      if (length(ip_x) > 0) {
        ip_y <- newton_eval(res, ip_x)
        points(ip_x, ip_y, pch = 23, bg = "yellow", col = "orange", cex = 1.5)
      }
      
      if (isTRUE(input$show_pts)) {
        points(pts$x, pts$y, pch = 21, bg = adjustcolor("red", 0.45), col = "darkred", cex = 1.8)
      }
      
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
  })
}
