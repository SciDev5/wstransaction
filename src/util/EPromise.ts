type ResFn<T> = (v: T | PromiseLike<T>) => void
export class EPromise<T> {
  private readonly res_: ResFn<T>
  private readonly rej_: ResFn<unknown>
  private readonly wrappedPromise: Promise<T>
  constructor () {
    let res_: ResFn<T> = () => {}
    let rej_: ResFn<unknown> = () => {}
    this.wrappedPromise = new Promise((resolve, reject) => {
      res_ = resolve
      rej_ = reject
    })
    this.res_ = res_
    this.rej_ = rej_
  }

  public res (v: T | PromiseLike<T>): void {
    this.res_(v)
  }

  public rej (e?: unknown): void {
    this.rej_(e)
  }

  async then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): Promise<TResult1 | TResult2> {
    return await this.wrappedPromise.then(...[onfulfilled, onrejected].slice(0, arguments.length) as [])
  }

  async catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined,
  ): Promise<T | TResult> {
    return await this.wrappedPromise.catch(...[onrejected].slice(0, arguments.length) as [] | [typeof onrejected])
  }
}
