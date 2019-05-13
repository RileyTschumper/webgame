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
var leaderboard_list = [];
var currUsername;
var client_keys = [];

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

//function connect(){
//console.log("in connect");
wss.on("connection", ws => {
    var client_id = ws._socket.remoteAddress + ":" + ws._socket.remotePort;
    console.log("New connection: " + client_id);
    console.log(client_id);
    var output = {
        [client_id]: ws
    }
    client_keys.push(client_id);
    clients[client_id] = ws;
    addClient(client_id);

    //console.log(clients);

    ws.on("message", message => {
        console.log("Message from " + client_id + ": " + message);
        console.log(client_username);
        sendLeaderboard(client_id, message);
    });
    ws.on("close", () => {
        console.log("Client disconnected: " + client_id);
        delete clients[client_id];
        removeUser(client_id);
        sendUsernameList();
    });

    sendUsernameList();
    console.log("LEADERBOARD BEFORE SEND: ");
    console.log(leaderboard_list);
    var message = {
        msg: "leaderboard",
        data: leaderboard_list
    }
    clients[client_id].send(JSON.stringify(message));
    console.log(clients);

});

function updateClientsLeaderboard() {
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

function sendLeaderboard(client_id, message) {
    var username;
    message = JSON.parse(message);
    var time = message.time;
    var difficulty = message.difficulty;
    //var client_keys = [];
    //for(var i = 0; i < clientsArray.length; i++){

    //}
    //var client_keys = Object.keys(clients);
    console.log("Clients List: ");
    console.log(client_keys);
    console.log(client_usernames);
    console.log("Client id: ");
    console.log(client_id);
    for (var i = 0; i < client_keys.length; i++) {
        if (client_keys[i] == client_id) {
            username = client_usernames[i];
        }
    }
    db.all("SELECT * FROM leaderboard WHERE username = ? AND difficulty = ?", [username, difficulty], (err, rows) => {
        if (err) {
            throw err;
        }
        if (rows.length > 0) {
            if (time < rows[0].time) {
                db.run("UPDATE leaderboard SET time = ? WHERE username = ? AND difficulty = ?", [time, username, difficulty], (err) => {
                    if (err) {
                        throw err;
                    }
                    console.log("added " + username + " with a difficulty of " + difficulty + " time of " + time + " into the leaderboard");
                });
                for (user in leaderboard_list) {
                    if (username == user.username && difficulty == user.difficulty) {
                        user.time = time;
                    }
                }
                updateClientsLeaderboard();
            }
            //console.log(rows);
        }
        else {
            db.run("INSERT INTO leaderboard(username, difficulty, time) VALUES(?,?,?)", [username, difficulty, time], (err) => {
                if (err) {
                    throw err;
                }
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

function sendUsernameList() {
    var id;
    var usernameList = {
        msg: "username_list",
        data: client_usernames
    };
    for (id in clients) {
        if (clients.hasOwnProperty(id)) {
            clients[id].send(JSON.stringify(usernameList));
        }
    }
}

function addClient(client_id) {
    client_username.push({
        client_id: client_id,
        username: currUsername
    });
    console.log(client_id);
}

app.get("/", (req, res) => {
    if (req.session.loggedin) {
        console.log("going home");
        res.redirect("/home");
    }
    else {
        res.sendFile(path.join(public_dir, "login.html"));
    }
});

app.get("/home", (req, res) => {
    if (req.session.loggedin) {
        fs.readFile(path.join(public_dir, "index.html"), "utf8", (err, data) => {
            console.log(data);
            var index = data.replace("|||USER|||", req.session.username);
            res.send(index);

        });
        console.log("pushed username: " + req.session.username + " onto array");
        client_usernames.push(req.session.username);
        //console.log(clients);
        //client_username.push({client_id: client_id, username: req.session.username});
        sendUsernameList();
        currUsername = req.session.username;
        //addClient(req.session.username);
        //console.log("clients: " + clients);
        //var username = req.session.username;
        //connect();
        //console.log(username);
        //sendUsername(username);
        //sendUsernameList();
    }
    else {
        res.redirect("/");
    }
    //res.end();
});


app.post("/auth", (req, res) => {
    username = req.body.username;
    password = req.body.password;
    if (username != undefined && password != undefined) {
        hashedPassword = md5(password);
        db.all(
            "SELECT * FROM users WHERE username = ? AND password = ?",
            [username, hashedPassword],
            (err, rows) => {
                if (err) {
                    throw err;
                }
                if (rows.length > 0) {
                    req.session.loggedin = true;
                    req.session.username = username;
                    res.redirect("/home");
                }
                else {
                    res.send("Incorrect username and/or password");
                    //res.end();
                }
            }
        );
    }
    else {
        res.send("Enter a username and password");
        res.end();
    }
});

app.post("/create", (req, res) => {
    username = req.body.username;
    password = req.body.password;
    password_confirm = req.body.password_confirm;
    avatar = req.body.avatar;
    console.log(avatar);
    if (password != password_confirm) {
        res.send("Passwords do not match. Re-enter your password.");
        res.end();
    }
    else {
        db.all(
            "SELECT * FROM users WHERE username = ?",
            [username],
            (err, rows) => {
                if (err) {
                    throw err;
                }
                if (rows.length > 0) {
                    res.send("Username is taken. Please select a new username");
                    res.end();
                }
                else {
                    hashedPassword = md5(password);
                    console.log("Username: " + username);
                    console.log("Password: " + password);
                    db.run(
                        "INSERT INTO users(username, password, avatar) VALUES(?, ?, ?)",
                        [username, hashedPassword, avatar],
                        err => {
                            if (err) {
                                throw err;
                            }
                            console.log("added " + username + " to database");
                            req.session.loggedin = true;
                            req.session.username = username;
                            res.redirect("/home");
                        }
                    );
                }
            }
        );
    }
});
server.listen(port, "0.0.0.0", initializeLeaderboard());