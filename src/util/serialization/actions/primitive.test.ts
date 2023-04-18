import { primitive } from './primitive'

test('string serialization', () => {
  const strings = ['', 'helloworld', 'h'.repeat(9999), '汉字东西', 'text mixed with µ̵̰̟̪̭̿̓̂̏͝ͅñ̶̙͎̮͔̀̾̾̍͝ͅį̸͔͈̪̼̈̔́͊̏͂¢̶͙͉̬̖̗́̑̿̀̓ð̸̡͕̫͉̗̋͒̔͋̒Ð̴̗̠͕̺͈͆̓͗̀̍ê̵̡̯͈̼̭͆͗͗͛͝ ̵̢̦̜̦̣̍̎́͑́§̷͈͍͔̝̾̊͋̅̀ͅ†̷͙͓͉͎͙̐̀̉̑͑µ̴̡̱̩̰̜̄̊̒̕͝£̶̼̺̬̯̆̒͂̑̑͜£̴͈̗̩̤͆̉̿̀͗ͅ  ']
  const serix = primitive.string

  for (const strIn of strings) {
    const strOut = serix.fromBin(serix.toBin(strIn))
    expect(strOut).toBe(strIn)
  }
})

test('boolean serialization', () => {
  const bools = [true, false]
  const serix = primitive.boolean

  for (const boolIn of bools) {
    const boolOut = serix.fromBin(serix.toBin(boolIn))
    expect(boolOut).toBe(boolIn)
  }
})

test('number (f64, u8, i32, u32) serialization', () => {
  const nums: number[] = [0, -0, 1, -1, 2, 49213.031314, -2043141.0134, 0.0014, 0xffffffff, 0x7fffffff, -0x7ffffff, 0x1_12345678, -0.0013491, NaN, Infinity, -Infinity]
  const serixF64 = primitive.number
  const serixU8 = primitive.u8
  const serixU32 = primitive.u32
  const serixI32 = primitive.i32

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
  const serix = primitive.u8Array

  for (const arrIn of arrs) {
    const arrOut = serix.fromBin(serix.toBin(arrIn))
    expect([...arrOut]).toEqual([...arrIn])
  }
})
