import * as path from './path-tools'
import { FilenameBase } from './filename-base'

/**
 * Represents a filename, without any path components, an provides methods
 * to query and manipulate it.
 *
 * The class is immutable; all methods that modify the filename return a
 * new instance.
 *
 * The constructor ensures that the filename does not contain any directory
 * separators. If it does, an error is thrown.
 *
 * @example
 * ```ts
 * const file = new Filename('example.txt')
 * console.log(file.stem) // 'example'
 * ```
 */

export class Filename extends FilenameBase {
  protected filename_: string

  /**
   * Create a {@link Filename} instance from a string or another {@link Filename}
   *
   * Throws an error if the provided name contains path separators
   *
   * @example
   * ```ts
   * new Filename('index.ts') // OK
   * new Filename('demo/index.ts') // Throws Error
   * ```
   */
  constructor(filename: string | Filename) {
    super()
    filename = String(filename)
    if (!Filename.isFilenameString(filename)) {
      throw new Error(`Filename must not contain path components: "${filename}"`)
    }
    this.filename_ = filename
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  // --- Filename manipulaion methods ---
  //
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Creates a new {@link Filename} by calling a callback function with the
   * old filename as a string, and using the returned string as the new
   * filename
   *
   * @returns A new {@link Filename} instance
   */
  transform(fn: (filename: string) => string): this {
    return this.withFilename(fn(this.filename_))
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  // --- Static helpers ---
  //
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Returns true if the provided string is a valid filename (i.e. does not
   * contain any path separators)
   */
  static isFilenameString(filename: string): boolean {
    return filename === path.basename(filename)
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  // --- FilenameBase abstract method implementations ---
  //
  /////////////////////////////////////////////////////////////////////////////

  override toString(): string                             { return this.filename_ }

  override equals(other: string | Filename): boolean      { return this.filename_ === String(other) }
  protected override withFilename(filename: string): this { return new Filename(filename) as this }
}
