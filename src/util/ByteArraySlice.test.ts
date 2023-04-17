import { ByteArraySlice } from './ByteArraySlice'

test('ByteArraySlice maintains reference', () => {
  const innerArray = new Uint8Array([0, 0, 0, 0, 0, 1, 1, 1, 1, 1])
  const outerSlice = new ByteArraySlice(innerArray)

  expect(outerSlice.copySlice(0)).toEqual(innerArray)

  innerArray[0] = 3
  expect(outerSlice.copySlice(0)).toEqual(innerArray)

  outerSlice.set(0, 5)
  expect(outerSlice.copySlice(0)).toEqual(innerArray)

  const innerSliceA = outerSlice.slice(0, 6)
  const innerSliceB = outerSlice.slice(5, 2)

  innerArray[5] = 9

  expect(innerSliceA.get(5)).toEqual(9)
  expect(innerSliceB.get(0)).toEqual(9)

  innerSliceA.set(5, 12)
  expect(innerArray[5]).toBe(12)

  innerSliceB.set(0, 14)
  expect(innerArray[5]).toBe(14)
})
