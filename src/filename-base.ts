import * as path from './path-tools'

export abstract class FilenameBase {
  protected abstract filename_: string
  protected abstract withFilename(filename: string): this

  abstract toString(): string
  abstract valueOf(): string
  abstract [Symbol.toPrimitive](): string
  abstract equals(other: string | FilenameBase): boolean

  //
  // Getters for filename properties
  //

  get extension(): string {
    return path.extname(this.filename_)
  }

  get stem(): string {
    return path.basename(this.filename_, this.extension)
  }

  //
  // Filename manipulation methods
  //

  replaceStem(newStem: string): this {
    return this.withFilename(newStem + this.extension)
  }

  replaceExtension(newExt: string): this {
    const ext = newExt.startsWith('.') ? newExt : '.' + newExt
    return this.withFilename(this.stem + ext)
  }

}

