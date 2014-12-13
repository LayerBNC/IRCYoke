var factory = require('irc-factory'),
    api = new factory.Api();
var uuid = require('node-uuid');

function createClient(username, password, port, server) {
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

    var client = api.createClient(clientKey, {
        nick : username,
        user : username,
        server : server,
        realname: 'IRCYoke User',
        port: port,
        password: serverPassword,
        secure: useSSL
    });
    debugHook(clientKey);
    return [client, clientkey];

}
function destroyClient (clientKey) {
    try {
        var destroyed = api.destroyClient(clientKey);
        return true;
    }
    catch (err) {
        return false;
    }

}
function debugHook (clientKey) {
    api.hookEvent(clientKey, '*', function(message) {
        console.log(message);
    });
}
