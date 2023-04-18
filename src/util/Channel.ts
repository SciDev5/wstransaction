import { Updates } from './Updates'

export class Channel<T> {
  readonly updates = new Updates()
  readonly queue: T[] = []
  private isWatched = false
  private isClosed = false

  send (v: T): void {
    this.queue.push(v)
    this.updates.sendUpdate()
  }

  close (): void {
    this.isClosed = true
    this.updates.sendUpdate()
  }

  async * watch (): AsyncGenerator<T, void, unknown> {
    if (this.isWatched) {
      throw new Error('cannot watch websocket more than once')
    }
    this.isWatched = true

    while (!this.isClosed) {
      await this.updates.update

      const allReceived = this.queue.splice(0, this.queue.length)
      for (const received of allReceived) {
        yield received
      }
    }
  }
}
