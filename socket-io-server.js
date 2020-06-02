var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    socket.on('call fn', function (msg) {
        console.log('call fn', msg);
        socket.broadcast.emit('call fn', msg);
    });

    socket.on('fn resp', function (msg) {
        console.log('fn resp', msg);
        io.emit('fn resp', msg);
    });
});

http.listen(port, function () {
    console.log('listening on *:' + port);
});
