/*
    IRCYoke
    Multi-network web interface for ZNC.
    http://github.com/Cydrobolt/IRCYoke
    @copyright [c] 2014 Chaoyi Zha
    @license MIT
    @title IRCYoke Client Script
*/
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

    // DEBUG
    var fsidebarContext = {
        networks: [
            {
                name: "IRCYokeTestNET",
                channels: ["#Yoke", "#Yoke-Dev"]
            },
            {
                name: "freenode",
                channels: ["#IRCYoke", "#Yoke-Support"]
            }
        ]

    };
    window.fsidebarHtml = sidebarTemplate(fsidebarContext);

    $("#userlist").html(fsidebarHtml);

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


    sidebar.set({
        networks: [
            {
                name: "IRCYokeTestNET",
                channels: ["#Yoke", "#Yoke-Dev"]
            },
            {
                name: "freenode",
                channels: ["#IRCYoke", "#Yoke-Support-FN"]
            }
        ]
    });


});
