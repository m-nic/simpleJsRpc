export class SimpleJsRpc {
    static classContainer = {};
    static remoteCallStrategy = DefaultRemoteCallStrategy;

    static setRemoteCallStrategy(remoteCallStrategy = DefaultRemoteCallStrategy) {
        this.remoteCallStrategy = remoteCallStrategy;
        this.remoteCallStrategy.init(this);
    }

    static for(className) {
        let self = new _BrowserJsRpc(className, this.remoteCallStrategy);

        return new Proxy(self, {
            get(target, fnName) {

                let value = target[fnName];

                if (fnName in target) {
                    return (typeof value === 'function') ? value.bind(target) : value;
                } else {
                    return function () {
                        let args = Array.prototype.slice.call(arguments);
                        return target.callFn(fnName, args);
                    }
                }
            }
        });
    }

    static bindClass(className, classFn) {
        this.classContainer[className] = classFn;
    }

    static listen() {
        this.remoteCallStrategy.listen();
    }
}

class _BrowserJsRpc {
    static remoteCallStrategy = DefaultRemoteCallStrategy;

    constructor(className, remoteCallStrategy = DefaultRemoteCallStrategy) {
        this.className = className;
        this.remoteCallStrategy = remoteCallStrategy;
    }

    async callFn(name, args) {
        let [data, status] = await this._callRemote(name, args);
        this._handleIfFailed(name, status, data);
        this._handleStdOut(data);
        this._handleRemoteExceptions(data);
        return data['return'];
    }

    async _callRemote(name, args) {

        let response = await this.remoteCallStrategy.callFn(
            this._makeSerializedFnCall(name, args)
        );

        let data = response['data'];
        let status = response['status'];

        return [data, status];
    }

    _makeSerializedFnCall(name, args) {
        return {
            'c': this.className,
            'f': name,
            'a': args,
        };
    }

    async _handleIfFailed(name, status, data) {
        if (status !== 200) {
            console.log(`Return Value: '${data['return']}'`);
            throw new Error(`Call ${name} failed`);
        }
    }

    _handleStdOut(data) {
        if (data.stdOut && Object.keys(data.stdOut).length > 0) {
            Object.entries(data.stdOut)
                .forEach(([method, argsStack]) => {
                    argsStack.forEach((args) => {
                        console[method](...args);
                    });
                });
        }
    }

    _handleRemoteExceptions(data) {
        if (data['error']) {
            let error = new Error(data['error']['message']);
            error.stack = data['error']['stack'];
            throw error;
        }
    }
}

export class DefaultRemoteCallStrategy {
    static connection = null;

    static init(browserJsRpc) {
        this.container = browserJsRpc.classContainer;
    }

    static setConnection(connection) {
        this.connection = connection;
    }

    static callFn(serializedFnCall) {
        return remoteFnCall(serializedFnCall, this.container);
    }
    static listen() {

    }
}

function handleClientCall(serializedFnCall, classContainer) {
    return new Promise((resolve, reject) => {
        let response = {'data': {}, 'status': 200};

        OutputControl.recordConsole(true);

        try {
            let {c, f, a} = serializedFnCall;

            let instance;
            try {
                instance = new (classContainer[c])();
            } catch (e) {
                instance = classContainer[c];
            }

            response['data']['return'] = instance[f](...a);

        } catch (e) {
            response['data']['error'] = {message: e.message, stack: e.stack};
        }
        response['data']['stdOut'] = OutputControl.flushConsole();

        resolve(response);
    })
}

// const WebSocket = require('isomorphic-ws');

// export class WsRemoteCallStrategy {
//     static connection = null;
//
//     static init(browserJsRpc) {
//         this.container = browserJsRpc.classContainer;
//         WsRemoteCallStrategy.ws = new WebSocket(WsRemoteCallStrategy.connection + '/client');
//     }
//
//     static setConnection(connection) {
//         this.connection = connection;
//     }
//
//     static callFn(serializedFnCall) {
//         let resolveFn = null;
//         let promise = new Promise((resolve, reject) => {
//             resolveFn = resolve;
//         });
//
//         if (!WsRemoteCallStrategy.isOpen) {
//             WsRemoteCallStrategy.ws.on('open', function open(ws) {
//                 WsRemoteCallStrategy.isOpen = true;
//                 WsRemoteCallStrategy.ws.send(JSON.stringify(serializedFnCall));
//             });
//         } else {
//             WsRemoteCallStrategy.ws.send(JSON.stringify(serializedFnCall));
//         }
//
//         WsRemoteCallStrategy.ws.on('message', function incoming(data) {
//             resolveFn(JSON.parse(data));
//         });
//
//         return promise;
//     }
//
//     static listen() {
//         let serverWss = new WebSocket(WsRemoteCallStrategy.connection + '/server');
//
//         serverWss.on('message', function incoming(serializedFnCall) {
//             handleClientCall(JSON.parse(serializedFnCall), WsRemoteCallStrategy.container)
//                 .then((data) => {
//                     serverWss.send(JSON.stringify(data));
//                 });
//         });
//     }
// }


import io from 'socket.io-client';

export class SocketIoCallStrategy {
    static connection = null;

    static init(browserJsRpc) {
        this.container = browserJsRpc.classContainer;
        SocketIoCallStrategy.socket = io(SocketIoCallStrategy.connection);
    }

    static setConnection(connection) {
        this.connection = connection;
    }

    static callFn(serializedFnCall) {
        let resolveFn = null;

        let promise = new Promise((resolve, reject) => {
            resolveFn = resolve;
        });

        SocketIoCallStrategy.socket.emit('call fn', JSON.stringify(serializedFnCall));

        SocketIoCallStrategy.socket.on('fn resp', function incoming(data) {
            resolveFn(JSON.parse(data));
        });

        return promise;
    }

    static listen() {
        SocketIoCallStrategy.socket.on('call fn', function incoming(serializedFnCall) {
            handleClientCall(JSON.parse(serializedFnCall), SocketIoCallStrategy.container)
                .then((data) => {
                    SocketIoCallStrategy.socket.emit('fn resp', JSON.stringify(data));
                });
        });
    }
}

class OutputControl {
    static consoleMethods = ["log", "debug", "warn", "info"];
    static consoleFns = {};
    static consoleArgsStack = {};

    static recordConsole(suppress = false) {
        for (let method of OutputControl.consoleMethods) {
            OutputControl.consoleFns[method] = console[method];

            console[method] = (...args) => {
                if (!OutputControl.consoleArgsStack[method]) {
                    OutputControl.consoleArgsStack[method] = [];
                }

                OutputControl.consoleArgsStack[method].push(args);

                if (!suppress) {
                    return OutputControl.consoleFns[method](...args);
                }
            };
        }
    }

    static flushConsole() {
        for (let method of OutputControl.consoleMethods) {
            console[method] = OutputControl.consoleFns[method];
        }

        let out = {};
        for (let method of OutputControl.consoleMethods) {
            if (OutputControl.consoleArgsStack[method]) {
                out[method] = OutputControl.consoleArgsStack[method].slice();
            }
        }

        OutputControl.consoleArgsStack = {};
        return out;
    }
}


