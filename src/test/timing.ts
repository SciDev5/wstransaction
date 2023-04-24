export async function delay (ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(() => { resolve() }, ms)
  })
}

export function delayCancellable (ms: number): [() => void, Promise<void>] {
  let cancel = (): void => {}
  const promise = new Promise<void>((resolve) => {
    const cancelId = setTimeout(() => { resolve() }, ms)
    cancel = () => { clearTimeout(cancelId) }
  })
  return [cancel, promise]
}

export async function timeout<T> (promise: Promise<T>, ms: number): Promise<[T] | null> {
  const [cancel, timeout] = delayCancellable(ms)

  return await Promise.race([
    promise.finally(cancel).then(v => [v] as [T]),
    timeout.then(v => null),
  ])
}
