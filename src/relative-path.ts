import * as path from './path-tools'
import { PathBase } from './path-base'

/**
 * Represents an relative filesystem path (i.e. a path that doesn't start at
 * the root, i.e. doesn't have a leading separator) and is not, and provides
 * methods for path manipulation and queries.
 *
 * {@link RelativePath} instances are normalized and immutable.
 *
 * {@link RelativePath} is similar to {@link AbsolutePath} but
 * lacks methods that are only valid for absolute paths.
 *
 * @example
 * ```ts
 * const p1 = new Relative('demos')
 * const p2 = p1.join('demo1/src', 'index.ts') // 'demos/demo1/src/index.ts'
 * ```
 *
 */
export class RelativePath extends PathBase {

  protected path_: string

  /**
   * Create a new {@link RelativePath} from a string or another {@link RelativePath}.
   *
   * The path is normalized and guaranteed to be relative. Any trailing
   * separator is removed.
   *
   * Throws an error if the provided path is absolute
   *
   * @example
   * ```ts
   * new AbsolutePath('project/demos')   // OK
   * new AbsolutePath('/project/demos')  // Throws Error
   * new AbsolutePath('project//src/../demos/') // normalized => project/demos
   * ```
   */
  constructor(relpath: string | RelativePath) {
    super()
    relpath = String(relpath)
    if (!RelativePath.isRelativePathString(relpath)) {
      throw new Error(`Path must be relative, not absolute: "${relpath}"`)
    }
    this.path_ = path.normalize(relpath)
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  //  --- Static helpers ---
  //
  /////////////////////////////////////////////////////////////////////////////

   /**
   * Checks whether a string is a relative path.  (I.e., if it would be
   * acceptable to the {@link RelativePath} constructor.)
   *
   * @param filepath - The string to check.
   * @returns True if the string is an absolute path, otherwise false.
   */
  static isRelativePathString(filepath: string): boolean {
    return !path.isAbsolute(filepath)
  }

}
