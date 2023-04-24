import { RawWSState, WS } from '../WS'
import { WSTransactor } from '../WSTransaction'
import { genTestWSPair } from './FakeWS'
import { delay } from './timing'

test('handshake works (no network dealy, client early)', async () => {
  const { openConnection, clientWS: a, serverWS: b } = genTestWSPair(0)

  const client = new WSTransactor(new WS(a), []) // client configures before websocket opens

  expect(client.helloReceived).toBe(false)

  openConnection()

  const server = new WSTransactor(new WS(b), []) // server configures after

  // wait one javascript tick to ensure async stuff finishes.
  await delay(0)

  expect(client.helloReceived).toBe(true)
  expect(server.helloReceived).toBe(true)
})

test('handshake works (no network dealy, neither early)', async () => {
  const { openConnection, clientWS: a, serverWS: b } = genTestWSPair(0)

  openConnection()

  const client = new WSTransactor(new WS(a), []) // client configures after websocket opens
  const server = new WSTransactor(new WS(b), []) // server configures after

  // wait one javascript tick to ensure async stuff finishes.
  await delay(0)

  expect(client.helloReceived).toBe(true)
  expect(server.helloReceived).toBe(true)
})

test('handshake works (100ms network dealy, client early)', async () => {
  const { openConnection, clientWS, serverWS } = genTestWSPair(100) // 100 -> 100ms delay for each transmission

  const client = new WSTransactor(new WS(clientWS), []) // client configures before websocket opens

  expect(client.helloReceived).toBe(false)

  openConnection()

  const server = new WSTransactor(new WS(serverWS), []) // server configures after

  // bit of extra delay so we can check state in the middle of each transmission
  await delay(50)
  // SRV > :: OPEN
  // SRV > :: 'HELLO'

  expect(clientWS.state).toBe(RawWSState.CONNECTING)
  expect(client.helloReceived).toBe(false)

  expect(serverWS.state).toBe(RawWSState.OPEN)
  expect(server.helloReceived).toBe(false)

  await delay(100)
  // > CLI :: OPEN
  // > CLI :: 'HELLO'
  // CLI > :: 'HELLO_ACK'

  expect(clientWS.state).toBe(RawWSState.OPEN)
  expect(client.helloReceived).toBe(true)

  expect(serverWS.state).toBe(RawWSState.OPEN)
  expect(server.helloReceived).toBe(false)

  await delay(100)
  // > CLI :: 'HELLO_ACK'

  expect(client.helloReceived).toBe(true)
  expect(server.helloReceived).toBe(true)
})
