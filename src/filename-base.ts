import * as path from './path-tools'

export abstract class FilenameBase {
  /** @private */

  /** Implemented by subclasses to hold the normalized path string. */
  protected abstract filename_: string


  /** Implemented by subclasses to create a new instance with the given filename. */
  protected abstract withFilename(filename: string): this

  /** Returns the filename as a string. */
  abstract toString(): string

  /** Returns true if this filename equals the other filename or string. */
  abstract equals(other: string | FilenameBase): boolean

  /////////////////////////////////////////////////////////////////////////////
  //
  // --- Getters for filename properties ---
  //
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Returns the extension of the filename including the leading dot, as a
   * string.  If the filename has no extension, returns an empty string.
   * 
   * Note that if the filename starts with a dot (e.g. `.gitignore`),
   * that dot is considered part of the stem.  So `.gitignore` has
   * extension `''` and `.gitignore.bak` has extension `.bak`
   */
  get extension(): string {
    return path.extname(this.filename_)
  }

  /**
   * Returns the stem of the filename, i.e. the part before the extension.
   * If the filename has no extension, returns the entire filename
   * 
   * Note that if the filename starts with a dot (e.g. `.gitignore`),
   * that dot is considered part of the stem.  So `.gitignore` and
   * `.gitignore.bak` both have stem `.gitignore`
   */

  get stem(): string {
    return path.basename(this.filename_, this.extension)
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  // --- Filename manipulation methods ---
  //
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Replace the filename stem, keeping the extension the same
   *
   * @returns A new {@link Filename} instance
   *
   * @example
   * ```ts
   * new Filename('index.ts').replaceStem('main') // 'main.ts' (Filename)
   * ```
   */
  replaceStem(newStem: string): this {
    return this.withFilename(newStem + this.extension)
  }

  /**
   * Replace the filename extensions, keeping the stem the same
   *
   * @returns A new {@link Filename} instance
   *
   * @example
   * ```ts
   * new Filename('index.ts').replaceExtension('.js') // 'index.js' (Filename)
   * ```
   */
  replaceExtension(newExt: string): this {
    const ext = newExt.startsWith('.') ? newExt : '.' + newExt
    return this.withFilename(this.stem + ext)
  }

}

