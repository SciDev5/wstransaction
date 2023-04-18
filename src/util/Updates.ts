export class Updates {
  readonly sendUpdate: () => void
  readonly update: { then: (res: () => void) => void }
  constructor () {
    let resFn = (): void => { }
    this.update = { then (res: () => void) { resFn = res } }
    this.sendUpdate = resFn
  }
}
