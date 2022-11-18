# WSTransaction

## Control flow based communication for WebSocket-like connections.

This library does not care whether it's on the client or server side (it's symmetric), the usage procedures are the same on both sides.

> TODO: full documentation

## General usage

```typescript
const websocket:WebSocket|WSLike;

const transactor = WSTransactor.wrap(websocket);
// alternatively, the constructor may be called manually:
// const transactor = new WSTransactor(new WSWrapped(websocket));

// Listen for a transaction.
transactor.listen(
    "routeName",
    async transaction=>{
        const dataIn = await transaction.next<number>();

        // ... do something ...

        transaction.send<string>(dataOut);
    },
);

// Request a transaction.
const result = await transactor.do(
    "otherRouteName",
    async transaction=>{
        const dataIn = await transaction.next<number>();

        // ... do something ...

        transaction.send<string>(dataOut);

        return someReceivedData;
    },
);
```