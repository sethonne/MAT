app_theme <- bs_theme(
  version = 5,
  preset = "shiny",
  bg = "#ffffff",
  fg = "#09090b",
  primary = "hsl(221.2, 83.2%, 53.3%)",
  secondary = "hsl(210, 40%, 96.1%)",
  font_scale = NULL,
  heading_font = font_google("Inter"),
  base_font = font_google("Inter"),
  `enable-rounded` = TRUE
) |>
  bs_add_rules(sass::sass_file("www/custom.css"))

page_header_ui <- function() {
  tags$div(
    class = "container mx-auto px-4 py-4 md:px-8",
    tags$div(
      class = "mb-4",
      tags$h1("Newton's Divided Differences Calculator", class = "h3 fw-bold tracking-tight"),
      tags$p("Interactive learning tool for polynomial interpolation using divided differences.", class = "text-muted")
    )
  )
}
