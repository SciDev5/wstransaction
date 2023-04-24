import { WS } from '../WS'
import { WSTransactionHandle, type WSTransactionIO, WSTransactor } from '../WSTransaction'
import { primitive } from '../util/serialization/actions/primitive'
import { genTestWSPair } from './FakeWS'
import { timeout } from './timing'

const OK = 'ok'

test('transaction works without skipping after going reeeaaly fast', async () => {
  const PING_TRANSACTION_NAME = 'ping'
  const DATA_TO_SEND = 'it works'
  const simplePingHandle = new WSTransactionHandle(PING_TRANSACTION_NAME, async io => {
    io.send(await io.receive(primitive.string), primitive.string)
  })

  const { openConnection, clientWS, serverWS } = genTestWSPair(100) // -> 100ms delay for each transmission

  const client = new WSTransactor(new WS(clientWS), [simplePingHandle]) // client configures before websocket opens
  const clientPingResult = client.do(PING_TRANSACTION_NAME, async io => {
    io.send(DATA_TO_SEND, primitive.string)
    return await io.receive(primitive.string)
  })

  openConnection()

  const server = new WSTransactor(new WS(serverWS), [simplePingHandle]) // server configures after
  const serverPingResult = server.do(PING_TRANSACTION_NAME, async io => {
    io.send(DATA_TO_SEND, primitive.string)
    return await io.receive(primitive.string)
  })

  expect(await timeout(clientPingResult, 1000)).toEqual([DATA_TO_SEND])
  expect(await timeout(serverPingResult, 1000)).toEqual([DATA_TO_SEND])
})

test('data in different patterns going back and fourth works', async () => {
  const COMPLEX_BRANCHING_TRANSACTION_NAME = 'complex branching'
  const complexBranchingHandle = new WSTransactionHandle(COMPLEX_BRANCHING_TRANSACTION_NAME, async io => {
    io.send(1, primitive.u8)
    io.send(2, primitive.u8)
    io.send(3, primitive.u8)

    expect(await io.receive(primitive.string)).toBe('a')
    expect(await io.receive(primitive.string)).toBe('b')
    expect(await io.receive(primitive.string)).toBe('c')

    for (let i = 0; i < 5; i++) {
      io.send(i, primitive.u8)
      expect(await io.receive(primitive.u8)).toBe(i)
    }

    for (let i = 0; i < 5; i++) {
      if (i % 3 === 0) {
        io.send(i * 12345, primitive.i32)
      } else {
        io.send(i.toString(), primitive.string)
      }
    }
  })

  const complexBranchingDoCallback = async (io: WSTransactionIO): Promise<string> => {
    expect(await io.receive(primitive.u8)).toBe(1)
    expect(await io.receive(primitive.u8)).toBe(2)
    expect(await io.receive(primitive.u8)).toBe(3)

    io.send('a', primitive.string)
    io.send('b', primitive.string)
    io.send('c', primitive.string)

    for (let i = 0; i < 5; i++) {
      expect(await io.receive(primitive.u8)).toBe(i)
      io.send(i, primitive.u8)
    }

    for (let i = 0; i < 5; i++) {
      if (i % 3 === 0) {
        expect(await io.receive(primitive.i32)).toBe(i * 12345)
      } else {
        expect(await io.receive(primitive.string)).toBe(i.toString())
      }
    }

    return OK
  }

  const { openConnection, clientWS, serverWS } = genTestWSPair(10) // -> 10ms delay for each transmission

  openConnection()

  const client = new WSTransactor(new WS(clientWS), [complexBranchingHandle]) // client configures before websocket opens
  const server = new WSTransactor(new WS(serverWS), [complexBranchingHandle]) // server configures after

  const clientPingResult = client.do(COMPLEX_BRANCHING_TRANSACTION_NAME, complexBranchingDoCallback)
  const serverPingResult = server.do(COMPLEX_BRANCHING_TRANSACTION_NAME, complexBranchingDoCallback)

  expect(await timeout(clientPingResult, 1000)).toEqual([OK])
  expect(await timeout(serverPingResult, 1000)).toEqual([OK])
})

test('requester sends first message and it gets received', async () => {
  const ORDERING_TRANSACTION_NAME = 'ordering'

  const { openConnection, clientWS, serverWS } = genTestWSPair(100) // -> 100ms delay for each transmission
  openConnection()

  const client = new WSTransactor(new WS(clientWS), [])
  const server = new WSTransactor(new WS(serverWS), [])

  server.listen(ORDERING_TRANSACTION_NAME, async io => {
    expect(await io.receive(primitive.string)).toBe('abc123')
  })

  expect(await timeout((
    client.do(ORDERING_TRANSACTION_NAME, async io => {
      io.send('abc123', primitive.string)
      return OK
    })
  ), 1000)).toEqual([OK])
})

test('acceptor sends first message and it gets received', async () => {
  const ORDERING_TRANSACTION_NAME = 'ordering'

  const { openConnection, clientWS, serverWS } = genTestWSPair(100) // -> 100ms delay for each transmission
  openConnection()

  const client = new WSTransactor(new WS(clientWS), [])
  const server = new WSTransactor(new WS(serverWS), [])

  server.listen(ORDERING_TRANSACTION_NAME, async io => {
    io.send('abc123', primitive.string)
  })

  expect(await timeout((
    client.do(ORDERING_TRANSACTION_NAME, async io => {
      expect(await io.receive(primitive.string)).toBe('abc123')
      return OK
    })
  ), 1000)).toEqual([OK])
})
