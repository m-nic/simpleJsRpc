const http = require('http');
const url = require('url');
const WebSocket = require('ws');

const server = http.createServer();

const clientWss = new WebSocket.Server({noServer: true});
const serverWss = new WebSocket.Server({noServer: true});

let clientSocket = null;
let serverSocket = null;

clientWss.on('connection', function connection(ws) {
    clientSocket = ws;
    ws.on('message', function incoming(message) {
        if (serverSocket)  {
            console.log("Sending server", message);
            serverSocket.send(message);
        }
    });
});

serverWss.on('connection', function connection(ws) {
    serverSocket = ws;
    ws.on('message', function incoming(message) {
        if (clientSocket) {
            console.log("Sending client", message);
            clientSocket.send(message);
        }
    });
});

server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/client') {
        clientWss.handleUpgrade(request, socket, head, function done(ws) {
            console.log('connected client');
            clientWss.emit('connection', ws, request);
        });
    } else if (pathname === '/server') {
        serverWss.handleUpgrade(request, socket, head, function done(ws) {
            console.log('connected server');
            serverWss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

server.listen(8080);