mod_steps_ui <- function(id) {
  ns <- NS(id)
  nav_panel(
    title = tagList(bs_icon("list-ol"), "Steps"),
    value = "steps",
    uiOutput(ns("steps_output"))
  )
}

mod_steps_server <- function(id, dd_result) {
  moduleServer(id, function(input, output, session) {
    output$steps_output <- renderUI({
      res <- dd_result()
      if (is.null(res)) {
        return(tags$div(class = "text-danger p-4", "Requires valid input points."))
      }

      x <- res$x
      n <- length(x)
      coeffs <- res$coeffs

      steps <- lapply(seq_len(n), function(i) {
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
  })
}
