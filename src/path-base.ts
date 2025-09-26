import * as path from './path-tools'
import { FilenameBase } from './filename-base'
import { FsFilename } from './fs-filename'

export abstract class PathBase extends FilenameBase {
  protected abstract path_: string
  protected abstract withPath(path: string | FilenameBase): this

  //
  // Getters for path properties
  //

  get filename(): FsFilename { return new FsFilename(this.filename_) }

  get parent(): this {
    return this.withPath(path.dirname(this.path_))
  }

  //
  // Path manipulation methods
  //

  join(...segments: readonly (string | null | undefined | FilenameBase)[]): this {
    return this.withPath((path.join(this.path_, ...segments.filter(s => s !== null && s !== undefined).map(s => String(s)))))
  }

  replaceFilename(newFilename: string | FsFilename): this {
    return this.withFilename(String(newFilename))
  }

  replaceStem(newStem: string): this {
    return this.withFilename(this.filename.replaceStem(newStem))
  }

  replaceExtension(newExt: string): this {
    return this.withFilename(this.filename.replaceExtension(newExt))
  }

  transformFilename(fn: (filename: FsFilename) => string | FsFilename): this {
    return this.withFilename(fn(this.filename))
  }

  replaceParent(newParent: string | PathBase): this {
    return this.withPath(path.join(String(newParent), this.filename_))
  }

  //
  // FilenameBase abstract method implemenations
  //
  toString(): string                                        { return this.path_ }
  valueOf(): string                                         { return this.path_ }
  [Symbol.toPrimitive](): string                            { return this.path_ }
  equals(other: string | PathBase): boolean                 { return this.path_ === this.withPath(String(other)).path_ }
  protected get filename_(): string                         { return path.basename(this.path_) }
  protected withFilename(filename: string|FsFilename): this { return this.parent.join(filename) }
}

