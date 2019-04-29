var stageWidth = 640;
var stageHeight = 480;
var stage;
var update = true;
var shape1, shape2, shape3;

function init() {
  //new stage
  stage = new createjs.Stage("canvas");

  var rows = 10;
  var cols = 10;
  var size = 30;

  grid = make2DArray(rows, cols);
  for (var i = 0; i < rows; i++) {
    for (var j = 0; j < cols; j++) {
      grid[i][j] = new Cell(i, j, size);
    }
  }

  for (var i = 0; i < rows; i++) {
    for (var j = 0; j < cols; j++) {
      grid[i][j].draw(stage);
    }
  }

  stage.update();
}

function make2DArray(rows, cols) {
  var arr = new Array(rows);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = new Array(cols);
  }
  return arr;
}
