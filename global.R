library(shiny)
library(DT)
library(htmltools)

# Core Mathematical Logic — Newton's Divided Differences

# Compute the full divided-difference table and diagonal coefficients.
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

# Evaluate the Newton polynomial.
newton_eval <- function(dd_result, x_eval) {
  coeffs <- dd_result$coeffs
  x      <- dd_result$x
  n      <- length(coeffs)
  result       <- rep(coeffs[1], length(x_eval))
  product_term <- rep(1,          length(x_eval))
  if (n > 1) {
    for (i in 2:n) {
      product_term <- product_term * (x_eval - x[i - 1])
      result       <- result + coeffs[i] * product_term
    }
  }
  result
}

# Estimate the interpolation error.
newton_error_bound <- function(dd_result, x_eval) {
  coeffs <- dd_result$coeffs
  x      <- dd_result$x
  n      <- length(coeffs)
  if (n < 2) return(rep(NA_real_, length(x_eval)))
  prod_term <- rep(1, length(x_eval))
  for (i in seq_len(n)) prod_term <- prod_term * (x_eval - x[i])
  abs(coeffs[n]) * abs(prod_term)
}

# LaTeX helpers

# Convert Newton form to standard polynomial coefficients.
newton_simplify <- function(dd_result) {
  coeffs <- dd_result$coeffs
  x      <- dd_result$x
  n      <- length(coeffs)

  # Coefficients of x^0 to x^(n-1)
  poly <- rep(0, n)
  poly[1] <- coeffs[1]

  # Current product term
  prod_poly <- c(1, rep(0, n - 1))  # constant 1

  for (k in 2:n) {
    # Multiply by (x - x[k - 1])
    new_prod <- rep(0, n)
    xk <- x[k - 1]
    for (d in 1:(n - 1)) {
      new_prod[d + 1] <- new_prod[d + 1] + prod_poly[d]    # x * term
      new_prod[d]     <- new_prod[d]     - xk * prod_poly[d] # -xk * term
    }
    prod_poly <- new_prod

    # Add coeffs[k] * prod_poly
    for (d in 1:n) {
      poly[d] <- poly[d] + coeffs[k] * prod_poly[d]
    }
  }

  # Remove tiny values
  poly[abs(poly) < 1e-10] <- 0

  list(poly_coeffs = poly, x = x, coeffs = coeffs)
}

# Build the simplified polynomial in LaTeX.
newton_simplified_latex <- function(dd_result) {
  simp <- newton_simplify(dd_result)
  p    <- simp$poly_coeffs
  n    <- length(p)

  if (all(abs(p) < 1e-10)) return("P(x) = 0")

  terms <- character(0)
  for (deg in 0:(n - 1)) {
    val <- p[deg + 1]
    if (abs(val) < 1e-10) next
    coeff_str <- sprintf("%.4g", abs(val))
    if (deg == 0) {
      term <- coeff_str
    } else if (deg == 1) {
      term <- if (abs(abs(val) - 1) < 1e-10) "x" else paste0(coeff_str, "x")
    } else {
      term <- if (abs(abs(val) - 1) < 1e-10) paste0("x^{", deg, "}")
               else paste0(coeff_str, "x^{", deg, "}")
    }
    sign <- if (val >= 0) "+" else "-"
    terms <- c(terms, list(list(sign = sign, term = term)))
  }

  if (length(terms) == 0) return("P(x) = 0")

  latex <- "P(x) = "
  for (i in seq_along(terms)) {
    if (i == 1) {
      latex <- paste0(latex, if (terms[[i]]$sign == "-") "-" else "", terms[[i]]$term)
    } else {
      latex <- paste0(latex, " ", terms[[i]]$sign, " ", terms[[i]]$term)
    }
  }
  latex
}

# Build the original Newton form in LaTeX.
newton_latex <- function(dd_result) {
  coeffs <- dd_result$coeffs
  x      <- dd_result$x
  n      <- length(coeffs)
  if (n == 0) return("P(x) = 0")

  terms <- paste0(round(coeffs[1], 4))

  if (n > 1) {
    for (i in 2:n) {
      if (abs(coeffs[i]) > 1e-10) {
        val      <- coeffs[i]
        sign_str <- if (val >= 0) " + " else " - "
        abs_val  <- abs(val)
        coeff_str <- if (abs(abs_val - 1) < 1e-10) "" else sprintf("%.4g", abs_val)

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

# Matrix form

# Build the matrix form L a = y.
newton_matrix_form <- function(dd_result) {
  x <- dd_result$x
  y <- dd_result$y
  a <- dd_result$coeffs
  n <- length(x)

  L <- matrix(0, nrow = n, ncol = n)
  for (i in seq_len(n)) {
    for (j in seq_len(i)) {
      if (j == 1) {
        L[i, j] <- 1
      } else {
        # Product of (x[i] - x[k])
        L[i, j] <- prod(x[i] - x[seq_len(j - 1)])
      }
    }
  }

  # Convert matrix to row list
  L_rows <- lapply(seq_len(n), function(i) as.numeric(L[i, ]))

  list(
    L    = L_rows,
    a    = as.numeric(a),
    y    = as.numeric(y),
    x    = as.numeric(x),
    n    = n
  )
}