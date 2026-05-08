# Car drawing helper functions for the plot animation

# Draw a rotated polygon
draw_rot <- function(cx, cy, xs, ys, angle, col, border = "black", lwd = 1) {
  cs <- cos(angle)
  sn <- sin(angle)
  rx <- cx + xs * cs - ys * sn
  ry <- cy + xs * sn + ys * cs
  polygon(rx, ry, col = col, border = border, lwd = lwd)
}

# Rotate a single point
rot_pt <- function(cx, cy, x, y, angle) {
  cs <- cos(angle)
  sn <- sin(angle)
  c(cx + x * cs - y * sn, cy + x * sn + y * cs)
}

# Inline SVG for the "x" delete icon (avoids Lucide re-init issues)
delete_icon_svg <- '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
