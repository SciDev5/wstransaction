import { WebSocket as NodeWebsocket } from "ws";
import WSLike, { MessageEventLike } from "./WSLike";

// Using 64 bit prefixes.
// for 32 bit, 50% chance of collision in 77k requests, may collide
// for 64 bit, 50% chance of collision in 5 billion requests, probably never going to collide

export default class WSWrapped {
    private ws:WSLike;
    constructor(
        ws:WSLike|NodeWebsocket,
    ) {
        ws.binaryType = "arraybuffer";
        this.ws = ws as WSLike;
        this.linkEvents();
    }

    reconnect() {
        const ws = this.ws as WebSocket;
        if (!window.WebSocket || !(ws instanceof window.WebSocket))
            throw new Error("may only reconnect from the client side");

        if (!this.closingOrClosed)
            ws.close(1000,"reconnect");

        this.ws = new WebSocket(ws.url,ws.protocol);
        this.linkEvents();
    }
    async autoReconnect(
        condition:{
            looping:boolean,
        },
        backoffConfig:{
            initialCooldown:number,
            factor:number,
            maxCooldown:number,
        }={
            initialCooldown:50,
            factor:2,
            maxCooldown:10000,
        },
    ) {
        let backoffCooldown = backoffConfig.initialCooldown;
        while (condition.looping) {
            this.reconnect();

            await Promise.race([
                this.untilOpen,
                this.untilClose,
            ]);
            if (this.isOpen)
                // success, reset the cooldown
                backoffCooldown = backoffConfig.initialCooldown;
            else
                // failure, increase the cooldown
                backoffCooldown = Math.min(backoffCooldown * backoffConfig.factor, backoffConfig.maxCooldown);

            await this.untilClose;
        }
    }


    get hasOpened() { return this.ws.readyState >= this.ws.OPEN }
    get isOpen() { return this.ws.readyState === this.ws.OPEN }
    get closingOrClosed() { return this.ws.readyState >= this.ws.CLOSING }
    readonly untilOpen = {then:(onOpened:()=>void)=>{
        if (this.hasOpened) onOpened();
        else this.handleOpenOnce.add(onOpened);
    } };
    readonly untilClose = {then:(onClosed:(code?:number)=>void)=>{
        if (this.closingOrClosed) onClosed();
        else this.handleCloseOnce.add(onClosed);
    } };

    linkEvents(callPassedEvents = true) {
        const ws = this.ws;
        ws.addEventListener("message",this.onmessage);

        if (!this.closingOrClosed)
            ws.addEventListener("close",(e)=>{
                if (this.ws === ws) this.onclose(e);
                ws.removeEventListener("message",this.onmessage);
            },{once:true});
        else if (callPassedEvents)
            this.onclose(null);

        if (!this.hasOpened)
            ws.addEventListener("open",(e)=>{
                if (this.ws === ws) this.onopen(e);
                ws.removeEventListener("message",this.onmessage);
            },{once:true});
        else if (callPassedEvents)
            this.onopen(null);
    }
    private readonly onclose = async (e:CloseEvent|null)=>{
        this.handleClose    .forEach(h=>h(e?.code));
        this.handleCloseOnce.forEach(h=>h(e?.code));
        this.handleCloseOnce.clear();
        this.handleOpenOnce.clear();
    };
    private readonly onopen = async (e:Event|null)=>{
        this.handleOpen    .forEach(h=>h());
        this.handleOpenOnce.forEach(h=>h());
        this.handleOpenOnce.clear();
    };
    private readonly onmessage = async ({data:dataBoth}:MessageEventLike)=>{
        if (dataBoth instanceof ArrayBuffer) {
            const {prefix,data} = this.splitReceivedToStr(dataBoth);
            this.handleMessage.forEach(v=>v(prefix,data));
        } else {
            this.fail(WSWrapped.CLOSE_CODE.UNPROCESSABLE_DATA);
        }
    };

    readonly handleClose = new Set<(code?:number)=>void>;
    readonly handleCloseOnce = new Set<(code?:number)=>void>;
    readonly handleOpen = new Set<()=>void>;
    readonly handleOpenOnce = new Set<()=>void>;
    readonly handleMessage = new Set<(prefix:bigint,data:string)=>void>;


    private sendBin(
        prefix:bigint,
        data:ArrayBuffer,
    ) {
        const prefixArray = new Uint8Array(new BigUint64Array([prefix]).buffer);

        const merged = new Blob([prefixArray,data]);
        this.ws.send(merged);
    }
    sendStr(
        prefix:bigint,
        data:string,
    ) {
        this.sendBin(prefix,new TextEncoder().encode(data).buffer);
    }

    private splitReceivedToStr(
        msg:ArrayBuffer,
    ) {
        if (msg.byteLength < 8)
            this.fail(WSWrapped.CLOSE_CODE.UNPROCESSABLE_DATA);

        const prefix = new BigUint64Array(msg.slice(0,8))[0];
        const data = new TextDecoder().decode(new Uint8Array(msg.slice(8)));
        return {
            prefix,
            data,
        };
    }


    private fail(code:CloseCode):never {
        this.ws.close(code,"[WSTransaction]"+WSWrapped.CLOSE_REASON[code]);
        throw new Error("WSTransaction WebSocket connection terminated: "+WSWrapped.CLOSE_REASON[code]);
    }

    static readonly CLOSE_CODE = {
        UNPROCESSABLE_DATA: 4001,
    } as const;
    static readonly CLOSE_REASON = {
        [this.CLOSE_CODE.UNPROCESSABLE_DATA]: "data is unprocessable",
    } as const;
}
type CloseCode = typeof WSWrapped.CLOSE_CODE[keyof typeof WSWrapped.CLOSE_CODE];