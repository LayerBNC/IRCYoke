/*
    IRCYoke
    Multi-network web interface for ZNC.
    http://github.com/Cydrobolt/IRCYoke
    @copyright [c] 2014 Chaoyi Zha
    @license MIT
    @title IRCYoke Client Script
*/

$(function () {
    window.nMsg = [];
    window.beforeUI = false;
    window.userlists = [];

    $('#nonUI').remove();
    $('#fill_username').text(username);


    // Dynamically load handlebar templates

    window.source   =  $('#sidebar-template').html();
    window.sidebarTemplate = Handlebars.compile(source);

    window.sourceMsgField   =  $('#message-template').html();
    window.messageTemplate = Handlebars.compile(sourceMsgField);

    window.sourceUserList   =  $('#userlist-template').html();
    window.userListTemplate = Handlebars.compile(sourceUserList);

    window.SidebarModel = Backbone.Model.extend({
        promptColor: function() {
            var cssColor = prompt("Please enter a CSS color:");
            this.set({color: cssColor});
        }
    });


    window.sidebar = new SidebarModel();

    window.MessageModel = Backbone.Model.extend({
        newMessage: function(from, text) {
            var fmessageContextChg = {
                message: [{from: from , text: text }]
            };
            var fmessageHtmlChg = messageTemplate(fmessageContextChg);
            $(".messages").append(fmessageHtmlChg);
        },
        enumUl: function () {
            channel = mChan;
            try {
                userList = userlists[channel];
                var fuserListContextChg = {
                    oper: userList.opers,
                    voice: userList.voices,
                    other: userList.other,
                    user: userList.users
                };
                var fuserListHtmlChg = userListTemplate(fuserListContextChg);
                $('.rusers').html(fuserListHtmlChg);
            }
            catch (err) {
                // Probably switching to "Status"
                // Ignore the error and empty the userlist
                $('.rusers').html("");
            }

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

        // On channel change

        var newChan = data; // Set to a scoped variable in order to prevent async conflicts
        console.log("Listening to new channel...");
        if (newChan == "Status") {
            $('.inputMessage').prop('disabled', true);
        }
        else {
            $('.inputMessage').prop('disabled', false);
        }
        window.mChan = data;
        $('.sbarlink').removeClass('active');
        $( ".sbarlink:contains('"+newChan+"')" ).filter(function() {
            return $(this).text() == newChan;
        }).addClass('active');

        // Render the channel's messages
        msgList = messages[newChan];
        var fmessageContextChg = {
            message: msgList
        };
        var fmessageHtmlChg = messageTemplate(fmessageContextChg);
        $(".messages").html(fmessageHtmlChg);

        // Update userlist
        try {
            userList = userlists[newChan];
            var fuserListContextChg = {
                oper: userList.opers,
                voice: userList.voices,
                other: userList.other,
                user: userList.users
            };
            var fuserListHtmlChg = userListTemplate(fuserListContextChg);
            $('.rusers').html(fuserListHtmlChg);
        }
        catch (err) {
            // Probably switching to "Status"
            // Ignore the error and empty the userlist
            $('.rusers').html("");
        }


        scrollBottom();
    });
    $('body').delegate('.inputMessage', 'keypress', function(event) {
        if (event.keyCode == 13) {
            sendMessage($('.inputMessage').val(), mChan);
            $('.inputMessage').val('');
        }
    });
    message.set({
        channel: "Status"
    });
    $('.inputMessage').prop('disabled', true);


});
function scrollBottom() {
    $('.messages').scrollTop($('.messages')[0].scrollHeight);
}
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
    sidebar.set({
        networks: [
            {
                name: "freenode",
                channels: channels
            }
        ]
    });

}
function msgUpdate(chan, msg, from) {
    if (mChan == chan) {
        // If the message comes from the channel currently open
        message.newMessage(from, msg); // Trigger a Backbone event
    }
    else {
        // If chan not currently open, then show a badge
        nMsg[chan] = (nMsg[chan] + 1) || 1;
        chanFil = chan.replace(/#/g, "\\#");
        $(chanFil+"-badge").html(nMsg[chan]);
    }
}
function processRaw (rawObject) {
    rawObject = rawObject.log;
    var command = rawObject.command;
    var from = rawObject.prefix;
    var rargs = rawObject.args; // This is an array
    console.log(rargs);

    /* check if userlist needs to be updated */
    if (command == "NICK" || command == "KICK" || command == "PART") {
            var updateReq = [];
            if (command == "NICK") {
                if (selfNick == rargs[0]) {
                    // TODO: Optimize
                    _.each(userList, function (chanData, chanName) {
                        sendCommand("/WHO "+chanName);
                    });
                }
                else {
                    _.each(userList, function (chanData, chanName) {
                        if ($.inArray(rawObject.nick, chanData)) {
                            // If user matches user changing nick
                            updateReq.push(chanName);
                            var nick_change = rawObject.nick + " is now known as "+ rargs[0];
                            msgUpdate(chanName, nick_change, chanName);
                        }
                    });
                }
                _.each(updateReq, function (needUpdateChan) {
                    // Update list
                    sendCommand("/WHO "+needUpdateChan);
                });
            }
            else if (command == "PART" || command == "JOIN" || command == "KICK") {
                sendCommand("/WHO "+rargs[0]);
            }
    }

    /* check if message needs to be pushed to view */



    if(command == "JOIN" && rawObject.nick == selfNick) {
        // User joins a channel
        var chan2j = rargs[0];
        messages[chan2j] = [];
        enumChans();
        var inter0 = "You have joined "+chan2j;
        messages[chan2j].push({
            from: chan2j,
            text: inter0
        });
        userlists[chan2j] = [];
        userlists[chan2j].opers = [];
        userlists[chan2j].users = [];
        userlists[chan2j].voices = [];
        userlists[chan2j].others = [];


        message.set({
            channel: chan2j
        });
        sendCommand("/WHO "+chan2j);
        // delete userlists[chan2j];


    }
    else if(command == "PART" && rawObject.nick == selfNick) {
        var chan2l = rargs[0];
        delete messages[chan2l];
        enumChans();
    }
    else if(command == "NICK") {
        var newNick = rargs[0];
        var oldNick = rawObject.nick;
        if (oldNick == selfNick) {
            selfNick = newNick;
            $('#fill_username').text(selfNick);
            return;
        }

        // syncUserList();
        var inter4 = oldNick+" is now known as "+newNick;
        // DEBUG
        // Need to search ULs to find user
        messages.Status.push({
            from: selfServer,
            text: inter4
        });
    }
    else if(command == "JOIN" && rawObject.nick != selfNick) {
        var joinNick = rawObject.nick;
        var joinHost = rawObject.prefix;
        var channelJoined = rawObject.args[0];
        var inter1 = joinNick+" ("+joinHost+") has joined the channel";
        messages[channelJoined].push({
            from: channelJoined,
            text: inter1
        });
        msgUpdate(channelJoined, inter1, channelJoined);
    }
    else if(command == "PART" && rawObject.nick != selfNick) {
        var partNick = rawObject.nick;
        var partHost = rawObject.prefix;
        var channelParted = rawObject.args[0];
        var inter6 = partNick+" ("+partHost+") has left the channel";
        messages[channelParted].push({
            from: channelParted,
            text: inter6
        });
        msgUpdate(channelParted, inter6, channelParted);
    }
    else if(command == "rpl_endofwho") {
        message.enumUl();
        // re-enum userlists
    }
    else if(command == "KICK") {
        var chanKicked = rargs[0];
        var kicked = rargs[1];

        if (kicked == selfNick) {
            // If user was kicked
            delete messages[chanKicked];
            enumChans();
            return;
        }
        var inter2 = kicked+" kicked from channel by "+rawObject.nick;
        messages[chanKicked].push({
            from: chanKicked,
            text: inter2
        });
        msgUpdate(chanKicked, inter2, chanKicked);
        console.log('Someone was kicked.');
    }
    else if(command == "NOTICE") {
        var inter3 = " - "+rawObject.nick+" - "+rawObject.args[1];
        messages.Status.push({
            from: selfServer,
            text: inter3
        });
        console.log('Someone was kicked.');
    }
    else if(command == "rpl_whoreply") {
        console.log("RECEIVED 352 WHO REPLY");
        console.log(rargs);
        // `/who` namelist response
        // delete userlists[rargs[1]]; DO THIS AT WHO CALL
        var ulNick = rargs[5];
        var ulCStatus = rargs[6];
        var ulChan = rargs[1];

        var type = "user"; // default is user
        console.log(ulCStatus);
        switch (ulCStatus) {
            case 'H@':
                type = "oper";
                break;

            case 'H+':
                type = "voice";
                break;

            case 'H%':
                type = "other";
                break;
        }
        console.log("STATUS: "+type);
        if (type == "oper") {
            userlists[ulChan].opers.push(ulNick);
        }
        else if (type == "voice") {
            userlists[ulChan].voices.push(ulNick);
        }
        else if (type == "other") {
            userlists[ulChan].other.push(ulNick);
        }
        else {
            userlists[ulChan].users.push(ulNick);
        }
    }
    else if(command == "477") {
        var from477 = rawObject.args[1];
        var message477 = rawObject.args[2];
        // Blocked from joining
        messages.Status.push({
            from: from477,
            text: message477
        });
        messages[from477] = [];
        enumChans();
        messages[from477].push({
            from: from477,
            text: message477
        });
    }
    else if (command == "PRIVMSG") {
        var recvPMChan = rargs[0];
        var recvPMMsg = rargs[1];
        var recvPMFrom = rawObject.nick;
        /*if (messages.indexOf(recvPMChan) < 0) {
            // It is a private message
            messages[recvPMChan] = [];
        }*/
        messages[recvPMChan].push({
            from: recvPMFrom,
            text: recvPMMsg
        });
        // Message limit changeable
        if (messages[recvPMChan].length > 230) {
            messages[recvPMChan].shift(); // Get rid of first index
        }
        msgUpdate(recvPMChan, recvPMMsg, recvPMFrom);
    }
    else if (rargs[0] == "*") {
        messages.Status.push({
            from: rawObject.prefix,
            text: rargs[1]
        });
    }
    else if (command == "rpl_motd") {
        messages.Status.push({
            from: rawObject.prefix,
            text: rargs[1]
        });
    }
    else if (command == "rpl_namreply") {
        var namrChan = rawObject.args[2];
        var namrList = rawObject.args[3];

        var returnObject = {
            ul: namrList,
            chan: namrChan
        };
        // ulUpdate(returnObject);
        // Should be replaced by WHO
    }
    else if (rargs[0] == selfNick) {
        // Generic command reply, e.g whois reply
        // Push to current view
        rargs.splice(0, 1); // Get rid of prefix
        var concat_reply = rargs.join(" ");

        msgUpdate(mChan, concat_reply, rawObject.prefix);
    }
}
function sendCommand(command) {
    console.log("Sent command: "+command);
    var cmdParse = command.substr(1).toLowerCase();

    var cmdArgs = cmdParse.split(' ');
    if ( (cmdArgs[0] == "part" || cmdArgs[0] == "leave") && cmdArgs[1] === undefined ) {
        cmdArgs[0] = "part";
        cmdArgs[1] = mChan;
    }
    if ( cmdArgs[0] == "who") {
        var whochan = cmdArgs[1];
        delete userlists[whochan];
        userlists[whochan] = [];
        userlists[whochan].opers = [];
        userlists[whochan].users = [];
        userlists[whochan].voices = [];
        userlists[whochan].others = [];
    }
    socket.emit('sendCommand', cmdArgs);
}
function sendMessage(message, to) {
    if(message.startsWith('/')) {
        sendCommand(message);
        return;
    }
    messages[to].push({
        from: selfNick,
        text: message
    });
    socket.emit("sendMessage", { to: to, message: message });
    msgUpdate(to, message, selfNick);
    scrollBottom();
    console.log("Message sent!");
}
function pushCurrentView(from, message) {
    msgUpdate(mChan, message, from); // Push to current view
}
function ulUpdate (data) {
    var userList = data.ul;
    var userListChan = data.chan;

    var userListArray = userList.split(' ');
    var parseUserList = [];
    parseUserList.opers = [];
    parseUserList.voices = [];
    parseUserList.other = [];
    parseUserList.users = [];

    userListArray.forEach(function (element, index, array) {
        // index is key
        // value is element
        var type = "user";
        if (element.startsWith('@')) {
            type = "oper";
            parseUserList.opers.push(element);
        }
        else if (element.startsWith('+')) {
            type = "voice";
            parseUserList.voices.push(element);
        }
        else if (element.startsWith('%')) {
            type = "other";
            parseUserList.other.push(element);
        }
        else {
            parseUserList.users.push(element);
        }
    });
    console.log(parseUserList);
    userlists[userListChan] = parseUserList;

}
socket.on('error', function (data) {
    messages.Status.push({
        from: "IRCYoke Server",
        text: data
    });
});
