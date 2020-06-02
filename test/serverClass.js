export class ServerClass {

    returnValue(a, b)
    {
        return a + b;
    }

    stdOut(a)
    {
        console.log("StdOutLog", a);
        console.warn("StdOutWarn", a);
        console.error("StdOutErr", a);
    }

    throwErr(errMessage)
    {
        throw new Error(errMessage);
    }
}