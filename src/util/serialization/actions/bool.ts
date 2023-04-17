import { type ByteArraySlice } from '../../ByteArraySlice'
import { type SerializationAction } from '../serialization'

export class BooleanSerializationAction implements SerializationAction<boolean> {
  serialize (data: boolean): number[] {
    return [data ? 1 : 0]
  }

  deserialize (data: ByteArraySlice): { bytesRead: number, data: boolean } {
    return { bytesRead: 1, data: data.get(0) !== 0 }
  }

  static readonly default = new this()
}
