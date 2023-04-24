import { CloseInfo } from '../WS'
import { genTestWSPair } from './FakeWS'

test('FakeWS works', () => {
  const { openConnection, clientWS: a, serverWS: b } = genTestWSPair(0)

  let aReceive = 0
  let bReceive = 0

  let aOpen = false
  let bOpen = false

  a.onOpen(() => { aOpen = true })
  b.onOpen(() => { bOpen = true })

  a.onMessage((data) => { aReceive = new Uint8Array(data)[0] })
  b.onMessage((data) => { bReceive = new Uint8Array(data)[0] })

  a.onClose(() => { aOpen = false })
  b.onClose(() => { bOpen = false })

  expect(aOpen).toBe(false)
  expect(bOpen).toBe(false)

  openConnection()

  b.send(new Uint8Array([10]).buffer)
  a.send(new Uint8Array([90]).buffer)

  expect(aReceive).toBe(10)
  expect(bReceive).toBe(90)

  b.send(new Uint8Array([100]).buffer)
  a.send(new Uint8Array([9]).buffer)

  expect(aReceive).toBe(100)
  expect(bReceive).toBe(9)

  expect(aOpen).toBe(true)
  expect(bOpen).toBe(true)

  a.close(new CloseInfo(1000, ''))

  expect(aOpen).toBe(false)
  expect(bOpen).toBe(false)
})
