# Quick Setup & Run Script for MAT
# This script installs dependencies and runs the app directly from GitHub
# For the full code, please visit `https://github.com/sethonne/MAT`

# To quickly run
# on windows press: `Ctrl + Shift + S`
# on mac press    : `Cmd + Shift + S`

# 1. Install required packages if missing
required_packages <- c("shiny", "DT", "htmltools")
new_packages <- required_packages[!(required_packages %in% installed.packages()[, "Package"])]
if (length(new_packages)) install.packages(new_packages)

# 2. Run the application directly from the GitHub repository
# This downloads the latest version to a temporary directory and starts it
message("Fetching and launching MAT from GitHub...")
shiny::runGitHub("MAT", "sethonne")
