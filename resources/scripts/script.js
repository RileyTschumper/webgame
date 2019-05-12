var stage;
var grid;
//var rows = 10;
//var cols = 10;
//var size = 30;
//var numMines = 10;
var timer;
var app;
var ws;

function init() {
  app = new Vue({
    el: "#app",
    data: {
      leaderboard: [],
      username: "",
      difficultyValue: 0,
	  difficulty: "Beginner",
      users: [],
	  rows: 10,
	  cols: 10,
	  size: 30,
   	  mines: 10
    }
  });
  
  updateCanvas();
   //new stage
  stage = new createjs.Stage("canvas");

  //creates minesweeper board
  createMinefield();

  addStageListener();

  stage.update();

  var port = window.location.port || "80";
  ws = new WebSocket("ws://" + window.location.hostname + ":" + port);
  ws.onopen = event => {
    console.log("Connection successful!");
  };
  ws.onmessage = event => {
    //console.log(event.data);
    var message = JSON.parse(event.data);
    if (message.msg === "username") {
      app.username = message.data;
      console.log(app.username);
    } else if (message.msg === "username_list") {
      app.users = message.data;
      console.log(app.users);
	} else if (message.msg == "leaderboard"){
	  app.leaderboard = message.data;
	  console.log(app.leaderboard);
	}    

  };
}

function addStageListener(){
  //when the stage is clicked...
  stage.on("stagemousedown", function(e) {
    console.log("event: ");
    console.log(e.nativeEvent.button);
    var x = e.stageX;
    var y = e.stageY;
    var i = Math.floor(x / app.size);
    var j = Math.floor(y / app.size);
    //if user right clicks to place flag
    if (e.nativeEvent.button == 2) {
      console.log("flagged");
      grid[i][j].flag = true;
    }
    //if user clicks on mine
    else if (grid[i][j].mine == true) {
      console.log("game over");
      gameOver();
    }
    //left click and not on a mine
    else {
      grid[i][j].show();
    }
    for (var i = 0; i < app.rows; i++) {
      for (var j = 0; j < app.cols; j++) {
        grid[i][j].draw();
      }
    }

    var correctFlags = 0;
    for (var i = 0; i < app.rows; i++) {
      for (var j = 0; j < app.cols; j++) {
        if (grid[i][j].flag == true && grid[i][j].mine == true) {
          correctFlags++;
        }
      }
    }

    if (correctFlags == app.mines) {
      console.log("you win!");
      var secondsOnClock = timer.getTimeValues().seconds;
	  var minutesOnClock = timer.getTimeValues().minutes;
	  var hoursOnClock = timer.getTimeValues().hours;
	  var totalTimeInSeconds = secondsOnClock + (minutesOnClock * 60) + (hoursOnClock * 60 * 60);
	  sendTime(totalTimeInSeconds);
      console.log(totalTimeInSeconds);
    }

    stage.update();
  });

}
function updateCanvas(){
	document.getElementById("canvas").setAttribute("width", app.rows * app.size);
	document.getElementById("canvas").setAttribute("height", app.cols * app.size);
}

function changeDifficulty(diff){
	if(diff == 0){
		app.difficulty = "Beginner";
		app.difficultyValue = 0;
		app.rows = 10;
		app.cols = 10;
		app.mines = 10;
	}
	else if(diff == 1){
		app.difficulty = "Novice";
		app.difficultyValue = 1;
		app.rows = 15;
		app.cols = 15;
		app.mines = 20;
	}
	else if(diff == 2){
		app.difficulty = "Expert";
		app.difficultyValue = 2;
		app.rows = 20;
		app.cols = 20;
		app.mines = 30;
	}	
	updateCanvas();
	createMinefield();
	addStageListener();
	stage.update();
	//add overlay
    addOverlay();
}

function sendTime(time){
	ws.send(time);
}

function createMinefield() {
  grid = make2DArray(app.rows, app.cols);
  for (var i = 0; i < app.rows; i++) {
    for (var j = 0; j < app.cols; j++) {
      grid[i][j] = new Cell(i, j, app.size);
    }
  }

  //places mines
  var placedMines = 0;
  while (placedMines < app.mines) {
    var rand_i = Math.floor(Math.random() * app.rows);
    var rand_j = Math.floor(Math.random() * app.cols);
    console.log(rand_i);
    console.log(rand_j);
    if (!grid[rand_i][rand_j].mine) {
      grid[rand_i][rand_j].mine = true;
      placedMines++;
      console.log(placedMines);
    }
  }

  for (var i = 0; i < app.rows; i++) {
    for (var j = 0; j < app.cols; j++) {
      grid[i][j].countNeighbors(grid, i, j);
    }
  }

  //draws each object on the canvas
  for (var i = 0; i < app.rows; i++) {
    for (var j = 0; j < app.cols; j++) {
      grid[i][j].draw();
    }
  }
}

function removeOverlay() {
  document.getElementById("overlay").style.display = "none";

  timer = new easytimer.Timer();
  timer.start();
  timer.addEventListener("secondsUpdated", function(e) {
    $("#timer").html(timer.getTimeValues().toString());
  });
}

function addOverlay() {
  timer.stop();
  document.getElementById("overlay").style.display = "block";
}

function gameOver() {
  //show full board
  for (var i = 0; i < app.rows; i++) {
    for (var j = 0; j < app.cols; j++) {
      grid[i][j].shown = true;
    }
  }

  for (var i = 0; i < app.rows; i++) {
    for (var j = 0; j < app.cols; j++) {
      grid[i][j].draw();
    }
  }

  //reset board
  createMinefield();

  //add overlay
  addOverlay();
}

function make2DArray(rows, cols) {
  var arr = new Array(rows);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = new Array(cols);
  }
  return arr;
}
