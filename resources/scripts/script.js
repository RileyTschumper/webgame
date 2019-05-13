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
      leaderboardBeginner: [],
	  leaderboardNovice: [],
	  leaderboardExpert: [],
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
	  updateLeaderboard(message.data);
	  //app.leaderboard = message.data;
	  console.log(message.data);
	}    

  };
}

function updateLeaderboard(data){
	for(var i = 0; i < data.length; i++){
		//var message = {difficulty: data[i].difficulty, time: data[i].time, username: data[i].username};
		if(data[i].difficulty == 0 && !(app.leaderboardBeginner.filter(e => e.username == data[i].username).length > 0)){
			console.log("pushed");
			console.log(app.leaderboardBeginner);
			console.log("Data[i]: " + data[i]);
			app.leaderboardBeginner.push(data[i]);
		}	
		else if(data[i].difficulty == 1 && !(app.leaderboardNovice.filter(e => e.username == data[i].username).length > 0)){
			app.leaderboardNovice.push(data[i]);
		}
		else if(data[i].difficulty == 2 && !(app.leaderboardExpert.filter(e => e.username == data[i].username).length > 0)){
			app.leaderboardExpert.push(data[i]);
		}
	}
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
		app.rows = 13;
		app.cols = 13;
		app.mines = 20;
	}
	else if(diff == 2){
		app.difficulty = "Expert";
		app.difficultyValue = 2;
		app.rows = 15;
		app.cols = 15;
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
	message = {difficulty: app.difficultyValue, time: time};
	ws.send(JSON.stringify(message));
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
  
  timer.stop();
  //reset board
  //createMinefield();

  //add overlay
  //addOverlay();
}

function make2DArray(rows, cols) {
  var arr = new Array(rows);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = new Array(cols);
  }
  return arr;
}
