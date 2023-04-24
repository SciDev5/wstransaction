import { WS } from '../WS'
import { WSTransactionHandle, WSTransactor } from '../WSTransaction'
import { primitive } from '../util/serialization/actions/primitive'
import { genTestWSPair } from './FakeWS'
import { timeout } from './timing'

test('transaction works without skipping after going reeeaaly fast', async () => {
  const PING_TRANSACTION_NAME = 'ping'
  const DATA_TO_SEND = 'it works'
  const simplePingHandle = new WSTransactionHandle(PING_TRANSACTION_NAME, async io => {
    io.send(await io.receive(primitive.string), primitive.string)
  })

  const { openConnection, clientWS, serverWS } = genTestWSPair(100) // 100 -> 100ms delay for each transmission

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
