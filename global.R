library(shiny)
library(DT)
library(htmltools)

# Auto-source the R directory for helpers
sapply(list.files("R", full.names = TRUE, pattern = "\\.R$"), source)

# Compute Newton's Divided Difference coefficients
divided_differences <- function(x, y) {
  n <- length(x)
  dd <- matrix(NA, nrow = n, ncol = n)
  dd[, 1] <- y
  if (n > 1) {
    for (j in 2:n) {
      for (i in j:n) {
        denom <- (x[i] - x[i - j + 1])
        if (abs(denom) < 1e-10) {
          dd[i, j] <- 0
        } else {
          dd[i, j] <- (dd[i, j - 1] - dd[i - 1, j - 1]) / denom
        }
      }
    }
  }
  coeffs <- diag(dd)
  list(coeffs = coeffs, table = dd, x = x, y = y)
}

newton_eval <- function(dd_result, x_eval) {
  coeffs <- dd_result$coeffs
  x <- dd_result$x
  n <- length(coeffs)
  result <- rep(coeffs[1], length(x_eval))
  product_term <- rep(1, length(x_eval))
  if (n > 1) {
    for (i in 2:n) {
      product_term <- product_term * (x_eval - x[i - 1])
      result <- result + coeffs[i] * product_term
    }
  }
  result
}

newton_latex <- function(dd_result) {
  coeffs <- dd_result$coeffs
  x <- dd_result$x
  n <- length(coeffs)
  if (n == 0) return("P(x) = 0")
  terms <- paste0(round(coeffs[1], 4))
  if (n > 1) {
    for (i in 2:n) {
      if (abs(coeffs[i]) > 1e-10) {
        coeff_str <- sprintf("%+.4g", coeffs[i])
        factors <- paste0(sprintf("(x - %g)", x[1:(i - 1)]), collapse = "")
        terms <- paste0(terms, " ", coeff_str, factors)
      }
    }
  }
  paste0("P(x) = ", terms)
}
