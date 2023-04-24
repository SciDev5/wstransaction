import { type WebSocket as NodeWebSocket } from 'ws'
import { THROW } from './util/throw'
import { Updates } from './util/Updates'

export enum RawWSState {
  CONNECTING,
  OPEN,
  CLOSING,
  CLOSED,
}

export interface RawWSLike {
  state: RawWSState
  onOpen: (handler: () => void) => void
  onClose: (handler: (why: CloseInfo) => void) => void
  onMessage: (handler: (data: ArrayBuffer) => void) => void
  send: (data: ArrayBuffer) => void
  close: (why: CloseInfo) => void
}

export class RawWS implements RawWSLike {
  constructor (
    private readonly ws: WebSocket | NodeWebSocket,
  ) {
    ws.binaryType = 'arraybuffer'
  }

  get state (): RawWSState {
    return {
      [this.ws.CONNECTING]: RawWSState.CONNECTING,
      [this.ws.OPEN]: RawWSState.OPEN,
      [this.ws.CLOSING]: RawWSState.CLOSING,
      [this.ws.CLOSED]: RawWSState.CLOSED,
    }[this.ws.readyState] ?? THROW(new Error('WebSocket readyState invalid (should not happen)'))
  }

  onOpen (handler: () => void): void {
    this.ws.onopen = () => {
      handler()
    }
  }

  onClose (handler: (info: CloseInfo) => void): void {
    this.ws.onclose = (e: CloseEvent) => {
      handler(new CloseInfo(e.code, e.reason))
    }
  }

  onMessage (handler: (data: ArrayBuffer) => void): void {
    this.ws.onmessage = (e: MessageEvent<unknown>) => {
      if (e.data instanceof ArrayBuffer) {
        handler(e.data)
      } else {
        console.warn(`WebSocket received and ignored data of type [${
            typeof e.data} ${(Object.getPrototypeOf(e.data) as FunctionConstructor).name
        }]`)
      }
    }
  }

  send (data: ArrayBuffer): void {
    this.ws.send(data)
  }

  close (why: CloseInfo): void {
    this.ws.close(why.code, why.reason)
  }
}

export class WS {
  private readonly msgOrClose = new Updates()

  private markOpen: () => void = () => {}
  readonly opened: Promise<void>

  private markClosed: (info: CloseInfo) => void = () => {}
  readonly closed: Promise<CloseInfo>
  private isClosed = false

  private isWatched = false
  private readonly receiveQueue: ArrayBuffer[] = []

  constructor (private readonly ws: RawWSLike) {
    this.opened = new Promise((resolve: (v?: undefined) => void) => { this.markOpen = resolve })
    this.closed = new Promise((resolve: (v: CloseInfo) => void) => { this.markClosed = resolve })
    ws.onMessage(data => {
      this.receiveQueue.push(data)
      this.msgOrClose.sendUpdate()
    })
    if (ws.state === RawWSState.CONNECTING) {
      ws.onOpen(() => {
        this.markOpen()
      })
    } else {
      this.markOpen()
    }
    if (ws.state === RawWSState.CLOSED) {
      this.isClosed = true
      this.msgOrClose.sendUpdate()
      this.markClosed(new CloseInfo(1006, 'already closed'))
    } else {
      ws.onClose(info => {
        this.isClosed = true
        this.msgOrClose.sendUpdate()
        this.markClosed(info)
      })
    }
  }

  async * watch (): AsyncGenerator<ArrayBuffer, void, unknown> {
    if (this.isWatched) {
      throw new Error('cannot watch websocket more than once')
    }
    this.isWatched = true

    let first = true
    while (!this.isClosed) {
      if (first) {
        first = false
      } else {
        await this.msgOrClose.update
      }

      const allReceived = this.receiveQueue.splice(0, this.receiveQueue.length)
      for (const received of allReceived) {
        yield received
      }
    }
  }

  send (data: ArrayBuffer): void {
    this.ws.send(data)
  }

  close (info: CloseInfo = CloseInfo.default): void {
    this.ws.close(info)
  }
}

export class CloseInfo {
  constructor (readonly code: number, readonly reason: string) {}
  static readonly default = new CloseInfo(1000, '')
}
