
export class IndexOutOfBoundsError extends Error {
  constructor (index: number, length: number) {
    super(`Index ${index} out of bounds for length ${length}`)
  }
}
export class ByteArraySlice {
  constructor (
    private readonly innerArray: Uint8Array,
    private readonly sliceStart: number = 0,
    private readonly sliceLength: number = innerArray.length,
  ) {
    if (sliceStart < 0 || sliceStart + sliceLength > innerArray.length) {
      throw TypeError('slice bounds out of array bounds')
    }
  }

  get length (): number { return this.sliceLength }

  get (i: number): number {
    if (i >= this.sliceLength || i < 0) {
      throw new IndexOutOfBoundsError(i, this.sliceLength)
    }
    return this.innerArray[i + this.sliceStart]
  }

  set (i: number, v: number): void {
    if (i >= this.sliceLength || i < 0) {
      throw new IndexOutOfBoundsError(i, this.sliceLength)
    }
    this.innerArray[i + this.sliceStart] = v
  }

  private verifySliceBounds (start: number, length: number): void {
    if (start < 0 || start + length > this.sliceLength) {
      throw TypeError('slice start or end out of bounds')
    }
  }

  slice (start: number, length: number = this.sliceLength - start): ByteArraySlice {
    this.verifySliceBounds(start, length)
    return new ByteArraySlice(
      this.innerArray,
      this.sliceStart + start,
      length,
    )
  }

  copySlice (start: number, length: number = this.sliceLength - start): Uint8Array {
    this.verifySliceBounds(start, length)
    return this.innerArray.slice(
      this.sliceStart + start,
      start + length,
    )
  }
}
