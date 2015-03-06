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
var irc = require('irc');
var uuid = require('node-uuid');
var serverLocation = config.webHost + ":" + config.webPort;

var app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server);
var users = []; // Userinfo
var clients = []; // IRC Connections
var timers = []; // Self explanatory

server.listen(parseInt(config.webPort));
// app.listen(config.webPort);

console.log("Starting IRCYoke...");
console.log("IRCYoke listening at " + serverLocation);
var randomID = uuid.v4();
app.use(session({
    secret: randomID
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
// DEBUG
//app.use(express.static(path.join(__dirname, 'build')));
app.use(express.static(path.join(__dirname, 'client')));

var server_hosts = config.allowedHosts.split(':');

/*
 * Yoke
 */
var yoke = {
    listen: function (socket, Client) {
        Client.on('raw', function (msg) {
            socket.emit('log', { log: msg });
        }); // debug

        Client.on('names', function (channel, nicks) {
            socket.emit('ulUpdate', { channel: channel, ul: nicks });
        });


    }
};

/*
 * SocketIO
 */




io.on('connection', function (socket) {
  console.log('A client connected.');
  socket.emit('loadStatusChange', { status: 'Awaiting configuration declaration...' });
  //yoke.createClient("ircyoketest", "", "6667", "irc.freenode.net", "test"); // fix
  socket.on('disconnect', function(data) {
      /*timers[socket.sid] = setTimeout(function () {*/
          try {
              clients[socket.sid].disconnect("IRCYoke: user disconnected");
              delete clients[socket.sid];
              delete timers[socket.sid];
              console.log('Client deleted!');
          }
          catch(err){console.log('Could not delete client: '+err);}
      /*}, 10000); // Ten second grace period to reconnect before killing connection*/

  });
  socket.on('sendMessage', function(data) {
     try {
         var sendTo = data.to;
         var sendMsg = data.message;
         var sendCli = clients[socket.sid];
         sendCli.say(sendTo, sendMsg);
     }
     catch (err) {
         socket.send('Error. Client not found');
     }
  });
  socket.on('sendCommand', function(data) {
     try {
         var sendCli = clients[socket.sid];
         var cmdArgsArray = data;
         console.log(cmdArgsArray);
         try {
             sendCli.send.apply(sendCli, cmdArgsArray);
         }
         catch (err) {
             socket.emit('error', "Invalid command sent.");
         }
     }
     catch (err) {
        console.log('Error: '+err);
     }
  });
  socket.on('confDecConnect', function (data) {
      var sid = data.sid;
      socket.sid = sid;
      /*try {
          if (timers.indexOf(sid) > -1) {
              // Let them live if their connection is on grace
              clearTimeout(timers[sid]);
              delete timers[sid];
              socket.emit('loadStatusChange', { status: "Resuming previous session..." });
              socket.emit('readyConnect');
              yoke.listen(socket, clients[sid]);
              return;
          }
      } catch(err) {}*/
      var server_host, server_port, server_pass, server_user;
      try {
          server_host = users[sid].server_host;
          server_port = users[sid].server_port;
          server_pass = users[sid].password;
          server_user = users[sid].username;
      }
      catch (err) {
          socket.emit('loadStatusChange', { status: "Disconnected by server: Invalid session ID <br /><a id=\"dark\" href=\"/logout\">Try Again</a>"});
          socket.emit('kill', function () {
              socket.disconnect();
          });
          return;
      }
      var usernameRegex = /[a-z_\-\[\]\\^{}|`][a-zA-Z0-9_\-\[\]\\^{}|`]*/;
      var usernameMatchRegex = server_user.match(usernameRegex);
      if (usernameMatchRegex != server_user) {
          socket.emit('loadStatusChange', { status: 'Invalid username. Disconnected by server. <br /><a id=\"dark\" href="/logout">Try Again</a>' });
          socket.emit('kill', function () {
              socket.disconnect();
          });
          return;
      }

      if ((server_hosts.indexOf(server_host) < 0) && (config.allowedPorts.indexOf(server_port) < 0)) {
          // res.send("Okay, so your username is " + username + " and your password is " + password + "for server "+server_host);
          socket.emit('loadStatusChange', { status: 'Server and Port not allowed. Disconnected by server. <br /><a href="/logout">Try Again</a>' });
          socket.emit('kill');
          socket.disconnect();
          return;
      }
      socket.emit('loadStatusChange', { status: "Connection accepted, waiting for remote server..." });

      // On forcejoin, JOIN directive is received
      var connect = [];
      connect.host = server_host;
      connect.user = server_user;
      if (server_pass === "") {
          connect.pass = null;
      }
      connect.ssl = (server_port.indexOf("+") > -1);
      try {
          if (connect.ssl === true) {
              connect.port = parseInt(server_port.slice(1, server_port.length)); // Get rid of the + and parseInt
          }
          else {
              connect.port = parseInt(server_port);
          }
      }
      catch (err) {
          socket.emit('loadStatusChange', { status: "Error: Could not parse server information. <br /><a style=\"color:white\" href=\"/logout\">Try Again</a>"});
          socket.disconnect();
      }
      // DEBUG
      // return;
      clients[sid] = new irc.Client(connect.host, connect.user, {
        userName: connect.user,
        realName: 'IRCYoke User',
      	port: connect.port,
        debug: true,
    	secure: connect.ssl,
        channels: ['##cydrobolt-test'],
        password: connect.pass
    });


      socket.emit('loadStatusChange', { status: "Connecting to IRC..." });
      clients[sid].on('registered', function() {
          socket.emit('loadStatusChange', { status: "Connection complete, initializing UI..." });
          socket.emit('readyConnect');
      });
      yoke.listen(socket, clients[sid]);
  });

});



/*
   Routes
*/
function genHandleError(res, err) {
	res.render('error', {error: err});
}

app.get('/', function(req,res) {
    var sid = req.session.sid;
    if (sid && sid !== null && sid !== undefined) {
        var sendUser = users[sid].username;
        res.render('mainLoggedIn', {sid: sid, serverLocation: config.webPublicLocation, username: sendUser});
    }
    else {
        var serverHosts = config.allowedHosts.split(':');
        res.render('mainNotLoggedIn', {servers: serverHosts, ports: config.allowedPorts});
    }
});


app.get('/logout', function(req, res) {
    delete req.session.sid;
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
        var sid = uuid.v4();
        req.session.sid = sid;
        users[sid] = [];
        users[sid].username = username;
        users[sid].server_host = server_host;
        users[sid].server_port = server_port;
        users[sid].password = password;
        res.writeHead(301,
            {Location: '/'}
        );
        res.end();
        return;
    }
    res.send("Nope, your port/server isn't in the list!");

});
