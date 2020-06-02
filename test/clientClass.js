import {SimpleJsRpc, DefaultRemoteCallStrategy, WsRemoteCallStrategy, SocketIoCallStrategy} from "simple-js-rpc/dist/simple-js-rpc.js";
import {ServerClass} from "./serverClass";

export class ClientClass {
    static async testLocal() {

        SimpleJsRpc.setRemoteCallStrategy(DefaultRemoteCallStrategy);

        // this would happen on the server
        SimpleJsRpc.bindClass("ServerClass", ServerClass);

        let instance = SimpleJsRpc.for("ServerClass");

        console.log("Cl", await instance.returnValue(3, 2));
        await instance.stdOut('message');

        try {
            await instance.throwErr(' ERR');
        } catch (e) {
            console.log("worked", e);
        }
    }

    static async testRemoteWs() {

        WsRemoteCallStrategy.setConnection("ws://localhost:8080");

        SimpleJsRpc.setRemoteCallStrategy(WsRemoteCallStrategy);

        // this would happen on the server
        SimpleJsRpc.bindClass("ServerClass", ServerClass);
        SimpleJsRpc.listen();

        let instance = SimpleJsRpc.for("ServerClass");

        console.log("Cl", await instance.returnValue(3, 2));
        await instance.stdOut('message');

        try {
            await instance.throwErr(' ERR');
        } catch (e) {
            console.log("worked", e);
        }
    }

    static async testRemoteSocketIo() {

        SocketIoCallStrategy.setConnection("http://localhost:3000");

        SimpleJsRpc.setRemoteCallStrategy(SocketIoCallStrategy);

        // this would happen on the server
        SimpleJsRpc.bindClass("ServerClass", ServerClass);
        SimpleJsRpc.listen();

        let instance = SimpleJsRpc.for("ServerClass");

        console.log("Cl", await instance.returnValue(3, 2));
        await instance.stdOut('message');

        try {
            await instance.throwErr(' ERR');
        } catch (e) {
            console.log("worked", e);
        }
    }

}