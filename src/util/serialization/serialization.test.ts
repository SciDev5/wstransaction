import { primitive } from './actions/primitive'
import { SeriX, SerializationProfile } from './serialization'

type D = [string, number, boolean, number, string, number]
class RGBColorSerializationProfile extends SerializationProfile<RGBColor, D> {
  constructor () {
    super([
      primitive.string.action,
      primitive.number.action,
      primitive.boolean.action,
      primitive.number.action,
      primitive.string.action,
      primitive.number.action,
    ])
  }

  destructure ({ colorName, isFavorite, r, g, str2, b }: RGBColor): D {
    return [colorName, r, isFavorite, g, str2, b]
  }

  restructure ([colorName, r, isFavorite, g, str2, b]: D): RGBColor {
    return new RGBColor(colorName, r, isFavorite, g, str2, b)
  }
}
class RGBColor {
  constructor (
    readonly colorName: string,
    readonly r: number,
    readonly isFavorite: boolean,
    readonly g: number,
    readonly str2: string,
    readonly b: number,
  ) {}

  static readonly serix = new SeriX(new RGBColorSerializationProfile())
}

test('object serialization', () => {
  const dataIn = new RGBColor('stupid', 1, true, 2, 'str2', 3)
  const dataOunt = RGBColor.serix.fromBin(RGBColor.serix.toBin(dataIn))

  expect(dataOunt).toEqual(dataIn)
})
