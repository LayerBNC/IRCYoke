/*
    IRCYoke
    Multi-network web interface for ZNC.
    http://github.com/Cydrobolt/IRCYoke
    @copyright [c] 2014 Chaoyi Zha
    @license MIT
    @title IRCYoke Main Script
*/
$('#nonUI').remove();
$('#fill_username').text(username);


// Dynamically load handlebar templates
loadHbt('#sidebar-template');
var source   = $("#sidebar-template").html();
var sidebarTemplate = Handlebars.compile(source);

var SidebarModel = Backbone.Model.extend({
    promptColor: function() {
        var cssColor = prompt("Please enter a CSS color:");
        this.set({color: cssColor});
    },
    channels: [],
    networks: []
});


window.sidebar = new SidebarModel;

sidebar.on('change:channels', function(model, chanList) {
    var fsidebarContext = {
        networks: ["info"],
        channels: []
    };
    var fsidebarHtml = template(fsidebarContext);
});
