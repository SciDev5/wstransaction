export class Updates {
  private readonly resolvers = new Set<() => void>()
  readonly update: { then: (res: () => void) => void }

  sendUpdate (): void {
    const resolvers = [...this.resolvers]
    this.resolvers.clear()
    for (const fn of resolvers) {
      fn()
    }
  }

  constructor () {
    this.update = { then: (res: () => void) => { this.resolvers.add(res) } }
  }
}
