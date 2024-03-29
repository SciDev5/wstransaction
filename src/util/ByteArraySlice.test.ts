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

test('ByteArraySlice.copySlice works', () => {
  const innerArray = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  const outerSlice = new ByteArraySlice(innerArray)

  const innerSliceA = outerSlice.slice(0, 6)
  const innerSliceB = outerSlice.slice(5, 4)

  expect(innerSliceA.copySlice(1, 2)).toEqual(innerArray.slice(1, 3))
  expect(innerSliceB.copySlice(1, 2)).toEqual(innerArray.slice(6, 8))
})
