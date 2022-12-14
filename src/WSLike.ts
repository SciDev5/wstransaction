export interface MessageEventLike {
    data: string | Buffer | ArrayBuffer | Buffer[] | Blob;
}

export default interface WSLike {
    addEventListener(
        type:"message",
        listener:(e:MessageEventLike)=>void,
        options?:{once?:boolean},
    ):void;
    addEventListener(
        type:"close",
        listener:(e:CloseEvent)=>void,
        options?:{once?:boolean},
    ):void;
    addEventListener(
        type:"open",
        listener:(e:Event)=>void,
        options?:{once?:boolean},
    ):void;
    addEventListener(
        type:"error",
        listener:(e:Event)=>void,
        options?:{once?:boolean},
    ):void;

    removeEventListener(
        type:"message",
        listener:(e:MessageEvent<string|Blob|ArrayBuffer>)=>void,
    ):void;
    removeEventListener(
        type:"close",
        listener:(e:CloseEvent)=>void,
    ):void;
    removeEventListener(
        type:"open",
        listener:(e:Event)=>void,
    ):void;
    removeEventListener(
        type:"error",
        listener:(e:Event)=>void,
    ):void;

    send(data:string|Blob|ArrayBuffer):void;

    close(code?:number,reason?:string):void;

    readonly protocol:string;

    readyState:number;
    readonly CONNECTING:number;
    readonly OPEN:number;
    readonly CLOSING:number;
    readonly CLOSED:number;

    binaryType: BinaryType;
}
