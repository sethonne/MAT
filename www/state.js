const INIT_NUM_POINTS = 3;
const INIT_MAX_X = 3;
const INIT_MAX_Y = 10;

var plotData = null;
var dataPoints = Array.from({ length: INIT_NUM_POINTS }, (_, i) => {
  const xInterval = INIT_MAX_X / INIT_NUM_POINTS;
  return {
    x: Number((i * xInterval + Math.random() * xInterval).toFixed(2)),
    y: Number((Math.random() * INIT_MAX_Y).toFixed(2))
  };
});
var interpX = [3.5];
var myChart = null;
var curveData = [];
var controlPts = [];
var interpPts = [];
var plotMinX = 0, plotMaxX = 10;
var carT = null;
var playing = true;
var gameMode = false;
var carSpeed = 1;
var carDirection = 1;
var engineDirection = 0; // Added for engine input (keyboard/touch)
var carVelocity = 0; // Added for physics (momentum/gravity)
var lastGravAccel = 0;
var lastEngAccel = 0;
var lastDragAccel = 0;
var showPts = true;


var dragEnabled = false;
var dragIdx = -1;
var dragOriginalX = null;
var dragOriginalY = null;
var dragHoverIdx = -1;
var dragFlashIdx = -1;
var dragFlashUntil = 0;

var nerdOpen = false;

const ensureArray = (v) => Array.isArray(v) ? v : (v != null ? [v] : []);
