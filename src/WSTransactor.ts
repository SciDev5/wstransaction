import WSWrapped from "./WSWrapped";
import WSLike from "./WSLike";
import { WebSocket as NodeWebsocket } from "ws";
import { EPromise } from "./util/EPromise";

type WSTransactionHandler<T> = (transaction:WSTransaction)=>Promise<T>;

export default class WSTransactor {
    constructor(readonly ws:WSWrapped) {
        ws.handleMessage.add(this.onMessage);
        ws.handleClose.add(this.onClose);

        this.sendQueryHello(); // In case the remote end is already ready and we missed it's `hello`
    }
    /** Wrap the websocket and return a transactor for it. */
    static wrap(wsLike:WSLike|NodeWebsocket,subProtocols?:string[]) {
        return new WSTransactor(new WSWrapped(wsLike,subProtocols));
    }

    private readonly onClose = (code?:number)=>{
        for (const transaction of this.activeTransactions.values())
            transaction.cancel();
    };
    private readonly onMessage = (prefix:bigint,data:string)=>{
        if (prefix === BigInt(0)) {
            // Control command
            const which = data[0], args = data.substring(1).split("\n");
            switch(which) {
            case "h":{ // Hello command
                if (!this.alreadyReceivedHello)
                    this._receivedHello.res();
                this.alreadyReceivedHello = true;
                break;
            }
            case "q":{ // QueryHello command, replies with hello if ready (in case missed during boot)
                if (this.alreadySentHello)
                    this.sendHello();
                break;
            }
            case "+":{ // Requesting new transaction
                const [transactionIdStr,routeName] = args, transactionId = BigInt("0x"+transactionIdStr);

                if (routeName in this.routes) {
                    this.sendControlCommand("*",transactionIdStr);
                    this.createAndAddTransaction(
                        transactionId,
                        this.routes[routeName],
                    );
                } else {
                    this.sendControlCommand("x",transactionIdStr);
                }
                break;
            }
            case "-": { // terminate transaction
                const [transactionIdStr] = args, transactionId = BigInt("0x"+transactionIdStr);

                const transaction = this.activeTransactions.get(transactionId);
                if (transaction)
                    transaction.cancel();

                break;
            }
            case "*":  // new transaction request successful, begin
            case "x": { // new transaction request failed
                const [transactionIdStr] = args, transactionId = BigInt("0x"+transactionIdStr);
                if (this.requestedTransactions.has(transactionId)) {
                    const [handler,resolution] = this.requestedTransactions.get(transactionId)!;
                    this.requestedTransactions.delete(transactionId);

                    if (which === "x")
                        resolution.rej();
                    else
                        resolution.res(
                            this.createAndAddTransaction(
                                transactionId,
                                handler,
                            ).handlePromise,
                        );
                }
                break;
            }
            }
        } else if (this.activeTransactions.has(prefix)) {
            // This is an active transaction
            this.activeTransactions.get(prefix)!.handleData(data);
        } else {
            // Not found.
        }
    };
    private sendControlCommand(which:"h"|"q"|"+"|"*"|"x"|"-",...args:string[]) {
        this.ws.sendStr(
            BigInt(0),
            which + args.join("\n"),
        );
    }

    private checkRouteName(name:string) {
        if (/[^a-z0-9.:-_]/i.test(name))
            throw new Error("Route name invalid");
    }
    private genTransactionId() {
        return new BigUint64Array(new Uint8Array(new Array(8).fill(0).map(v=>Math.floor(Math.random()*256))).buffer)[0];
    }
    private createAndAddTransaction(
        id:bigint,
        handler:WSTransactionHandler<unknown>,
    ) {
        const transaction = new WSTransaction(
            id,
            handler,
            ()=>{
                this.activeTransactions.delete(id);
                this.sendControlCommand("-",id.toString(16));
            },
            data => this.ws.sendStr(id,data),
        );
        this.activeTransactions.set(id,transaction);
        return transaction;
    }

    private readonly routes:{[routeName:string]:WSTransactionHandler<void>} = {};
    listen(name:string,handler:WSTransactionHandler<void>) {
        this.checkRouteName(name);
        this.routes[name] = handler;
    }


    private readonly requestedTransactions = new Map<bigint, [WSTransactionHandler<unknown>,EPromise<Promise<unknown>>]>;
    private readonly activeTransactions = new Map<bigint, WSTransaction>;
    async do<T>(name:string,handler:WSTransactionHandler<T>) {
        this.throwIfNoHello();

        this.checkRouteName(name);

        const id = this.genTransactionId(), handled = new EPromise<Promise<T>>();

        this.requestedTransactions.set(id,[handler,handled as never]);
        this.sendControlCommand("+",id.toString(16),name);

        return await handled;
    }

    private readonly _receivedHello = new EPromise<void>();
    private alreadyReceivedHello = false;
    private alreadySentHello = false;
    readonly receivedHello = this._receivedHello.then();
    sendHello() {
        this.sendControlCommand("h"); // allow double send to get around race condition at startup
        this.alreadySentHello = true;
    }
    private throwIfNoHello() {
        if (!this.alreadyReceivedHello || !this.alreadySentHello)
            throw new Error("Cannot start transaction before `hello` command both sent to and received from remote");
    }
    private sendQueryHello() {
        this.sendControlCommand("q");
    }

}

export class WSTransaction {
    readonly handlePromise:Promise<unknown>;
    constructor(
        readonly id:bigint,
        handler:WSTransactionHandler<unknown>,
        private readonly removeFromActive:()=>void,
        private readonly sendRaw:(data:string)=>void,
    ) {
        this.handlePromise = handler(this);
        this.handlePromise
            .then(()=>this.ended())
            .catch(e=>this.ended(e));
    }

    private ended(error?:[unknown]) {
        if (error && error[0] !== null)
            console.warn("ERROR IN TRANSACTION",error[0]);
        this.removeFromActive();
    }

    private cancelled = false;
    cancel() {
        this.nextRequest?.rej(null);
        this.cancelled = true;
    }
    handleData(data:string) {
        const next = this.nextRequest;
        delete this.nextRequest;
        if (!next)
            // ERROR HERE
            throw new Error("TODO error no handle next");

        next.res(data);
    }
    private nextRequest?:EPromise<string>;
    async next<T>(
        parse:(v:string)=>T = JSON.parse,
    ) {
        if (this.cancelled)
            throw new Error("WSTransaction called next after being cancelled!");
        if (this.nextRequest)
            throw new Error("WSTransaction.next was called twice before receiving data. Wait for the first next to resolve!");

        this.nextRequest = new EPromise<string>();
        return parse(await this.nextRequest);
    }
    send<T>(
        data:T,
        serialize:(v:T)=>string = JSON.stringify,
    ) {
        this.sendRaw(serialize(data));
    }

}