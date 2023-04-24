import { RawWSState, type RawWSLike, type CloseInfo } from '../WS'

// https://websockets.spec.whatwg.org/

class FakeWS implements RawWSLike {
  constructor (
    // @ts-expect-error It is worried about usage of `this` in constructor, but it's safe here because it's not used until after constructor
    readonly remote: FakeWS = new FakeWS(this),
  ) {}

  state = RawWSState.CONNECTING

  private readonly openHandlers = new Set<() => void>()
  onOpen (handler: () => void): void {
    this.openHandlers.add(handler)
  }

  private readonly closeHandlers = new Set<(why: CloseInfo) => void>()
  onClose (handler: (why: CloseInfo) => void): void {
    this.closeHandlers.add(handler)
  }

  private readonly messageHandlers = new Set<(data: ArrayBuffer) => void>()
  onMessage (handler: (data: ArrayBuffer) => void): void {
    this.messageHandlers.add(handler)
  }

  send (data: ArrayBuffer): void {
    if (this.state !== RawWSState.OPEN) {
      throw new DOMException("WebSocket.send when not 'OPEN'")
    }
    this.emulateNetworkDelay(() => {
      this.remote.receiveMessage(
        // copy to prevent accidental unrealistic data backflow
        data.slice(0, data.byteLength),
      )
    })
  }

  close (why: CloseInfo): void {
    if (
      this.state === RawWSState.CLOSING ||
        this.state === RawWSState.CLOSED
    ) {
      return
    }
    this.state = RawWSState.CLOSING

    this.emulateNetworkDelay(() => {
      this.remote.receiveClose(why)
    })
  }

  private networkDelay: number = 0
  private emulateNetworkDelay (then: () => void): void {
    if (this.networkDelay <= 0) {
      then()
    } else {
      setTimeout(() => {
        then()
      }, this.networkDelay)
    }
  }

  open (networkDelay: number): void {
    if (this.state === RawWSState.CONNECTING) {
      this.receiveOpen(networkDelay)
      this.emulateNetworkDelay(() => {
        this.remote.receiveOpen(networkDelay)
      })
    } else {
      throw new Error(`FakeWS.open called when '${RawWSState[this.state]}'`)
    }
  }

  private receiveOpen (networkDelay: number): void {
    this.networkDelay = networkDelay
    this.state = RawWSState.OPEN
    this.openHandlers.forEach((handle) => { handle() })
  }

  private receiveClose (why: CloseInfo): void {
    if (this.state === RawWSState.CLOSED) {
      return // prevent infinite looping
    }
    this.state = RawWSState.CLOSED
    this.closeHandlers.forEach((handle) => { handle(why) })
    this.emulateNetworkDelay(() => {
      this.remote.receiveClose(why)
    })
  }

  private receiveMessage (data: ArrayBuffer): void {
    this.messageHandlers.forEach((handle) => { handle(data) })
  }
}

export function genTestWSPair (networkDelay: number): { openConnection: () => void, clientWS: RawWSLike, serverWS: RawWSLike } {
  const clientWS = new FakeWS()
  const serverWS = clientWS.remote
  return {
    openConnection () {
      serverWS.open(networkDelay)
    },
    clientWS,
    serverWS,
  }
}
