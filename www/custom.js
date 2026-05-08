// Function to force MathJax to typeset newly rendered UI
window.typesetMathJax = function() {
  if (window.MathJax) {
    MathJax.typesetPromise().catch(function (err) {
      console.error("MathJax typeset failed: " + err.message);
    });
  }
};

$(document).on('shiny:value', function(event) {
  // If a specific output changes, re-run mathjax
  setTimeout(window.typesetMathJax, 100);
});
