import { type ByteArraySlice } from '../../ByteArraySlice'
import { type SerializationAction } from '../serialization'

export class NumberSerializationAction implements SerializationAction<number> {
  readonly arrayBuff = new ArrayBuffer(8)
  readonly f64 = new Float64Array(this.arrayBuff)
  readonly u8 = new Uint8Array(this.arrayBuff)

  serialize (data: number): number[] {
    this.f64[0] = data
    return [...this.u8]
  }

  deserialize (data: ByteArraySlice): { bytesRead: number, data: number } {
    for (let i = 0; i < 8; i++) {
      this.u8[i] = data.get(i)
    }
    return { bytesRead: 8, data: this.f64[0] }
  }

  static readonly default = new this()
}
export class I32SerializationAction implements SerializationAction<number> {
  readonly arrayBuff = new ArrayBuffer(4)
  readonly i32 = new Int32Array(this.arrayBuff)
  readonly u8 = new Uint8Array(this.arrayBuff)

  serialize (data: number): number[] {
    this.i32[0] = data
    return [...this.u8]
  }

  deserialize (data: ByteArraySlice): { bytesRead: number, data: number } {
    for (let i = 0; i < 4; i++) {
      this.u8[i] = data.get(i)
    }
    return { bytesRead: 4, data: this.i32[0] }
  }

  static readonly default = new this()
}
export class U32SerializationAction implements SerializationAction<number> {
  readonly arrayBuff = new ArrayBuffer(4)
  readonly u32 = new Uint32Array(this.arrayBuff)
  readonly u8 = new Uint8Array(this.arrayBuff)

  serialize (data: number): number[] {
    this.u32[0] = data
    return [...this.u8]
  }

  deserialize (data: ByteArraySlice): { bytesRead: number, data: number } {
    for (let i = 0; i < 4; i++) {
      this.u8[i] = data.get(i)
    }
    return { bytesRead: 4, data: this.u32[0] }
  }

  static readonly default = new this()
}

export class U8SerializationAction implements SerializationAction<number> {
  serialize (data: number): number[] {
    return [data]
  }

  deserialize (data: ByteArraySlice): { bytesRead: number, data: number } {
    return { bytesRead: 1, data: data.get(0) }
  }

  static readonly default = new this()
}

export class Uint8ArraySerializationAction implements SerializationAction<Uint8Array> {
  readonly arrayBuff = new ArrayBuffer(4)
  readonly lenU32 = new Uint32Array(this.arrayBuff)
  readonly lenU8 = new Uint8Array(this.arrayBuff)

  serialize (data: Uint8Array): number[] {
    this.lenU32[0] = data.length
    return [...this.lenU8, ...data]
  }

  deserialize (data: ByteArraySlice): { bytesRead: number, data: Uint8Array } {
    for (let i = 0; i < 4; i++) {
      this.lenU8[i] = data.get(i)
    }
    const byteLen = this.lenU32[0]
    return { bytesRead: 4 + byteLen, data: data.copySlice(4, byteLen) }
  }

  static readonly default = new this()
}
