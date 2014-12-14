/*
    IRCYoke
    Multi-network web interface for ZNC.
    http://github.com/Cydrobolt/IRCYoke
    @copyright [c] 2014 Chaoyi Zha
    @license MIT
    @title IRCYoke Main Script
*/

$(function () {
    var socket = io(serverLocation);
    var kbs = false;
    socket.on('loadStatusChange', function (data) {
        $('#statusText').text(data.status);
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


    socket.on('readyConnect', function () {
    //socket.on('connect', function () {
      $.get( "initui.html", function( data ) {
          $('#wrapAll').html(data);
          $('#wrapAll').attr("class", "container");
        });
    });
    socket.on('log', function (data) {
        console.log(data.log);
    });


});
