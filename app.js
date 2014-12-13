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

var uuid = require('node-uuid');
var serverLocation = config.webHost + ":" + config.webPort;
var socketLocation = config.webHost + ":" + parseInt(config.webPort+1);

var app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server);
var passwords = [];

/*
var yoke = {
    createClient: function (username, password, port, server) {
        console.log('called');
        clientKey = uuid.v4();

        // On forcejoin, JOIN directive is received
        if (password === "") {
            serverPassword = false;
        }
        var useSSL = (port.indexOf("+") > -1);
        try {
            if (useSSL === true) {
                port = parseInt(port.slice(1, port.length)); // Get rid of the + and parseInt
            }
            else {
                port = parseInt(port);
            }
        }
        catch (err) {
            return false;
        }
        console.log('called2');

        var client = api.createClient(clientKey, {
            nick : username,
            user : username,
            server : server,
            realname: 'IRCYoke User',
            port: port,
            password: serverPassword,
            secure: useSSL
        });
        this.debugHook(clientKey);
        console.log('called3');

        return [client, clientkey];

    },
    destroyClient: function (clientKey) {
        try {
            var destroyed = api.destroyClient(clientKey);
            return true;
        }
        catch (err) {
            return false;
        }

    },
    debugHook: function (clientKey) {
        api.hookEvent(clientKey, '*', function(message) {
            console.log(message);
        });
    }

};
*/



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
var server_hosts = config.allowedHosts.split(':');

/*
 * SocketIO
 */
 /*
io.use(function(socket, next) {
    var req = socket.handshake;
    var res = {};
    cookieParser(req, res, function(err) {
        if (err) return next(err);
        session(req, res, next);
    });
});
*/
io.on('connection', function (socket) {
  console.log('A client connected.');
  socket.emit('loadStatusChange', { status: 'Awaiting configuration declaration...' });
  //yoke.createClient("ircyoketest", "", "6667", "irc.freenode.net", "test"); // fix
  socket.on('confDec', function (data) {
      console.log(data);
      var server_host = data.host;
      var server_port = data.port;
      if ((server_hosts.indexOf(server_host) < 0) && (config.allowedPorts.indexOf(server_port) < 0)) {
          // res.send("Okay, so your username is " + username + " and your password is " + password + "for server "+server_host);
          socket.emit('loadStatusChange', { status: 'Your configuration declaration has been rejected. <br /> Please make sure you are declaring only allowed servers and ports. ' });
          socket.boycott = true;
          return;
      }
      clientKey = uuid.v4();
      var username = socket.username;
      var password = passwords[username];
      var server = socket.server;
      var port = socket.port;
      socket.emit('loadStatusChange', { status: "Configuration accepted, waiting for client..." });

  });
  socket.on('ircConnect', function (data) {
      if (socket.boycott === true) {
          io.emit('loadStatusChange', {status: "Connection killed by IRCYoke: invalid configuration"});
          return;
      }
      // On forcejoin, JOIN directive is received
      if (password === "") {
          serverPassword = false;
      }
      var useSSL = (port.indexOf("+") > -1);
      try {
          if (useSSL === true) {
              port = parseInt(port.slice(1, port.length)); // Get rid of the + and parseInt
          }
          else {
              port = parseInt(port);
          }
      }
      catch (err) {
          return false;
      }
      socket.emit('loadStatusChange', {status: "Connected to IRC! Waiting for stabilization..."});
  });

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
        res.render('mainLoggedIn', {serverLocation: socketLocation, username: username, tServerHost: req.session.server, tServerPort: req.session.port});
    }
    else {
        var serverHosts = config.allowedHosts.split(':');
        res.render('mainNotLoggedIn', {servers: serverHosts, ports: config.allowedPorts});
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
    var server_port = req.param('server_port');


    if ((server_hosts.indexOf(server_host) > -1) && (config.allowedPorts.indexOf(server_port) > -1)) {
        // res.send("Okay, so your username is " + username + " and your password is " + password + "for server "+server_host);
        req.session.username = username;
        req.session.server = server_host;
        req.session.port = server_port;
        passwords[username] = password;
        res.writeHead(301,
            {Location: '/'}
        );
        res.end();
        return;
    }
    res.send("Nope, your port/server isn't in the list!");

});
