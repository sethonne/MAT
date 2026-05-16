library(shiny)
library(DT)
library(htmltools)

divided_differences <- function(x, y) {
  n  <- length(x)
  dd <- matrix(NA, nrow = n, ncol = n)
  dd[, 1] <- y
  if (n > 1) {
    for (j in 2:n) {
      for (i in j:n) {
        denom    <- x[i] - x[i - j + 1]
        dd[i, j] <- if (abs(denom) < 1e-10) 0
                    else (dd[i, j - 1] - dd[i - 1, j - 1]) / denom
      }
    }
  }
  list(coeffs = diag(dd), table = dd, x = x, y = y)
}

newton_eval <- function(dd_result, x_eval) {
  coeffs       <- dd_result$coeffs
  x            <- dd_result$x
  n            <- length(coeffs)
  result       <- rep(coeffs[1], length(x_eval))
  product_term <- rep(1, length(x_eval))
  if (n > 1) {
    for (i in 2:n) {
      product_term <- product_term * (x_eval - x[i - 1])
      result       <- result + coeffs[i] * product_term
    }
  }
  result
}

newton_error_bound <- function(dd_result, x_eval) {
  coeffs    <- dd_result$coeffs
  x         <- dd_result$x
  n         <- length(coeffs)
  if (n < 2) return(rep(NA_real_, length(x_eval)))
  prod_term <- rep(1, length(x_eval))
  for (i in seq_len(n)) prod_term <- prod_term * (x_eval - x[i])
  abs(coeffs[n]) * abs(prod_term)
}

# Actual polynomial degree: n_points - 1
poly_degree <- function(dd_result) length(dd_result$coeffs) - 1L

# Newton-form LaTeX using actual degree label P_{k}(x) where k = n_points - 1
newton_latex <- function(dd_result) {
  coeffs <- dd_result$coeffs
  x      <- dd_result$x
  n      <- length(coeffs)
  deg    <- n - 1L
  if (n == 0) return("P_{0}(x) = 0")

  label <- paste0("P_{", deg, "}(x)")
  terms <- paste0(round(coeffs[1], 4))

  if (n > 1) {
    for (i in 2:n) {
      if (abs(coeffs[i]) > 1e-10) {
        val       <- coeffs[i]
        sign_str  <- if (val >= 0) " + " else " - "
        abs_val   <- abs(val)
        coeff_str <- if (abs(abs_val - 1) < 1e-10) "" else sprintf("%.4g", abs_val)
        factors   <- vapply(seq_len(i - 1), function(j) {
          xj <- x[j]
          if (abs(xj) < 1e-10) "x"
          else if (xj > 0)     sprintf("(x - %g)", xj)
          else                 sprintf("(x + %g)", abs(xj))
        }, character(1))
        terms <- paste0(terms, sign_str, coeff_str, paste0(factors, collapse = ""))
      }
    }
  }
  paste0(label, " = ", terms)
}

# Expand Newton form to flat polynomial coefficients (element d+1 = coeff of x^d)
newton_simplify <- function(dd_result) {
  coeffs       <- dd_result$coeffs
  x            <- dd_result$x
  n            <- length(coeffs)
  poly         <- numeric(n)
  poly[1]      <- coeffs[1]
  prod_poly    <- numeric(n)
  prod_poly[1] <- 1

  for (k in 2:n) {
    new_prod <- numeric(n)
    xk       <- x[k - 1]
    for (d in seq_len(n - 1)) {
      new_prod[d + 1] <- new_prod[d + 1] + prod_poly[d]
      new_prod[d]     <- new_prod[d]     - xk * prod_poly[d]
    }
    prod_poly <- new_prod
    for (d in seq_len(n)) poly[d] <- poly[d] + coeffs[k] * prod_poly[d]
  }

  poly[abs(poly) < 1e-10] <- 0
  list(poly_coeffs = poly, x = x, coeffs = coeffs)
}

# Fully expanded LaTeX using actual degree label P_{k}(x); always uses "=" not "≈"
newton_simplified_latex <- function(dd_result) {
  simp  <- newton_simplify(dd_result)
  p     <- simp$poly_coeffs
  n     <- length(p)
  deg   <- n - 1L
  label <- paste0("P_{", deg, "}(x)")

  if (all(abs(p) < 1e-10)) return(paste0(label, " = 0"))

  term_list <- list()
  for (d in 0:(n - 1)) {
    val <- p[d + 1]
    if (abs(val) < 1e-10) next
    abs_val   <- abs(val)
    coeff_str <- sprintf("%.4g", abs_val)
    is_one    <- abs(abs_val - 1) < 1e-10
    term <- if (d == 0)      coeff_str
            else if (d == 1) if (is_one) "x" else paste0(coeff_str, "x")
            else if (is_one) paste0("x^{", d, "}")
            else             paste0(coeff_str, "x^{", d, "}")
    term_list <- c(term_list, list(list(sign = if (val >= 0) "+" else "-", term = term)))
  }

  if (length(term_list) == 0) return(paste0(label, " = 0"))

  latex <- paste0(label, " = ")
  for (i in seq_along(term_list)) {
    t <- term_list[[i]]
    if (i == 1) latex <- paste0(latex, if (t$sign == "-") "-" else "", t$term)
    else        latex <- paste0(latex, " ", t$sign, " ", t$term)
  }
  latex
}