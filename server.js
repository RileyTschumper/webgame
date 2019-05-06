var path = require('path');
var url = require('url');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var sqlite3 = require('sqlite3');
var md5 = require('blueimp-md5');

var app = express();
var port = 8017;

var db_filename = path.join(__dirname, 'db', 'webgame_database.sqlite3');
var public_dir = path.join(__dirname, 'public');

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
	if(req.session.loggedin){
		res.redirect('/home');
	}
	else{	
		res.sendFile(path.join(public_dir, 'login.html'));
	}
});

app.get('/home', (req, res) => {
	if(req.session.loggedin){
		res.send('Welcome back, ' + req.session.username + '!');
	}
	else{
		res.send('Please login to view this page!');
	}
	res.end();
});

app.post('/auth', (req, res) => {
	username = req.body.username;
	password = req.body.password;
	if(username != undefined && password != undefined){
		hashedPassword = md5(password);
		db.all('SELECT * FROM users WHERE username = ? AND password = ?', [username, hashedPassword], (err, rows) => {
			if(err){
				throw err;
			}	
			if(rows.length > 0){
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/home');
			}
			else {
				res.send('Incorrect username and/or password');
			}
			res.end();
		});
	}
	else {
		res.send('Enter a username and password');
		res.end();
	}
});

app.post('/create', (req,res) => {
	username = req.body.username;
	password = req.body.password;
	password_confirm = req.body.password_confirm;
	if(password != password_confirm){
		res.send('Passwords do not match. Re-enter your password.');
		res.end();
	}
	else {
		db.all('SELECT * FROM users WHERE username = ?', [username], (err, rows) => {
			if(err) {
				throw err;
			}
			if(rows.length > 0){
				res.send('Username is taken. Please select a new username');
				res.end();
			}
			else{
				hashedPassword = md5(password);
				console.log("Username: " + username);
				console.log("Password: " + password);
				db.run('INSERT INTO users(username, password) VALUES(?, ?)', [username, hashedPassword], (err) => {
					if(err){
						throw err;
					}
					console.log("added " + username + " to database");
					req.session.loggedin = true;
					req.session.username = username;
					res.redirect('/home');
				});		
			}
		});
	}
});
var server = app.listen(port);
