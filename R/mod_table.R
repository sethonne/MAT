mod_table_ui <- function(id) {
  ns <- NS(id)
  nav_panel(
    title = tagList(bs_icon("table"), "Table"),
    value = "table",
    DTOutput(ns("dd_table"))
  )
}

mod_table_server <- function(id, dd_result) {
  moduleServer(id, function(input, output, session) {
    output$dd_table <- renderDT({
      res <- dd_result()
      if (is.null(res)) {
        return(NULL)
      }

      df <- as.data.frame(res$table)
      # round values
      df[] <- lapply(df, function(x) round(x, 4))

      # Rename cols
      colnames(df) <- c("f(x)", paste0("Order ", seq_len(ncol(df) - 1)))
      df <- cbind(X = res$x, df)

      datatable(df, options = list(dom = "t", paging = FALSE, ordering = FALSE), rownames = FALSE)
    })
  })
}
