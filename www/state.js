var plotData = null;
var dataPoints = [{x: 0, y: 2}, {x: 2, y: 0}, {x: 4, y: 3}];
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
