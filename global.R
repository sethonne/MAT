library(shiny)
library(DT)
library(htmltools)

# Core math logic for Newton's Divided Differences
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

# Approximate Newton interpolation error: |coeffs[n]| * |prod_{i=1..n}(x - x_i)|.
# Uses the top-order divided difference as a proxy for f[x_0,...,x_n,x] since the
# true next-order DD isn't available without an extra data point or analytic f.
newton_error_bound <- function(dd_result, x_eval) {
  coeffs <- dd_result$coeffs
  x <- dd_result$x
  n <- length(coeffs)
  if (n < 2) return(rep(NA_real_, length(x_eval)))
  prod_term <- rep(1, length(x_eval))
  for (i in seq_len(n)) prod_term <- prod_term * (x_eval - x[i])
  abs(coeffs[n]) * abs(prod_term)
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
        # Format coefficient with sign
        val <- coeffs[i]
        sign_str <- if (val >= 0) " + " else " - "
        abs_val <- abs(val)
        
        # Omit coefficient if it's 1 (since k >= 2, there are always factors)
        coeff_str <- if (abs(abs_val - 1) < 1e-10) "" else sprintf("%.4g", abs_val)
        
        # Build factors (x - x_j)
        factors <- ""
        for (j in 1:(i - 1)) {
          xj <- x[j]
          if (abs(xj) < 1e-10) {
            factors <- paste0(factors, "x")
          } else if (xj > 0) {
            factors <- paste0(factors, sprintf("(x - %g)", xj))
          } else {
            factors <- paste0(factors, sprintf("(x + %g)", abs(xj)))
          }
        }
        terms <- paste0(terms, sign_str, coeff_str, factors)
      }
    }
  }
  paste0("P(x) = ", terms)
}
