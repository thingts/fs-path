import * as path from './path-tools'
import { FilenameBase } from './filename-base'
import { FsFilename } from './fs-filename'

export abstract class PathBase extends FilenameBase {
  protected abstract path_: string

  /**
   * Protected factory method to create a new instance of the derived
   * class, used for immutable operations that return a new instance.
   *
   * Default implementation assumes the derived class has a constructor
   * that takes a single string argument (the path).  Derived classes can
   * override this method if their constructor signature is different.
   */
  protected create(path: string | FilenameBase): this {
    const ctor = this.constructor as new(path: string) => this
    return new ctor(String(path))
  }

  //
  // Getters for path properties
  //

  get filename(): FsFilename { return new FsFilename(this.filename_) }

  get parent(): this {
    return this.create(path.dirname(this.path_))
  }

  //
  // Path manipulation methods
  //

  join(...segments: readonly (string | null | undefined | FilenameBase)[]): this {
    return this.create((path.join(this.path_, ...segments.filter(s => s !== null && s !== undefined).map(s => String(s)))))
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
    return this.create(path.join(String(newParent), this.filename_))
  }

  //
  // FilenameBase abstract method implemenations
  //
  toString(): string                                        { return this.path_ }
  valueOf(): string                                         { return this.path_ }
  [Symbol.toPrimitive](): string                            { return this.path_ }
  equals(other: string | PathBase): boolean                 { return this.path_ === this.create(String(other)).path_ }
  protected get filename_(): string                         { return path.basename(this.path_) }
  protected withFilename(filename: string|FsFilename): this { return this.parent.join(filename) }
}
