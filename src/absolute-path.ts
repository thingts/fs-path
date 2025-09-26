import * as path from './path-tools'
import type { Filename } from './filename'
import { RelativePath } from './relative-path'
import { PathBase } from './path-base'

/**
 * Represents an absolute filesystem path (i.e. a path starting at the root, i.e.
 * has a leading separator), and provides methods for path resolution,
 * manipulation and queries.
 *
 * {@link AbsolutePath} instances are normalized and immutable.
 *
 * {@link AbsolutePath} has the same functionality as {@link RelativePath} but
 * with added methods that are only valid for absolute paths: {@link
 * AbsolutePath.resolve, @link AbsolutePath.relativeTo}, and {@link
 * AbsolutePath.descendsFrom}.
 *
 * Note that {@link AbsolutePath} provides pure path manipulation, it does not access
 * the filesystem in any way.  (If you want to work with filesystem , use the
 * `@thingts/fs-path` library which extends {@link AbsolutePath} with filestem
 * operations.)
 *
 * @example
 * ```ts
 * const p1 = new AbsolutePath('/project/demos')
 * const p2 = p1.join('demo1/src', 'index.ts') // '/project/demos/demo1/src/index.ts'
 * console.log(p2.descendsFrom(p1)) // true
 * console.log(p2.relativeTo(p1)) // 'demo1/src/index.ts' (RelativePath)
 * ```
 *
 */
export class AbsolutePath extends PathBase {
  protected readonly path_: string

  /**
   * Create a new {@link AbsolutePath} from a string or another {@link AbsolutePath}.
   *
   * The path is normalized and guaranteed to be absolute. Any trailing
   * separator is removed.
   *
   * Throws an error if the provided path is not absolute.
   *
   * @example
   * ```ts
   * new AbsolutePath('/project/demos') // OK
   * new AbsolutePath('project/demos')  // Throws Error
   * new AbsolutePath('/project//src/../demos/') // normalized => /project/demos
   * ```
   */
  constructor(path: string | AbsolutePath) {
    super()
    this.path_ = AbsolutePath.#canonicalize(String(path))
  }

  static #canonicalize(p: string): string {
    return path.normalize(path.resolve(p))
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  //  --- Path manipulation methods ---
  //
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Resolve additional path segments against this absolute path.
   *
   * Accepts strings, {@link Filename}, {@link RelativePath}, or {@link AbsolutePath} objects.
   * Null and undefined segments are ignored.
   *
   * Similar to join, except that if any segment is an {@link AbsolutePath} or string
   * starting with a path separator, the current path is discarded and
   * resolution starts from that segment.
   *
   * @returns A new {@link AbsolutePath} with the resolved path.
   *
   * @example
   * ```ts
   * const p1 = new AbsolutePath('/project/demos')
   * const p2 = p1.resolve('demo1/src', 'index.ts') // '/project/demos/demo1/src/index.ts'
   * const p3 = p1.resolve('/etc/config') // '/etc/config' (resets to absolute path)
   * ```
   */
  resolve(...segments: readonly (string | Filename | RelativePath | AbsolutePath | null | undefined)[]): this {
    return this.create(path.resolve(this.path_, ...segments.filter(s => s != null).map(s => String(s))))
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  //  --- Path query methods ---
  //
  /////////////////////////////////////////////////////////////////////////////
 
  /**
   * Compute the relative path from the given base path to this path.
   *
   * @param base - The base absolute path.
   * @returns A {@link RelativePath} that goes from `base` to `this`.
   *
   * @example
   * ```ts
   * const p1 = new AbsolutePath('/project/demo')
   * const p2 = new AbsolutePath('/project/demo/src/index.ts')
   * const rel = p2.relativeTo(p1) // 'src/index.ts' (RelativePath)
   * p1.join(rel).equals(p2)       // true
   * ```
   */
  relativeTo(base: AbsolutePath): RelativePath {
    return new RelativePath(path.relative(base.path_, this.path_))
  }

  /**
   * Test whether this path is a descendant of the given ancestor path.
   *
   * @param ancestor - An `AbsolutePath` or string to check against.
   * @param opts.includeSelf - If true, return true when the paths are identical.
   * @returns True if this path descends from the ancestor, otherwise false.
   *
   * @example
   * ```ts
   * const p1 = new AbsolutePath('/project/demo')
   * const p2 = new AbsolutePath('/project/demo/src/index.ts')
   * console.log(p2.descendsFrom(p1)) // true
   * console.log(p1.descendsFrom(p1)) // false
   * console.log(p1.descendsFrom(p1, { includeSelf: true })) // true
   * ```
   */
  descendsFrom(ancestor: AbsolutePath | string, opts?: { includeSelf?: boolean }): boolean {
    const { includeSelf = false } = opts ?? {}
    const ancestorPath = path.resolve(String(ancestor))
    const current      = this.path_
    if (includeSelf && current === ancestorPath) {
      return true
    }
    return current.startsWith(ancestorPath + path.sep)
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  //  --- Static helpers ---
  //
  /////////////////////////////////////////////////////////////////////////////
  

   /**
   * Checks whether a string is an absolute path.  (I.e., if it would be
   * acceptable to the {@link AbsolutePath} constructor.)
   *
   * @param filepath - The string to check.
   * @returns True if the string is an absolute path, otherwise false.
   */
  static isAbsolutePathString(filepath: string): boolean {
    return path.isAbsolute(filepath)
  }

}
