import WSCommon from "../WSCommon";

export default class LoopbackWebSocket implements WSCommon {
    constructor(readonly protocol:string) {
        setImmediate(()=>{
            this.open();
        });
    }

    private open() {
        this.readyState = this.OPEN;
        // SEND EVENT
    }


    addEventListener(type: "message", listener: (e: MessageEvent<string | Blob | ArrayBuffer>) => void, options?: { once?: boolean | undefined; } | undefined): void;
    addEventListener(type: "close", listener: (e: CloseEvent) => void, options?: { once?: boolean | undefined; } | undefined): void;
    addEventListener(type: "open", listener: (e: Event) => void, options?: { once?: boolean | undefined; } | undefined): void;
    addEventListener(type: "error", listener: (e: Event) => void, options?: { once?: boolean | undefined; } | undefined): void;
    addEventListener(type: string, listener: unknown, options?: { once?: boolean | undefined; }): void {
        throw new Error("Method not implemented.");
    }
    removeEventListener(type: "message", listener: (e: MessageEvent<string | Blob | ArrayBuffer>) => void): void;
    removeEventListener(type: "close", listener: (e: CloseEvent) => void): void;
    removeEventListener(type: "open", listener: (e: Event) => void): void;
    removeEventListener(type: "error", listener: (e: Event) => void): void;
    removeEventListener(type: string, listener: unknown): void {
        throw new Error("Method not implemented.");
    }
    send(data: string | Blob): void {
        setImmediate(()=>{

            // SEND EVENT
        });
    }
    close(code?: number | undefined, reason?: string | undefined): void {
        this.readyState = this.CLOSING;
        setImmediate(()=>{
            this.readyState = this.CLOSED;
        });
        // SEND EVENT
    }
    readyState = 0;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    binaryType: BinaryType = "blob";

}