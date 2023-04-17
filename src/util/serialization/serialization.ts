import { ByteArraySlice } from '../ByteArraySlice'

export class SeriX<T> {
  constructor (private readonly act: SerializationAction<T>) {}

  toBin (data: T): ArrayBuffer {
    return new Uint8Array(this.act.serialize(data)).buffer
  }

  fromBin (data: ArrayBuffer): T {
    return this.act.deserialize(new ByteArraySlice(new Uint8Array(data))).data
  }
}

export enum SeriXErrorWhich {
  ACTION_LENGTH_MISMATCH,
  DATA_LENGTH_MISMATCH,
}
export class SeriXError extends Error {
  constructor (readonly which: SeriXErrorWhich) {
    super('Serialization Error')
  }
}

export abstract class SerializationProfile<T, D extends any[]> implements SerializationAction<T> {
  constructor (
    readonly actions: { [i in keyof D]: SerializationAction<D[i]> },
  ) {}

  abstract destructure (data: T): D
  abstract restructure (data: D): T

  serialize (data: T): number[] {
    const bytes: number[] = []
    const destructured = this.destructure(data)
    if (destructured.length !== this.actions.length) {
      throw new SeriXError(SeriXErrorWhich.ACTION_LENGTH_MISMATCH)
    }
    for (let i = 0; i < this.actions.length; i++) {
      bytes.push(...this.actions[i].serialize(destructured[i]))
    }
    return bytes
  }

  deserialize (bytes: ByteArraySlice): { bytesRead: number, data: T } {
    let dataIndex = 0
    const destructuredData = [] as any[] as D
    for (let i = 0; i < this.actions.length; i++) {
      const { bytesRead, data } = this.actions[i].deserialize(bytes.slice(dataIndex))
      dataIndex += bytesRead
      if (dataIndex > bytes.length) {
        throw new SeriXError(SeriXErrorWhich.DATA_LENGTH_MISMATCH)
      }
      destructuredData.push(data)
    }
    return { bytesRead: dataIndex, data: this.restructure(destructuredData) }
  }
}
export interface SerializationAction<T> {
  serialize: (data: T) => number[]
  deserialize: (data: ByteArraySlice) => { bytesRead: number, data: T }
}
