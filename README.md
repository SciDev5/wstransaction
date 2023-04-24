# WSTransaction

## Control flow based communication for WebSocket-like connections.

This library does not care whether it's on the client or server side (it's symmetric), the usage procedures are the same on both sides.

> TODO: full documentation

## Runtime guarantees

- No uncaught exeptions will be thrown as a result of `WSTransactor.constructor` or `[object WSTransactor].handle`

- Transactions started before connection will be fufilled on open.

- Invalid received WSTransaction packets will never cause an uncaught error (SeriX serialization has litle checking however and will confuse same-size types; TODO: Debug/Safe Mode).

- Transactions fail if:
  - An error ocurrs in the handler.
  - Messages are sent or received in a mismatched order.

- Failed transactions will:
  - throw from `[object WSTransaction].do`
  - catch in `[object WSTransaction].handle`
  - log a warning message


## General usage

```typescript
const websocket: WebSocket /* browser websocket */ | import('ws').WebSocket

// Create a listener to be loaded directly into the transactor
// No risk of being missed
const listener = new WSTransactionHandle(
  'routeName',
  async io => {
    const dataIn = await io.receive(primitive.number)

    // ... do something ...

    io.send(dataOutA, primitive.string)
  },
)

const transactor = WSTransactor.wrap(websocket, [
  // Each one of these is equivalent to `handle(...)` but
  // it guarantees it is called before the 'HELLO' packet is sent.
  listener,
])
// alternatively, the constructor may be called manually:
// `const transactor = new WSTransactor(new WS(new RawWS(websocket)),[listener]);`
// Though this method is not preferable

// Listen for a transaction.
transactor.listen(
  'routeName',
  async io => {
    const dataIn = await io.receive(primitive.i32)

    // ... do something ...

    io.send(dataOutA, primitive.u8Array)
  },
)

// Request a transaction.
const dataOutA = getSomeDataToSend()
const result = await transactor.do(
  'otherRouteName',
  async io => {
    io.send(dataOutA, primitive.i32)

    // ... do something ...

    const dataIn = await io.receive(primitive.boolean)

    return someReceivedData
  },
)
```

## Sending / Receiving non-primitive data types

```typescript

/** (de)serialization information for your data */
class DataSerializationProfile extends SerializationProfile<Data, [number, number, string, OtherData]> {
  constructor () {
    super([
      primitive.number.action, // `NumberSerializationAction.default` or `new NumberSerializationAction()` also works
      primitive.i32.action,
      primitive.string.action,
      OtherData.serix.action, // `new OtherDataSerializationProfile()` also works
    ])
  }

  destructure ({ someNumber, someText, otherDataToo }: Data): [number, string, OtherData] {
    return [someNumber, someText, otherDataToo]
  }

  restructure (data: [number, string, OtherData]): Data {
    return new Data(...data)
  }
}

/** Your data class */
class Data {
  constructor (
    readonly someNumber: number,
    readonly someText: string,
    readonly otherDataToo: OtherData,
  ) {}

  static readonly serix = new SeriX(new DataSerializationProfile())
}

// Send and receive data containing your object
await transactor.do(
  'doSomethingIdk',
  async io => {
    const dataOut: Data
    io.send(dataOut, Data.serix)

    // ... do something ...

    const dataIn: Data = await io.receive(Data.serix)
  },
)

```