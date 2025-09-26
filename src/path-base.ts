import * as path from './path-tools'
import { FilenameBase } from './filename-base'
import { Filename } from './filename'

export abstract class PathBase extends FilenameBase {
  /** @private */

  /** Implemented by subclasses to hold the normalized path string. */
  protected abstract path_: string

  /**
   * Protected factory to construct a new instance of the *derived* class.
   * 
   * Used by all mutation-like methods to return a new instance of the derived
   * class.
   *
   * The default implementation assumes the derived class's constructor takes
   * a single string argument (the path).  Derived classes with different
   * constructo siguatures should override 'create()'
   */
  protected create(path: string | FilenameBase): this {
    const ctor = this.constructor as new(path: string) => this
    return new ctor(String(path))
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  //  --- Getters for path properties ---
  //
  /////////////////////////////////////////////////////////////////////////////

  /**
   * The filename component (last path segment) as a {@link Filename}.
   *
   * @example
   * ```ts
   * new AbsolutePath('/a/b/c.txt').filename // 'c.txt' (Filename)
   * new RelativePath('a/b/c.txt').filename  // 'c.txt' (Filename)
   * ```
   */
  get filename(): Filename { return new Filename(this.filename_) }

  /**
   * The parent directory of this path.
   *
   * @returns A new path instance pointing to the parent.
   * @example
   * ```ts
   * new AbsolutePath('/a/b/c.txt').parent // '/a/b' (AbsolutePath)
   * new RelativePath('a/b/c.txt').parent  // 'a/b' (RelativePath)
   * ```
   */
  get parent(): this {
    return this.create(path.dirname(this.path_))
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  // --- Path manipulation methods ---
  //
  /////////////////////////////////////////////////////////////////////////////


  /**
   * Join additional path segments to this path.
   *
   * Accepts strings or path objects; `null` and `undefined` are ignored.
   * The resulting path is normalized.
   *
   * @returns A new path instance with the segments appended
   *
   * @example
   * ```ts
   * const a1 = new AbsolutePath('/project/demo')
   * const a2 = a1.join('demo1/src', 'index.js') // '/project/demo/demo1/src/index.js'
   * a2 instanceof AbsolutePath // true
   *
   * const r1 = new RelativePath('demo')
   * const r2 = r1.join('demo1/src', 'index.js') // 'demo/demo1/src/index.js'
   * r2 instanceof RelativePath // true
   * ```
   */
  join(...segments: readonly (string | null | undefined | FilenameBase)[]): this {
    return this.create((path.join(this.path_, ...segments.filter(s => s !== null && s !== undefined).map(s => String(s)))))
  }

  /**
   * Replace the filename (last segment).
   *
   * @returns A new path with the filename replaced.
   */
  replaceFilename(newFilename: string | Filename): this {
    return this.withFilename(String(newFilename))
  }

 /**
   * Replace the filename stem, keeping the extension the same
   *
   * @param newStem - New stem to use (extension is preserved).
   * @returns A new path with the stem replaced.
   * @example
   * ```ts
   * new AbsolutePath('/a/b/c.txt').replaceStem('d') // '/a/b/d.txt' (AbsolutePath)
   * new RelativePath('a/b/c.txt').replaceStem('d')  // 'a/b/d.txt' (RelativePath)
   * ```
   */
  replaceStem(newStem: string): this {
    return this.withFilename(this.filename.replaceStem(newStem))
  }

  /**
   * Replace the filename extension, keeping the stem the same.  The passed
   * can include or omit the leading dot; if omitted, it will be added.
   *
   * @param newExt - New extension, e.g. `json` or `.json`
   * @returns A new path with the extension replaced.
   * @example
   * ```ts
   * new AbsolutePath('/a/b/c.txt').replaceExtension('json') // '/a/b/c.json' (AbsolutePath)
   * new RelativePath('a/b/c.txt').replaceExtension('.json') // '/a/b/c.json' (RelativePath)
   * ```
   */
  replaceExtension(newExt: string): this {
    return this.withFilename(this.filename.replaceExtension(newExt))
  }

  /**
   * Transform the filename via a callback.
   *
   * @param fn - Receives the current {@link Filename}, returns a new filename
   *             (string or {@link Filename}).
   * @returns A new path with the transformed filename.
   * @example
   * ```ts
   * p.transformFilename(f => f.replaceStem(f.stem + '.bak'))
   * ```
   */
  transformFilename(fn: (filename: Filename) => string | Filename): this {
    return this.withFilename(fn(this.filename))
  }

  /**
   * Replace the parent directory while keeping the current filename.
   *
   * @param newParent - Parent directory as string or another `PathBase`.
   * @returns A new path rooted at `newParent` with the same filename.
   * @example
   * ```ts
   * new AbsolutePath('/old/file.txt').replaceParent('/new/dir') // '/new/dir/file.txt' (AbsolutePath)
   * new RelativePath('old/file.txt').replaceParent('new/dir')   // 'new/dir/file.txt' (RelativePath)
   * ```
   */
  replaceParent(newParent: string | PathBase): this {
    return this.create(path.join(String(newParent), this.filename_))
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  // --- FilenameBase abstract method implemenations ---
  //
  /////////////////////////////////////////////////////////////////////////////

  /** Returns the path as string. */
  toString(): string                                        { return this.path_ }

  /** Returns true if this path equals the other path or string */
  equals(other: string | PathBase): boolean                 { return this.path_ === this.create(String(other)).path_ }

  protected get filename_(): string                         { return path.basename(this.path_) }
  protected withFilename(filename: string|Filename): this { return this.parent.join(filename) }
}
