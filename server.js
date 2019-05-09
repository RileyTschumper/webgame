var path = require("path");
var url = require("url");
var express = require("express");
var session = require("express-session");
var bodyParser = require("body-parser");
var sqlite3 = require("sqlite3");
var md5 = require("blueimp-md5");
var WebSocket = require("ws");
var http = require("http");

var app = express();
var server = http.createServer(app);
var port = 8017;
var wss = new WebSocket.Server({ server: server });

var db_filename = path.join(__dirname, "db", "webgame_database.sqlite3");
var public_dir = path.join(__dirname, "public");
var resource_dir = path.join(__dirname, "resources");
var db = new sqlite3.Database(db_filename, sqlite3, function(err) {
  console.log("Something");
  if (err) {
    console.log("Error opening database" + db_filename);
  } else {
    console.log("Now connected to " + db_filename);
  }
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true
  })
);

app.use(express.static(resource_dir));
app.get("/", (req, res) => {
  if (req.session.loggedin) {
    console.log("going home");
    res.redirect("/home");
  } else {
    res.sendFile(path.join(public_dir, "login.html"));
  }
});
var clients = {};
var client_usernames = [];
app.get("/home", (req, res) => {
  if (req.session.loggedin) {
    res.sendFile(path.join(public_dir, "index.html"));
    wss.on("connection", ws => {
      var client_id = ws._socket.remoteAddress + ":" + ws._socket.remotePort;
      console.log("New connection: " + client_id);
      clients[client_id] = ws;
      if (!client_usernames.includes(req.session.username)) {
        client_usernames.push(req.session.username);
      }
      //console.log(clients);

      ws.on("message", message => {
        console.log("Message from " + client_id + ": " + message);
      });
      ws.on("close", () => {
        console.log("Client disconnected: " + client_id);
        delete clients[client_id];
      });

      var username = { msg: "username", data: req.session.username };
      clients[client_id].send(JSON.stringify(username));

      var id;
      var usernameList = { msg: "username_list", data: client_usernames };
      for (id in clients) {
        if (clients.hasOwnProperty(id)) {
          clients[id].send(JSON.stringify(usernameList));
        }
      }
    });
  } else {
    res.send("Please login to view this page!");
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
        } else {
          res.send("Incorrect username and/or password");
          //res.end();
        }
      }
    );
  } else {
    res.send("Enter a username and password");
    res.end();
  }
});

app.post("/create", (req, res) => {
  username = req.body.username;
  password = req.body.password;
  password_confirm = req.body.password_confirm;
  if (password != password_confirm) {
    res.send("Passwords do not match. Re-enter your password.");
    res.end();
  } else {
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
        } else {
          hashedPassword = md5(password);
          console.log("Username: " + username);
          console.log("Password: " + password);
          db.run(
            "INSERT INTO users(username, password) VALUES(?, ?)",
            [username, hashedPassword],
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
server.listen(port, "0.0.0.0");
