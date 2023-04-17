import { type ByteArraySlice } from '../../ByteArraySlice'
import { type SerializationAction } from '../serialization'

export class StringSerializationAction implements SerializationAction<string> {
  readonly arrayBuff = new ArrayBuffer(4)
  readonly lenU32 = new Uint32Array(this.arrayBuff)
  readonly lenU8 = new Uint8Array(this.arrayBuff)
  readonly textEncoder = new TextEncoder()
  readonly textDecoder = new TextDecoder()

  serialize (data: string): number[] {
    const dataBytes = this.textEncoder.encode(data)
    this.lenU32[0] = dataBytes.length
    return [...this.lenU8, ...dataBytes]
  }

  deserialize (data: ByteArraySlice): { bytesRead: number, data: string } {
    for (let i = 0; i < 4; i++) {
      this.lenU8[i] = data.get(i)
    }
    const byteLen = this.lenU32[0]
    return { bytesRead: 4 + byteLen, data: this.textDecoder.decode(data.copySlice(4, byteLen)) }
  }

  static readonly default = new this()
}
