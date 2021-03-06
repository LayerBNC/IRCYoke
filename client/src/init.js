/*
    IRCYoke
    Multi-network web interface for ZNC.
    http://github.com/Cydrobolt/IRCYoke
    @copyright [c] 2014 Chaoyi Zha
    @license MIT
    @title IRCYoke Init Script
*/
var socket;
$(function () {
    socket = io(serverLocation);
    var kbs = false;
    socket.on('loadStatusChange', function (data) {
        $('#statusText').html(data.status);
    });
    socket.on('connect', function () {
        socket.emit('confDecConnect', {"sid": sid});
    });
    socket.on('kill', function () {
        kbs = true;
        socket.disconnect();
    });
    socket.on('disconnect', function () {
        if (kbs === true) {return;}
        $('#statusText').text("Disconnected from server. Retrying...");
    });


    // DEBUG
    socket.on('readyConnect', function () {
    //socket.on('connect', function () {
      $.get( "src/static/initui.html", function( data ) {
          $('#wrapAll').html(data);
          // var sidebarHbT = loadHbT('#sidebar-template');
        });
    });
    window.messages = [];
    messages.Status = [];
    window.beforeUI = true;
    var bUIprocessRaw = function (rawObject) {
        // This function is used prior to UI loading
        rawObject = rawObject.log;
        var command = rawObject.command;
        var rargs = rawObject.args; // This is an array
        if (rargs[0] == "*") {
            messages.Status.push({
                from: rawObject.prefix,
                text: rargs[1]
            });
        }
        if (command == "rpl_motd") {
            messages.Status.push({
                from: rawObject.prefix,
                text: rargs[1]
            });
            window.selfNick = rawObject.args[0];
            window.selfServer = rawObject.prefix;
        }
    };
    socket.on('log', function (data) {
        console.log(data.log);
        if (beforeUI === true) {
            bUIprocessRaw(data);

        }
        else {
            processRaw(data);
        }

    });
    


});
