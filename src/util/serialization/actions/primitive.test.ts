import { SeriX } from '../serialization'
import { BooleanSerializationAction } from './bool'
import { I32SerializationAction, NumberSerializationAction, U32SerializationAction, U8SerializationAction, Uint8ArraySerializationAction } from './number'
import { StringSerializationAction } from './string'

test('string serialization', () => {
  const strings = ['', 'helloworld', 'h'.repeat(9999), '汉字东西', 'text mixed with µ̵̰̟̪̭̿̓̂̏͝ͅñ̶̙͎̮͔̀̾̾̍͝ͅį̸͔͈̪̼̈̔́͊̏͂¢̶͙͉̬̖̗́̑̿̀̓ð̸̡͕̫͉̗̋͒̔͋̒Ð̴̗̠͕̺͈͆̓͗̀̍ê̵̡̯͈̼̭͆͗͗͛͝ ̵̢̦̜̦̣̍̎́͑́§̷͈͍͔̝̾̊͋̅̀ͅ†̷͙͓͉͎͙̐̀̉̑͑µ̴̡̱̩̰̜̄̊̒̕͝£̶̼̺̬̯̆̒͂̑̑͜£̴͈̗̩̤͆̉̿̀͗ͅ  ']
  const serix = new SeriX(StringSerializationAction.default)

  for (const strIn of strings) {
    const strOut = serix.fromBin(serix.toBin(strIn))
    expect(strOut).toBe(strIn)
  }
})

test('boolean serialization', () => {
  const bools = [true, false]
  const serix = new SeriX(BooleanSerializationAction.default)

  for (const boolIn of bools) {
    const boolOut = serix.fromBin(serix.toBin(boolIn))
    expect(boolOut).toBe(boolIn)
  }
})

test('number (f64, u8, i32, u32) serialization', () => {
  const nums: number[] = [0, -0, 1, -1, 2, 49213.031314, -2043141.0134, 0.0014, 0xffffffff, 0x7fffffff, -0x7ffffff, 0x1_12345678, -0.0013491, NaN, Infinity, -Infinity]
  const serixF64 = new SeriX(NumberSerializationAction.default)
  const serixU8 = new SeriX(U8SerializationAction.default)
  const serixU32 = new SeriX(U32SerializationAction.default)
  const serixI32 = new SeriX(I32SerializationAction.default)

  for (const nIn of nums) { // as per IEEE-754, "float to int casts should round towards zero"
    expect(serixF64.fromBin(serixF64.toBin(nIn))).toBe(nIn) // expecting **perfect** transmission
    expect(serixU8.fromBin(serixU8.toBin(nIn))).toBe(nIn & 0xff)
    expect(serixU32.fromBin(serixU32.toBin(nIn))).toBe((nIn & 0xffff_ffff) >>> 0) // >>> 0 converts int to uint
    expect(serixI32.fromBin(serixI32.toBin(nIn))).toBe(nIn & 0xffff_ffff)
  }
})

test('byte array (Uint8Array) serialization', () => {
  const arrs: Uint8Array[] = [
    new Uint8Array([1, 2, 4, 7, 3, 6, 8, 9, 5, 4]),
    new Uint8Array([]),
    new Uint8Array([0, 0, 0, 0, 0]),
  ]
  const serix = new SeriX(Uint8ArraySerializationAction.default)

  for (const arrIn of arrs) {
    const arrOut = serix.fromBin(serix.toBin(arrIn))
    expect([...arrOut]).toEqual([...arrIn])
  }
})
