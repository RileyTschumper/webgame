var stage;
var grid;
var rows = 10;
var cols = 10;
var size = 30;
var numMines = 10;

function init() {
  document.getElementById("canvas").setAttribute("width", rows * size);
  document.getElementById("canvas").setAttribute("height", cols * size);

  //new stage
  stage = new createjs.Stage("canvas");

  grid = make2DArray(rows, cols);
  for (var i = 0; i < rows; i++) {
    for (var j = 0; j < cols; j++) {
      grid[i][j] = new Cell(i, j, size);
    }
  }

  //places mines
  var placedMines = 0;
  while (placedMines < numMines) {
    var rand_i = Math.floor(Math.random() * rows);
    var rand_j = Math.floor(Math.random() * cols);
    console.log(rand_i);
    console.log(rand_j);
    if (!grid[rand_i][rand_j].mine) {
      grid[rand_i][rand_j].mine = true;
      placedMines++;
      console.log(placedMines);
    }
  }

  for (var i = 0; i < rows; i++) {
    for (var j = 0; j < cols; j++) {
      grid[i][j].countNeighbors(grid, i, j);
    }
  }

  //draws each object on the canvas
  for (var i = 0; i < rows; i++) {
    for (var j = 0; j < cols; j++) {
      grid[i][j].draw();
    }
  }

  stage.on("stagemousedown", function(e) {
    console.log("event: ");
    console.log(e.nativeEvent.button);
    var x = e.stageX;
    var y = e.stageY;
    //console.log(x);
    //console.log(y);
    var i = Math.floor(x / size);
    var j = Math.floor(y / size);
    if (e.nativeEvent.button == 2) {
      console.log("flagged");
      grid[i][j].flag = true;
    } else {
      grid[i][j].show();
    }
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < cols; j++) {
        grid[i][j].draw();
      }
    }

    stage.update();
  });

  stage.update();
}

function make2DArray(rows, cols) {
  var arr = new Array(rows);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = new Array(cols);
  }
  return arr;
}
