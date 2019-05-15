var path = require("path");
var url = require("url");
var express = require("express");
var session = require("express-session");
var bodyParser = require("body-parser");
var sqlite3 = require("sqlite3");
var md5 = require("blueimp-md5");
var WebSocket = require("ws");
var http = require("http");
var fs = require("fs");

var app = express();
var server = http.createServer(app);
var port = 8017;
var wss = new WebSocket.Server({
    server: server
});

var db_filename = path.join(__dirname, "db", "webgame_database.sqlite3");
var public_dir = path.join(__dirname, "public");
var resource_dir = path.join(__dirname, "resources");
var image_dir = path.join(__dirname, "images");
var db = new sqlite3.Database(db_filename, function (err) {
    if (err) {
        console.log("Error opening database" + db_filename);
    }
    else {
        console.log("Now connected to " + db_filename);
    }
});
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(
    session({
        secret: "secret",
        resave: true,
        saveUninitialized: true
    })
);

app.use(express.static(resource_dir));

var clients = {};
//array of [username, username, ...]
var client_usernames = [];
var client_id;
//an array of {client_id: ___, username:___}
var client_username = [];
//array of JSON objects {username: ___, difficulty: ___, time: ___}
var leaderboard_list = [];
//username of person who just logged in
var currUsername;
//an array of all client id's
var client_keys = [];
var stats_list = [];

wss.on("connection", ws => {
    var client_id = ws._socket.remoteAddress + ":" + ws._socket.remotePort;
    console.log("New connection: " + client_id);
    client_keys.push(client_id);
    clients[client_id] = ws;
    addClient(client_id);

    ws.room = [];

    ws.on("message", message => {
        console.log("Message from " + client_id + ": " + message);
        var parsedMessage = JSON.parse(message);

        if (parsedMessage.join) {
            console.log(".join: " + parsedMessage.join);
            ws.room.push(parsedMessage.join);
        }
        if (parsedMessage.room) {
            console.log(".room: " + parsedMessage.join);
            broadcast(message);
        }
        if (parsedMessage.msg) {
            console.log('.message: ', parsedMessage.msg);
        }

        //update number of games played
        if (parsedMessage.time == "gamesPlayed") {
            addGamePlayed(client_id, parsedMessage);
            updateClientsStats();
        }
        //console.log(client_username);
        else {
            console.log("Recieved a leaderboard update. AKA someone won a game.");
            sendLeaderboard(client_id, message);
        }
    });
    ws.on("close", () => {
        console.log("Client disconnected: " + client_id);
        delete clients[client_id];
        removeUser(client_id);
        sendUsernameList();
    });

    //send a list of all users currently online
    sendUsernameList();
    //Send client the leaderboard on connection
    var message = { msg: "leaderboard", data: leaderboard_list }
    clients[client_id].send(JSON.stringify(message));
    updateClientsStats();
});

function broadcast(message) {
    console.log("in broadcast function");
    var parsedMessage = JSON.parse(message);
    var messageToSend = { msg: "chat", data: parsedMessage.msg };
    console.log("messageToSend: ");
    console.log(messageToSend);
    wss.clients.forEach(client => {
        if (client.room.indexOf(JSON.parse(message).room) > -1) {
            client.send(JSON.stringify(messageToSend))
        }
    });
}

function addGamePlayed(client_id, message) {
    console.log("in the addGamePlayed");
    var username;
    var difficulty = message.difficulty;
    var gamesPlayed;
    //Finds the corresponding username to the client_id
    for (var i = 0; i < client_keys.length; i++) {
        if (client_keys[i] == client_id) {
            username = client_usernames[i];
        }
    }
    console.log("username: " + username);
    db.all("SELECT * FROM stats WHERE username = ? AND difficulty = ?", [username, difficulty], (err, rows) => {
        if (err) {
            throw err;
        }
        console.log("found in database");
        console.log(rows);
        gamesPlayed = rows[0].games_played;
        gamesPlayed++;
        console.log("gamesPlayed after increment: " + gamesPlayed);
        db.run("UPDATE stats SET games_played = ? WHERE username = ? AND difficulty = ?", [gamesPlayed, username, difficulty], (err) => {
            if (err) {
                throw err;
            }
        });
        for (user in stats_list) {
            if (username == user.username && difficulty == user.difficulty) {
                user.games_played = gamesPlayed;
            }
        }
    });
    //console.log("gamesPlayed before update: " + gamesPlayed);


}

//Sends all clients the leaderboard
//Called in sendLeaderboard()
function updateClientsLeaderboard() {
    console.log("Sending updated leaderboard to clients");
    var id;
    var leaderboardList = {
        msg: "leaderboard",
        data: leaderboard_list
    };
    for (id in clients) {
        if (clients.hasOwnProperty(id)) {
            clients[id].send(JSON.stringify(leaderboardList));
        }
    }

}

function updateClientsStats() {
    var id;
    console.log("IN UPDATECLIENTSSTATS, stats_list:");
    console.log(stats_list);
    var statsList = {
        msg: "stats",
        data: stats_list
    };
    for (id in clients) {
        if (clients.hasOwnProperty(id)) {
            clients[id].send(JSON.stringify(statsList));
        }
    }
}

//Updates and sends leaderboard 
function sendLeaderboard(client_id, message) {
    var username;
    message = JSON.parse(message);
    var time = message.time;
    var difficulty = message.difficulty;
    //console.log("Clients List: ");
    //console.log(client_keys);
    //console.log(client_usernames);
    //console.log("Client id: ");
    //console.log(client_id);

    //Finds the corresponding username to the client_id
    for (var i = 0; i < client_keys.length; i++) {
        if (client_keys[i] == client_id) {
            username = client_usernames[i];
        }
    }

    console.log("Username of person who won: " + username);

    //If user has already added a time for a certain difficulty
    db.all("SELECT * FROM leaderboard WHERE username = ? AND difficulty = ?", [username, difficulty], (err, rows) => {
        if (err) {
            throw err;
        }
        //If user has already added a time for a certain difficulty
        if (rows.length > 0) {
            //If it is a new best time, update the database
            if (time < rows[0].time) {
                db.run("UPDATE leaderboard SET time = ? WHERE username = ? AND difficulty = ?", [time, username, difficulty], (err) => {
                    if (err) {
                        throw err;
                    }
                    console.log("added " + username + " with a difficulty of " + difficulty + " time of " + time + " into the leaderboard");
                });
                console.log("THIS IS THE LEADERBOARD_LIST: ");
                console.log(leaderboard_list);
                for(var i = 0; i < leaderboard_list.length; i++){
                    console.log("finding location in leaderboard_list to update");
                    console.log("username: " + username + " == " + leaderboard_list[i].username + " && " + " difficulty: " + difficulty + " user.difficulty: " + leaderboard_list[i].difficulty);
                    if (username == leaderboard_list[i].username && difficulty == leaderboard_list[i].difficulty) {
                        console.log("Updated in leaderboard_list");
                        leaderboard_list[i].time = time;
                    }
                }
                updateClientsLeaderboard();
            }
        }
        //First time completing this difficulty, create a new entry
        else {
            db.run("INSERT INTO leaderboard(username, difficulty, time) VALUES(?,?,?)", [username, difficulty, time], (err) => {
                if (err) {
                    throw err;
                }
                console.log("NEW input into leaderboard database");
                console.log("added " + username + " with a difficulty of " + difficulty + " time of " + time + " into the leaderboard");
            });
            leaderboard_list.push({
                username: username,
                difficulty: difficulty,
                time: time
            });
            updateClientsLeaderboard();
        }
    });

}

/*
function sendUsername(username) {
    if (!client_usernames.includes(username)) {
        client_usernames.push(username);
    }
    console.log(username);
    var usernameString = {
        msg: "username",
        data: username
    };
    console.log(clients);
    clients[client_id].send(JSON.stringify(usernameString));
}
*/

//When a client disconnects, remove them from client_username and client_usernames
//Called in ws.on("close")
function removeUser(client_id) {
    console.log("removing user with client_id: " + client_id);
    console.log(client_username);
    var username;
    var i;
    for (i = 0; i < client_username.length; i++) {
        if (client_username[i].client_id == client_id) {
            username = client_username[i].username;
            client_username.splice(i, 1);
            console.log("found username for client");
        }
    }
    for (i = 0; i < client_usernames.length; i++) {
        if (client_usernames[i] == username) {
            console.log("removed username from list");
            client_usernames.splice(i, 1);
        }
    }
}

//Sends all clients a list of the username of all clients
//Called in app.get("/home"), wss.on("connection") and ws.on("close")
function sendUsernameList() {
    var id;
    var usernameList = { msg: "username_list", data: client_usernames };
    for (id in clients) {
        if (clients.hasOwnProperty(id)) {
            clients[id].send(JSON.stringify(usernameList));
        }
    }
}

//adds client_id and username as a JSON to client_username array
//Called in wss.on("connection")
function addClient(client_id) {
    client_username.push({ client_id: client_id, username: currUsername });
    //console.log(client_id);
}

//Route for default
app.get("/", (req, res) => {
    //Already logged in, send to /home route
    if (req.session.loggedin) {
        console.log("going home");
        res.redirect("/home");
    }
    //send login page
    else {
        res.sendFile(path.join(public_dir, "login.html"));
    }
});

//Route for main index.html page
app.get("/home", (req, res) => {
    if (req.session.loggedin) {
        fs.readFile(path.join(public_dir, "index.html"), "utf8", (err, data) => {
            //console.log(data);
            var index = data.replace("|||USER|||", req.session.username);
            res.send(index);
        });
        db.all("SELECT * FROM users WHERE username = ?", [req.session.username], (err, rows) => {
            if (err) {
                throw err;
            }

            if(rows.length > 0){
                client_usernames.push({username: rows[0].username, avatar: rows[0].avatar});
                sendUsernameList();
                currUsername = req.session.username;
            }
        //client_usernames.push(req.session.username);
        //sendUsernameList();
        //currUsername = req.session.username;
        });
    }
    //if not logged in, send to login page
    else {
        res.redirect("/");
    }

});

//Route for existing users to sign-in
app.post("/auth", (req, res) => {
    //parse data from form
    username = req.body.username;
    password = req.body.password;
    if (username != undefined && password != undefined) {
        hashedPassword = md5(password);
        db.all("SELECT * FROM users WHERE username = ? AND password = ?", [username, hashedPassword], (err, rows) => {
            if (err) {
                throw err;
            }
            //If it is found in database, log in successful
            //redirect to /home route
            if (rows.length > 0) {
                req.session.loggedin = true;
                req.session.username = username;
                res.redirect("/home");
            }
            else {
                res.send("Incorrect username and/or password");
            }
        });
    }
    else {
        res.send("Enter a username and password");
    }
});

//Route to create a new account
app.post("/create", (req, res) => {
    //parses items from form
    username = req.body.username;
    password = req.body.password;
    password_confirm = req.body.password_confirm;
    avatar = req.body.avatar;

    //passwords don't match
    if (password != password_confirm) {
        res.send("Passwords do not match. Re-enter your password.");
        res.end();
    }
    else {
        db.all("SELECT * FROM users WHERE username = ?", [username], (err, rows) => {
            if (err) {
                throw err;
            }
            //Username is already present in the database, choose a new one
            if (rows.length > 0) {
                res.send("Username is taken. Please select a new username");
                res.end();
            }
            //Add to users table
            else {
                hashedPassword = md5(password);
                console.log("Username: " + username);
                console.log("Password: " + hashedPassword);
                db.run("INSERT INTO stats(username, difficulty, games_played) VALUES(?,?,?)", [username, 0, 0], err => {
                    if (err) {
                        throw err;
                    }
                });
                stats_list.push({ username: username, difficulty: 0, games_played: 0 });
                db.run("INSERT INTO stats(username, difficulty, games_played) VALUES(?,?,?)", [username, 1, 0], err => {
                    if (err) {
                        throw err;
                    }
                });
                stats_list.push({ username: username, difficulty: 1, games_played: 0 });
                db.run("INSERT INTO stats(username, difficulty, games_played) VALUES(?,?,?)", [username, 2, 0], err => {
                    if (err) {
                        throw err;
                    }
                });
                stats_list.push({ username: username, difficulty: 2, games_played: 0 });
                db.run("INSERT INTO users(username, password, avatar) VALUES(?, ?, ?)", [username, hashedPassword, avatar], err => {
                    if (err) {
                        throw err;
                    }
                    console.log("added " + username + " to database");
                    req.session.loggedin = true;
                    req.session.username = username;
                    res.redirect("/home");
                });
            }
        });
    }
});

function initialize() {
    initializeLeaderboard();
    initializeStats();
}

function initializeStats() {
    db.all("SELECT * FROM stats", (err, rows) => {
        //console.log(rows);
        for (var i = 0; i < rows.length; i++) {
            stats_list.push({
                username: rows[i].username,
                difficulty: rows[i].difficulty,
                games_played: rows[i].games_played
            });
        }
    });

}

//initialize the leaderboard when server is started
function initializeLeaderboard() {
    db.all("SELECT * FROM leaderboard", (err, rows) => {
        console.log(rows);
        for (var i = 0; i < rows.length; i++) {
            leaderboard_list.push({
                username: rows[i].username,
                difficulty: rows[i].difficulty,
                time: rows[i].time
            });
        }
    });
    console.log("LEADERBOARD: ");
    console.log(leaderboard_list);
}

server.listen(port, "0.0.0.0", initialize());
