var stage; //createjs canvas
var grid; //2D array of Cell objects
var timer; //Timer object
var app; //Vue app
var ws; //websocket
var modal;

function init() {
    app = new Vue({
        el: "#app",
        data: {
            currentUserModal: "",
            currentUserStatsModal: [],
            showModal: false,
            leaderboard: [],
            chats: [],
            chatGroups: ["Beginner", "Novice", "Expert"],
            currentGroup: "",
            showChat: false,
            //3 separate leaderboards
            leaderboardBeginner: [],
            leaderboardNovice: [],
            leaderboardExpert: [],
            username: "", //Current user's username
            difficultyValue: 0, //0=Beginner, 1=Novice, 2=Expert
            difficulty: "Beginner", //Beginner, Novice, or Expert
            users: [], //current users online
            userStats: [],
            rows: 10,
            cols: 10,
            size: 30,
            mines: 10
        }
    });
    
    modal = document.getElementById("userModal");

    //updates the html canvas size based on board size
    updateCanvas();

    //creates a new stage
    stage = new createjs.Stage("canvas");

    //creates minesweeper board
    createMinefield();

    //adds listener on the stage
    addStageListener();

    //updates stage
    stage.update();

    //opens websocket
    var port = window.location.port || "80";
    ws = new WebSocket("ws://" + window.location.hostname + ":" + port);
    ws.onopen = event => {
        console.log("Connection successful!");
    };
    ws.onmessage = event => {
        //console.log(event.data);
        var message = JSON.parse(event.data);
        //recieves username message from server
        if (message.msg === "username") {
            app.username = message.data;
            console.log(app.username);
        }
        //recieves all active users from server
        else if (message.msg === "username_list") {
            app.users = message.data;
            console.log(app.users);
        }
        //recieves leaderboard message from server
        else if (message.msg == "leaderboard") {
            updateLeaderboard(message.data);
            //app.leaderboard = message.data;
            console.log(message.data);
        }
        else if (message.msg == "stats"){
            updateStats(message.data);
        }
        else if(message.msg == "chat"){
            app.chats.push(message.data);
        }
    };
}

//var group = document.getElementById("group").textContent;

function send(msg){
    ws.send(JSON.stringify({msg:msg}));
}

function broadcast(msg,room){
    console.log("In broadcast, room: " + room);
    ws.send(JSON.stringify({room:room,msg:msg}))
 }

function join(room){
    ws.send(JSON.stringify({join:room}));
}

function bjoin(group){
    //alert(group);
    //var group = document.getElementById("group").textContent;
    app.currentGroup = group;
    app.showChat = true;
    app.chats = [];
    join(group);

}

function sendMessage(){
    var chatMessage = document.getElementById(app.currentGroup).value;
    console.log("chatMessage: " + chatMessage);
    chatMessage = username + ": " + chatMessage;
    console.log("currentGroup: " + app.currentGroup);
    broadcast(chatMessage, app.currentGroup);
}

/*
text.onchange=function(el){
    //alert(el.target.value);
    var groups = document.getElementById("groups").textContent;  
}
*/

function showModalFunction(username){
    console.log("this username was clicked: " + username);
    app.currentUserModal = username;
    for(var i = 0; i < app.userStats.length; i++){
        if(username == app.userStats[i].username){
            app.currentUserStatsModal = app.userStats[i].data;
        }
    }
    console.log("HIIII");
    console.log(app.currentUserStatsModal);
    app.showModal = true;
    openModal();
}

function openModal(){
    modal = document.getElementById("userModal");
    modal.style.display = "block";
}

function closeModal(){
    modal.style.display = "none";
}


function updateStats(data){
    var i;
    for(i = 0; i < data.length; i = i+3){
        var userJSON = {username: data[i].username, data: []};
        for(var j = i; j < (i+3); j++){
            var userData;
            var updatedTime = false;
            for(var z = 0; z < app.leaderboard.length; z++){
                if(app.leaderboard[z].difficulty == data[j].difficulty && app.leaderboard[z].username == data[j].username){
                    userData = {difficulty: data[j].difficulty, time: app.leaderboard[z].time, games_played: data[j].games_played};
                    updatedTime = true;
                }
            }
            if(updatedTime == false){
                userData = {difficulty: data[j].difficulty, time: "N/A", games_played: data[j].games_played};
            }
            userJSON.data.push(userData);
        }
        app.userStats.push(userJSON);
    }
    console.log("userStats: ");
    console.log(app.userStats);
}

//Updates the view model with leadboard data
//This is called in init(), when the websocket recieves a message
//of type leaderboard
function updateLeaderboard(data) {
    for (var i = 0; i < data.length; i++) {
        app.leaderboard.push(data[i]);
        if (data[i].difficulty == 0 && !(app.leaderboardBeginner.filter(e => e.username == data[i].username).length > 0)) {
            console.log("pushed");
            console.log(app.leaderboardBeginner);
            console.log("Data[i]: " + data[i]);
            app.leaderboardBeginner.push(data[i]);
        }
        else if (data[i].difficulty == 1 && !(app.leaderboardNovice.filter(e => e.username == data[i].username).length > 0)) {
            app.leaderboardNovice.push(data[i]);
        }
        else if (data[i].difficulty == 2 && !(app.leaderboardExpert.filter(e => e.username == data[i].username).length > 0)) {
            app.leaderboardExpert.push(data[i]);
        }
    }
    console.log("leaderboard: ");
    console.log(app.leaderboard);
}

//adds listener to the stage for left and right clicks
//Called in init() after the stage is initialized
//Called in changeDifficulty()
function addStageListener() {
    //when the stage is clicked...
    stage.on("stagemousedown", function (e) {
        //console.log("event: ");
        //console.log(e.nativeEvent.button);
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

        //counts the number of currently correct flags
        var correctFlags = 0;
        for (var i = 0; i < app.rows; i++) {
            for (var j = 0; j < app.cols; j++) {
                if (grid[i][j].flag == true && grid[i][j].mine == true) {
                    correctFlags++;
                }
            }
        }

        //if all mines have flags, you win
        if (correctFlags == app.mines) {
            console.log("you win!");
            var secondsOnClock = timer.getTimeValues().seconds;
            var minutesOnClock = timer.getTimeValues().minutes;
            var hoursOnClock = timer.getTimeValues().hours;
            var totalTimeInSeconds = secondsOnClock + (minutesOnClock * 60) + (hoursOnClock * 60 * 60);
            sendTime(totalTimeInSeconds);
            incrementGamesPlayed();
            //console.log(totalTimeInSeconds);
        }

        stage.update();
    });

}

//Updates the html canvas to the correct size based on our gameboard
function updateCanvas() {
    document.getElementById("canvas").setAttribute("width", app.rows * app.size);
    document.getElementById("canvas").setAttribute("height", app.cols * app.size);
}

//Changes the difficulty of the game, by resizing and adding more mines
//Resarts the game and updates the canvas accordingly
//Called by 3 html buttons (Beginner, Novice, Expert)
function changeDifficulty(diff) {
    if (diff == 0) {
        app.difficulty = "Beginner";
        app.difficultyValue = 0;
        app.rows = 10;
        app.cols = 10;
        app.mines = 10;
    }
    else if (diff == 1) {
        app.difficulty = "Novice";
        app.difficultyValue = 1;
        app.rows = 13;
        app.cols = 13;
        app.mines = 20;
    }
    else if (diff == 2) {
        app.difficulty = "Expert";
        app.difficultyValue = 2;
        app.rows = 15;
        app.cols = 15;
        app.mines = 30;
    }

    //
    updateCanvas();
    createMinefield();
    addStageListener();
    stage.update();

    //add overlay
    addOverlay();
}

function incrementGamesPlayed(){
    message = {
        difficulty: app.difficultyValue,
        time: "gamesPlayed"
    };
    ws.send(JSON.stringify(message));
}

//Sends a message to the server with the time if the user won
//Called in addStageListener() when all flags are correct
function sendTime(time) {
    message = {
        difficulty: app.difficultyValue,
        time: time
    };
    ws.send(JSON.stringify(message));
}

//Creates a minefield
//Called in init() and changeDifficulty()
function createMinefield() {
    //Makes 2D array and fills it will Cell objects
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

    //adds values to the number of neighbor mines
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

//Removes overlay and starts the timer
//Called onclick by html element
function removeOverlay() {
    document.getElementById("overlay").style.display = "none";

    //creates a new timer object
    timer = new easytimer.Timer();
    timer.start();
    timer.addEventListener("secondsUpdated", function (e) {
        $("#timer").html(timer.getTimeValues().toString());
    });
}

//Adds overlay and stops the timer
function addOverlay() {
    timer.stop();
    document.getElementById("overlay").style.display = "block";
}

//A sequence of events when you click a mine
//Shows the full board
//Called in addStageListener()
function gameOver() {
    //show full board
    for (var i = 0; i < app.rows; i++) {
        for (var j = 0; j < app.cols; j++) {
            grid[i][j].shown = true;
        }
    }
    //draw all squares (since they are all shown now)
    for (var i = 0; i < app.rows; i++) {
        for (var j = 0; j < app.cols; j++) {
            grid[i][j].draw();
        }
    }
    incrementGamesPlayed();
    timer.stop();
    stage.update();

    //reset board
    //createMinefield();
    //add overlay
    //addOverlay();
}

//Helper function to create a 2D array
function make2DArray(rows, cols) {
    var arr = new Array(rows);
    for (var i = 0; i < arr.length; i++) {
        arr[i] = new Array(cols);
    }
    return arr;
}
