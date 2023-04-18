import { type WebSocket as NodeWebSocket } from 'ws'
import { RawWS, WS } from './WS'
import { ByteArraySlice } from './util/ByteArraySlice'
import { Channel } from './util/Channel'
import { EPromise } from './util/EPromise'
import { U32SerializationAction, U8SerializationAction } from './util/serialization/actions/number'
import { StringSerializationAction } from './util/serialization/actions/string'
import { type SeriX, SerializationProfile } from './util/serialization/serialization'
import { THROW } from './util/throw'

enum TxrMessageWhich {
  HELLO = 0,
  HELLO_ACK = 1,
  BEGIN = 2,
  BEGIN_ACK = 3,
  BEGIN_REJ = 4,
  DATA = 5,
}
class TxrMessageHeader {
  constructor (
    readonly which: TxrMessageWhich,
    readonly txId: number,
  ) {}
}
class TxrMessageHeaderSerializationProfile extends SerializationProfile<TxrMessageHeader, [number, number]> {
  private constructor () {
    super([
      U8SerializationAction.default,
      U32SerializationAction.default,
    ])
  }

  destructure (data: TxrMessageHeader): [number, number] {
    return [data.which, data.txId]
  }

  restructure ([which, txId]: [number, number]): TxrMessageHeader {
    return new TxrMessageHeader(
      which in TxrMessageWhich ? which : THROW(new Error('invalid message kind')),
      txId,
    )
  }

  static readonly default = new this()
}

export class WSTransactor {
  static wrap (
    ws: WebSocket | NodeWebSocket,
    initialHandles: Array<WSTransactionHandle<void>>,
  ): WSTransactor {
    return new WSTransactor(new WS(new RawWS(ws)), initialHandles)
  }

  private readonly unacknowlegedTransactions = new Map<number, Transaction<any>>()
  private readonly transactions = new Map<number, Transaction<any>>()

  private readonly untilReceivedHello = new EPromise<void>()

  constructor (
    private readonly ws: WS,
    initialHandles: Array<WSTransactionHandle<void>>,
  ) {
    for (const { name, handle } of initialHandles) {
      this.listen(name, handle)
    }
    this.exec().catch(e => {
      console.error('WSTransaction crashed! (see below error for details)')
      throw e
    })
  }

  async do<T> (name: string, handle: WSTransactionFunction<T>): Promise<T> {
    await this.untilReceivedHello

    const txId = Math.floor(Math.random() * 0x1_0000_0000)

    const tx = this.genTransaction(handle, txId)
    this.unacknowlegedTransactions.set(txId, tx)

    this.sendMessage(
      TxrMessageWhich.BEGIN,
      txId,
      StringSerializationAction.default.serialize(name),
    )

    return await tx.value
  }

  private readonly handles = new Map<string, WSTransactionFunction<void>>()
  listen (name: string, handle: WSTransactionFunction<void>): void {
    this.handles.set(name, handle)
  }

  private async exec (): Promise<void> {
    await this.ws.opened
    for await (const message of this.ws.watch()) {
      this.handleMessage(message)
    }
    await this.ws.closed
  }

  private genTransaction<T>(handle: WSTransactionFunction<T>, txId: number): Transaction<T> {
    const tx = new Transaction<T>(
      handle,
      data => { this.sendMessage(TxrMessageWhich.DATA, txId, data) },
      e => { this.handleTransactionError(e) },
    )

    tx.value.finally(() => { // When done, remove transaction
      this.transactions.delete(txId)
    })
    return tx
  }

  private handleMessage (dataBuf: ArrayBuffer): void {
    let data = new ByteArraySlice(new Uint8Array(dataBuf))
    let which: TxrMessageWhich
    let txId: number
    try {
      const deserialized = TxrMessageHeaderSerializationProfile.default.deserialize(data)
      which = deserialized.data.which
      txId = deserialized.data.txId
      data = data.slice(deserialized.bytesRead)
    } catch (e: any) {
      console.warn('received improperly formatted packet')
      return
    }

    if (this.closing) {
      // ignore all messages sent after close
      return
    }

    switch (which) {
      case TxrMessageWhich.HELLO: {
        this.sendMessage(TxrMessageWhich.HELLO_ACK, 0, [])
        this.untilReceivedHello.res()
        break
      }
      case TxrMessageWhich.HELLO_ACK: {
        this.untilReceivedHello.res()
        break
      }
      case TxrMessageWhich.BEGIN: {
        let handleId: string
        try {
          handleId = StringSerializationAction.default.deserialize(data).data
        } catch (e: any) {
          console.warn('handle string invalid')
          this.sendMessage(TxrMessageWhich.BEGIN_REJ, txId, [])
          break
        }
        const handle = this.handles.get(handleId)
        if (handle == null) {
          console.warn(`handle ${handleId} not found`)
          this.sendMessage(TxrMessageWhich.BEGIN_REJ, txId, [])
          break
        }
        const tx = this.genTransaction(handle, txId)
        this.transactions.set(txId, tx)
        tx.value.catch(() => {}) // void errors, handled at `this.handleTransactionError`
        tx.run()
        this.sendMessage(TxrMessageWhich.BEGIN_ACK, txId, [])
        break
      }
      case TxrMessageWhich.BEGIN_ACK: {
        // handle our transaction requests being accepted.
        const tx = this.unacknowlegedTransactions.get(txId)
        this.unacknowlegedTransactions.delete(txId)
        if (tx == null) {
          console.warn(`transaction '${txId.toString(16)}' not found`)
          break
        }
        this.transactions.set(txId, tx)
        // (no need to void errors, handled at caller of `this.run`)
        tx.run()
        break
      }
      case TxrMessageWhich.BEGIN_REJ: {
        // handle our transaction requests being accepted.
        const tx = this.unacknowlegedTransactions.get(txId)
        this.unacknowlegedTransactions.delete(txId)
        if (tx == null) {
          console.warn(`transaction '${txId.toString(16)}' not found`)
          break
        }
        // (no need to void errors, handled at caller of `this.run`)
        tx.failRejected()
        break
      }
      case TxrMessageWhich.DATA: {
        const tx = this.transactions.get(txId)
        if (tx == null) {
          console.warn(`transaction '${txId.toString(16)}' not found`)
          break
        }
        tx.dataReceive.send(data)
        break
      }
    }
  }

  private sendMessage (which: TxrMessageWhich, txId: number, data: number[]): void {
    this.ws.send(new Uint8Array([
      ...TxrMessageHeaderSerializationProfile.default.serialize(
        new TxrMessageHeader(
          which, txId,
        ),
      ),
      ...data,
    ]).buffer)
  }

  private closing = false
  close (): void {
    this.closing = true
  }

  private handleTransactionError (e: any): void {
    console.warn('transaction error!', e)
  }
}

export type WSTransactionFunction<T> = (s: WSTransactionIO) => Promise<T>

class Transaction<T> {
  private readonly scope = new WSTransactionIO(this as Transaction<any>)

  readonly dataReceive = new Channel<ByteArraySlice>()

  private resR = (v: T): void => {}
  private rejR = (e: any): void => {}
  readonly value = new Promise<T>((resolve, reject) => {
    this.resR = resolve
    this.rejR = reject
  })

  constructor (
    readonly handle: WSTransactionFunction<T>,
    readonly sendMessage: (data: number[]) => void,
    readonly handleError: (error: any) => void,
  ) {}

  run (): void {
    this.handle(this.scope)
      .then(this.resR)
      .catch(e => {
        this.handleError(e)
        this.rejR(e)
      })
  }

  failRejected (): void {
    this.rejR(new Error('rejected by remote end'))
  }
}

export class WSTransactionIO {
  private readonly receivingData = this.transaction.dataReceive.watch()
  constructor (private readonly transaction: Transaction<any>) {}

  send<T>(v: T, serix: SeriX<T>): void {
    this.transaction.sendMessage(serix.toBinJsArr(v))
  }

  async receive<T>(serix: SeriX<T>): Promise<T> {
    const received = await this.receivingData.next()
    if (received.done ?? false) {
      throw new Error('transaction ended')
    } else {
      return serix.fromBin(received.value.copySlice(0).buffer) // TODO make more efficient
    }
  }
}

export class WSTransactionHandle<T> {
  constructor (
    readonly name: string,
    readonly handle: WSTransactionFunction<T>,
  ) {}
}
