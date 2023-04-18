import { primitive } from './actions/primitive'
import { SeriX, SerializationProfile } from './serialization'

type D = [string, number, boolean, number, number]
class RGBColorSerializationProfile extends SerializationProfile<RGBColor, D> {
  constructor () {
    super([
      primitive.string.action,
      primitive.number.action,
      primitive.boolean.action,
      primitive.number.action,
      primitive.number.action,
    ])
  }

  destructure ({ colorName, isFavorite, r, g, b }: RGBColor): D {
    return [colorName, r, isFavorite, g, b]
  }

  restructure ([colorName, r, isFavorite, g, b]: D): RGBColor {
    return new RGBColor(colorName, r, isFavorite, g, b)
  }
}
class RGBColor {
  constructor (
    readonly colorName: string,
    readonly r: number,
    readonly isFavorite: boolean,
    readonly g: number,
    readonly b: number,
  ) {}

  static readonly serix = new SeriX(new RGBColorSerializationProfile())
}

test('object serialization', () => {
  const dataIn = new RGBColor('stupid', 1, true, 2, 3)
  const dataOunt = RGBColor.serix.fromBin(RGBColor.serix.toBin(dataIn))

  expect(dataOunt).toEqual(dataIn)
})
