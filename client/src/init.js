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
    socket.on('loadStatusChange', function (data) {
        $('#statusText').text(data.status);
    });
    socket.on('connect', function () {
        socket.emit('confDecConnect', {"sid": sid});
    });
    socket.on('disconnect', function () {
        $('#statusText').text("Disconnected from server. Retrying...");
    });
    socket.on('readyConnect', function () {

      $.get( "initui.html", function( data ) {
          $('#wrapAll').html(data);
        });

    });
});
