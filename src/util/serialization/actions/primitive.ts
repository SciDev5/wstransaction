import { BooleanSerializationAction } from './bool'
import { I32SerializationAction, NumberSerializationAction, U32SerializationAction, U8SerializationAction, Uint8ArraySerializationAction } from './number'
import { StringSerializationAction } from './string'
import { SeriX } from '../serialization'

export const primitive = {
  string: new SeriX(StringSerializationAction.default),
  boolean: new SeriX(BooleanSerializationAction.default),
  number: new SeriX(NumberSerializationAction.default),
  u8: new SeriX(U8SerializationAction.default),
  u32: new SeriX(U32SerializationAction.default),
  i32: new SeriX(I32SerializationAction.default),
  u8Array: new SeriX(Uint8ArraySerializationAction.default),
} as const
