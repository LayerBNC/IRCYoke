/*
    IRCYoke
    Multi-network web interface for ZNC.
    http://github.com/Cydrobolt/IRCYoke
    @copyright [c] 2014 Chaoyi Zha
    @license MIT
    @title IRCYoke Client Script
*/
window.messages = [];
messages.Status = [];
messages.Status.push("Connecting to server...");
$(function () {

    $('#nonUI').remove();
    $('#fill_username').text(username);


    // Dynamically load handlebar templates

    window.source   =  $('#sidebar-template').html();//$("#sidebar-template").html();

    window.sidebarTemplate = Handlebars.compile(source);

    window.SidebarModel = Backbone.Model.extend({
        promptColor: function() {
            var cssColor = prompt("Please enter a CSS color:");
            this.set({color: cssColor});
        }
    });


    window.sidebar = new SidebarModel();

    window.MessageModel = Backbone.Model.extend({
        newMessage: function() {
            var cssColor = prompt("Please enter a CSS color:");
            this.set({color: cssColor});
        }
    });


    window.message = new MessageModel();

    /*
     *  Event Listeners
     */
    sidebar.on('change:networks', function(model, data) {
        var fsidebarContextChg = {
            networks: data
        };
        console.log("Networks/channels changed.");
        console.log(data);
        console.log(fsidebarContextChg);
        var fsidebarHtmlChg = sidebarTemplate(fsidebarContextChg);
        $("#userlist").html(fsidebarHtmlChg);
    });
    message.on('change:channel', function(model, data) {
        var newChan = data; // Set to a scoped variable in order to prevent async conflicts
        console.log("Listening to new channel...");
        window.mChan = data;
        $('li').removeClass('active');
        $("li:contains("+newChan+")").filter(function() {return $(this).text() === newChan;}).addClass('active');

    });

});
function updateChan (self) {
    var chan = $(self).text();
    console.log(chan);
    message.set({
        channel: chan
    });
}
function enumChans () {
    var channels = Object.keys(messages);
    var statusIndex = channels.indexOf("Status");

}
function msgUpdate(chan, msg) {
    if (mChan == chan) {
        // If the message comes from the channel currently open
        message.newMessage(msg); // Trigger a Backbone event
    }
    else {
        // If chan not currently open, then ignore for now
        sidebar.set({
            networks: [
                {
                    name: "freenode",
                    channels: channels
                }
            ]
        });
    }
}
function processRaw (rawObject) {
    rawObject = rawObject.log;
    var command = rawObject.command;
    var from = rawObject.prefix;
    var rargs = rawObject.args; // This is an array
    console.log(rargs);
    console.log(JSON.stringify(rawObject));
    if(command == "JOIN") {
        var chan2j = rargs[0];
        messages[chan2j] = [];
        messages[chan2j][0] = "Joined channel "+chan2j;
        enumChans();
    }
    if (command == "PRIVMSG") {
        var recvPMChan = rargs[0];
        var recvPMMsg = rargs[1];
        /*if (messages.indexOf(recvPMChan) < 0) {
            // It is a private message
            messages[recvPMChan] = [];
        }*/

        console.log( messages[recvPMChan].push(recvPMMsg) );
        console.log(messages[recvPMChan]);
        msgUpdate(recvPMChan, recvPMMsg);
    }
    if (rargs[0] == "*") {
        messages.Status.push(rargs[1]);
    }
}
