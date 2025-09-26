import * as path from './path-tools'
import { FilenameBase } from './filename-base'

export class Filename extends FilenameBase {
  protected filename_: string

  constructor(filename: string | Filename) {
    super()
    filename = String(filename)
    if (!Filename.isFilenameString(filename)) {
      throw new Error(`Filename must not contain path components: "${filename}"`)
    }
    this.filename_ = filename
  }

  //
  // Filename manipulaion methods
  //

  transform(fn: (filename: string) => string): this {
    return this.withFilename(fn(this.filename_))
  }

  //
  // Static helpers
  //

  static isFilenameString(filename: string): boolean {
    return filename === path.basename(filename)
  }

  //
  // FilenameBase abstract method implemenations
  //
  toString(): string                             { return this.filename_ }
  valueOf(): string                              { return this.filename_ }
  [Symbol.toPrimitive](): string                 { return this.filename_ }
  equals(other: string | Filename): boolean    { return this.filename_ === String(other) }
  protected withFilename(filename: string): this { return new Filename(filename) as this }
}
