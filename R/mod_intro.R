mod_intro_ui <- function(id) {
  ns <- NS(id)
  nav_panel(
    title = tagList(bs_icon("book", class = "me-2"), "Introduction"),
    tags$div(
      class = "container mx-auto px-4 md:px-8 pb-8",
      layout_columns(
        col_widths = c(6, 6),
        # Definition Card
        card(
          card_header(
            class = "d-flex align-items-center gap-2 fw-semibold",
            bs_icon("info-circle", class = "text-primary"), "Definition"
          ),
          card_body(
            class = "text-muted",
            tags$p(tags$strong("Newton's Divided Differences"), " is a method used to calculate the coefficients of an interpolating polynomial. It provides a structured way to find a polynomial curve that passes through a given set of data points."),
            tags$div(
              class = "mathjax-container text-center my-3 text-dark",
              "$$P_n(x) = f[x_0] + \\sum_{k=1}^{n} f[x_0, \\dots, x_k] \\prod_{j=0}^{k-1} (x - x_j)$$"
            ),
            tags$p("The divided differences are calculated recursively:", class = "text-center"),
            tags$div(
              class = "mathjax-container text-center text-dark",
              "$$f[x_i, \\dots, x_j] = \\frac{f[x_{i+1}, \\dots, x_j] - f[x_i, \\dots, x_{j-1}]}{x_j - x_i}$$"
            )
          )
        ),
        # Applications Card
        card(
          card_header(
            class = "d-flex align-items-center gap-2 fw-semibold",
            bs_icon("bullseye", class = "text-primary"), "Applications"
          ),
          card_body(
            class = "text-muted",
            tags$div(
              class = "d-flex gap-3 mb-3",
              bs_icon("graph-up", class = "text-secondary fs-4"),
              tags$div(
                tags$strong("Data Curve Fitting.", class = "text-dark"),
                tags$p("Interpolating a smooth curve (such as generating continuous terrain points) through specific discrete control points.", class = "mb-0")
              )
            ),
            tags$div(
              class = "d-flex gap-3 mb-3",
              bs_icon("crosshair", class = "text-secondary fs-4"),
              tags$div(
                tags$strong("Estimating Missing Values.", class = "text-dark"),
                tags$p("Approximating the value of a function at an intermediate point where no actual measurement exists.", class = "mb-0")
              )
            ),
            tags$div(
              class = "d-flex gap-3",
              bs_icon("calculator-fill", class = "text-secondary fs-4"),
              tags$div(
                tags$strong("Numerical Analysis.", class = "text-dark"),
                tags$p("Serving as the mathematical foundation for numerical differentiation and numerical integration methods.", class = "mb-0")
              )
            )
          )
        ),
        # Formatting Rules Table Card
        card(
          class = "mt-4",
          card_header(
            class = "d-flex align-items-center gap-2 fw-semibold",
            bs_icon("123", class = "text-primary"), "Data Input Guidelines"
          ),
          card_body(
            class = "p-0",
            tags$p("Properly format your coordinates and inputs for the interactive data table.", class = "text-muted px-3 pt-3 mb-2"),
            tags$div(
              class = "table-responsive",
              tags$table(
                class = "table table-borderless table-striped align-middle mb-0 text-sm",
                tags$thead(
                  class = "table-muted-header",
                  tags$tr(
                    tags$th("Guideline", class = "w-25 px-3"),
                    tags$th("Description", class = "px-3")
                  )
                ),
                tags$tbody(
                  tags$tr(
                    tags$td(tags$strong("Distinct X Values"), class = "px-3 text-dark"),
                    tags$td("All \\(X\\) coordinates must be unique. Divided differences require non-zero denominators (\\(x_j - x_i \\neq 0\\)).", class = "px-3 text-muted")
                  ),
                  tags$tr(
                    tags$td(tags$strong("Numerical Constants"), class = "px-3 text-dark"),
                    tags$td(tagList("Inputs should be resolved numerical constants (e.g., ", tags$code("2.5"), ", ", tags$code("-4.1"), "). Equations or symbolic constants like \\(\\pi\\) must be evaluated to decimals first."), class = "px-3 text-muted")
                  ),
                  tags$tr(
                    tags$td(tags$strong("Function Sampling"), class = "px-3 text-dark"),
                    tags$td("To interpolate a specific function like \\(f(x) = \\sin(x)\\), manually sample discrete points (e.g., \\(X=0, Y=0\\); \\(X=1.57, Y=1\\)) and input them into the table.", class = "px-3 text-muted")
                  ),
                  tags$tr(
                    tags$td(tags$strong("Sequential Order"), class = "px-3 text-dark"),
                    tags$td("While Newton's method doesn't strictly require ordered \\(X\\) values, sorting them from smallest to largest improves numerical stability and visualization.", class = "px-3 text-muted")
                  )
                )
              )
            )
          )
        )
      )
    )
  )
}
