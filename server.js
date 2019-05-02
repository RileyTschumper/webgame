var path = require('path');
var url = require('url');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var sqlite3 = require('sqlite3');

var app = express();
var port = 8017;

var db_filename = path.join(__dirname, 'db', 'webgame_database.sqlite3');
//var public_dir = path.join(__dirname, 'public');

var db = new sqlite3.Database(db_filename, sqlite3, (err) => {
	if(err) {
		console.log('Error opening database' + db_filename);
	}
	else {
		console.log('Now connected to ' + db_filename);
	}
});
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

//app.use(express.static(public_dir));

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname + '/public/login.html'));
});

app.post('/auth', (req, res) => {
	console.log(req.body.username);
	console.log(req.body.password);
});

var server = app.listen(port);

