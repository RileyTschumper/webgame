var stage;

function init() {
  var rows = 10;
  var cols = 10;
  var size = 30;
  var numMines = 10;

  document.getElementById("canvas").setAttribute("width", rows * size);
  document.getElementById("canvas").setAttribute("height", cols * size);

  //new stage
  stage = new createjs.Stage("canvas");

  var grid = make2DArray(rows, cols);
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
      grid[i][j].draw(stage);
    }
  }

  stage.on("stagemousedown", function(e) {
    var x = e.stageX;
    var y = e.stageY;
    console.log(x);
    console.log(y);
    var i = Math.floor(x / size);
    var j = Math.floor(y / size);

    console.log("i: " + i);
    console.log("j: " + j);
    grid[i][j].show();
    grid[i][j].draw(stage);
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
