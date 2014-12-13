#!/usr/bin/env node

/*
    IRCYoke
    Multi-network web interface for ZNC.
    http://github.com/Cydrobolt/IRCYoke
    @copyright [c] 2014 Chaoyi Zha
    @license MIT
    @title IRCYoke Server
*/

var irc = require('irc');
var S = require('string');
var config = require('./config.json');
var mongoose = require('mongoose');

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var bodyParser = require('body-parser');

var serverLocation = config.webHost + ":" + config.webPort;
var socketLocation = config.webHost + ":" + parseInt(config.webPort+1);
var app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(parseInt(config.webPort+1));
app.listen(config.webPort);

console.log("Starting IRCYoke...");
console.log("IRCYoke listening at " + serverLocation);

app.use(session({
    secret: 'omg_so_secret'
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
/*
   Connect to MongoDB
*/

mongoose.connect(config.mongoConnect);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("Connected to MongoDB server");
});

var Template = mongoose.model('User', { key: String });

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/*
 * SocketIO
 */

io.on('connection', function (socket) {
  console.log('omg');
  socket.emit('loadStatusChange', { status: 'Connecting to IRC server...' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

/*
   Routes
*/
function genHandleError(res, err) {
	res.render('error', {error: err});
}

app.get('/', function(req,res) {
    var username = req.session.username;
    if (username && username !== null && username !== undefined) {
        res.render('mainLoggedIn', {serverLocation: socketLocation});
    }
    else {
        var serverHosts = config.zncHosts.split(':');
        res.render('mainNotLoggedIn', {servers: serverHosts});
    }
});


app.get('/logout', function(req, res) {
    delete req.session.username;
    res.writeHead(301,
         {Location: '/'}
    );
    res.end();
    return;
});

app.post('/identify', function(req, res) {
	var username = req.param('username');
	var password = req.param('password');
    var server_host = req.param('server_host');
    var server_hosts = config.zncHosts.split(':');
    if (server_hosts.indexOf(server_host) > -1) {
        // res.send("Okay, so your username is " + username + " and your password is " + password + "for server "+server_host);
        req.session.username = username;
        req.session.server = server_host;
        res.writeHead(301,
            {Location: '/'}
        );
        res.end();
        return;
    }
    res.send("Nope, your server isn't in the list!");

});
