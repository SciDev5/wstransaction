import { RawWS, type RawWSLike, RawWSState, WS, CloseInfo } from './WS'
import { WSTransactionHandle, WSTransactor, WSTransactionIO, type WSTransactionFunction } from './WSTransaction'
import { ByteArraySlice } from './util/ByteArraySlice'
import { BooleanSerializationAction } from './util/serialization/actions/bool'
import { I32SerializationAction, NumberSerializationAction, U32SerializationAction, U8SerializationAction, Uint8ArraySerializationAction } from './util/serialization/actions/number'
import { primitive } from './util/serialization/actions/primitive'
import { SeriX, SerializationProfile, type SerializationAction, SeriXError, SeriXErrorWhich } from './util/serialization/serialization'

export {
  // Core
  WSTransactor,
  WSTransactionHandle,
  type WSTransactionFunction,
  WSTransactionIO,

  // WebSocket Wrappers
  WS,
  RawWS,
  type RawWSLike,
  RawWSState,
  CloseInfo,

  // SeriX serialization
  SeriX,
  SerializationProfile,
  type SerializationAction,
  SeriXError,
  SeriXErrorWhich,
  primitive,
  BooleanSerializationAction,
  NumberSerializationAction,
  U8SerializationAction,
  Uint8ArraySerializationAction,
  U32SerializationAction,
  I32SerializationAction,
  ByteArraySlice,
}
