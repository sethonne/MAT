library(shiny)

ui <- fluidPage(
  tags$head(tags$style(HTML("body { background: #f5f5f5; }"))),
  titlePanel("Car on Hills — Polynomial Interpolation"),
  sidebarLayout(
    sidebarPanel(
      width = 3,
      sliderInput("speed", "Speed", min = 0.1, max = 3, value = 1, step = 0.1),
      actionButton("toggle", "Play / Pause", width = "100%"),
      br(), br(),
      actionButton("reset", "Reset", width = "100%"),
      br(), br(),
      checkboxInput("show_pts", "Show control points", TRUE),
      helpText("Drag-style points are fixed in this version. Edit `pts` in server to reshape the terrain.")
    ),
    mainPanel(
      width = 9,
      plotOutput("plot", height = "650px")
    )
  )
)

server <- function(input, output, session) {

  # Hill control points (the "Points and Length" + "Polynomial Interpolation" layer)
  pts <- data.frame(
    x = c(0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20),
    y = c(2, 0, 3, 1, 3, 1, 3, 0, 2, 0, 2)
  )

  # Smooth interpolation through the control points (natural cubic spline —
  # numerically stable analogue of Desmos' divided-difference polynomial).
  hill <- splinefun(pts$x, pts$y, method = "natural")

  # Animation state
  state <- reactiveValues(t = min(pts$x) + 0.2, playing = TRUE)

  observeEvent(input$toggle, { state$playing <- !state$playing })
  observeEvent(input$reset,  { state$t <- min(pts$x) + 0.2 })

  observe({
    invalidateLater(40, session)
    isolate({
      if (state$playing) {
        state$t <- state$t + input$speed * 0.08
        if (state$t > max(pts$x) - 0.2) state$t <- min(pts$x) + 0.2
      }
    })
  })

  # Helper: draw a rotated rectangle / polygon at (cx, cy) rotated by `angle`
  draw_rot <- function(cx, cy, xs, ys, angle, col, border = "black", lwd = 1) {
    cs <- cos(angle); sn <- sin(angle)
    rx <- cx + xs * cs - ys * sn
    ry <- cy + xs * sn + ys * cs
    polygon(rx, ry, col = col, border = border, lwd = lwd)
  }

  rot_pt <- function(cx, cy, x, y, angle) {
    cs <- cos(angle); sn <- sin(angle)
    c(cx + x * cs - y * sn, cy + x * sn + y * cs)
  }

  output$plot <- renderPlot({
    t <- state$t

    xs <- seq(min(pts$x), max(pts$x), length.out = 800)
    ys <- hill(xs)

    op <- par(mar = c(0, 0, 0, 0), bg = "#87CEEB")
    on.exit(par(op))

    plot(NA, xlim = c(min(pts$x), max(pts$x)), ylim = c(-1, 9),
         xlab = "", ylab = "", xaxs = "i", yaxs = "i", axes = FALSE, asp = 1)

    # Sky
    rect(par("usr")[1], par("usr")[3], par("usr")[2], par("usr")[4],
         col = "#87CEEB", border = NA)

    # Sun
    symbols(min(pts$x) + 1.5, 7.5, circles = 0.6, inches = FALSE,
            add = TRUE, bg = "#FFE066", fg = "#FFD43B")

    # Hill (filled green polygon)
    polygon(c(xs, rev(xs)),
            c(ys, rep(par("usr")[3], length(xs))),
            col = "#2E8B57", border = "#1F6B41", lwd = 2)

    # Control points
    if (isTRUE(input$show_pts)) {
      points(pts$x, pts$y, pch = 21,
             bg = adjustcolor("red", 0.45), col = "darkred", cex = 1.8)
    }

    # --- Car ---
    cx <- t
    cy <- hill(cx)
    h  <- 0.01
    dy <- (hill(cx + h) - hill(cx - h)) / (2 * h)
    angle <- atan(dy)

    # Lift the car so wheels sit on the curve
    lift <- 0.32
    bx <- cx - sin(angle) * lift
    by <- cy + cos(angle) * lift

    car_w <- 1.6
    car_h <- 0.5

    # Body
    body_x <- c(-car_w/2, car_w/2, car_w/2 - 0.1, -car_w/2 + 0.1)
    body_y <- c(-car_h/2, -car_h/2,  car_h/2,     car_h/2)
    draw_rot(bx, by, body_x, body_y, angle, col = "#FF7F2A", border = "black", lwd = 2)

    # Roof / cabin
    roof_x <- c(-0.45, 0.35, 0.25, -0.35)
    roof_y <- c(car_h/2, car_h/2, car_h/2 + 0.4, car_h/2 + 0.4)
    draw_rot(bx, by, roof_x, roof_y, angle, col = "#E86A1F", border = "black", lwd = 2)

    # Window
    win_x <- c(-0.35, 0.22, 0.15, -0.28)
    win_y <- c(car_h/2 + 0.05, car_h/2 + 0.05, car_h/2 + 0.35, car_h/2 + 0.35)
    draw_rot(bx, by, win_x, win_y, angle, col = "#BEE3F8", border = "black", lwd = 1)

    # Wheels
    wheel_r <- 0.22
    for (wox in c(-car_w/2 + 0.3, car_w/2 - 0.3)) {
      w <- rot_pt(bx, by, wox, -car_h/2, angle)
      symbols(w[1], w[2], circles = wheel_r, inches = FALSE, add = TRUE,
              bg = "#1a1a1a", fg = "black")
      symbols(w[1], w[2], circles = wheel_r * 0.4, inches = FALSE, add = TRUE,
              bg = "#888", fg = "#444")
    }

    # Headlight
    hl <- rot_pt(bx, by, car_w/2 - 0.05, 0, angle)
    symbols(hl[1], hl[2], circles = 0.07, inches = FALSE, add = TRUE,
            bg = "#FFF7AE", fg = "black")
  })
}

shinyApp(ui, server)