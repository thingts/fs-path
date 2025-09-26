import * as path from './path-tools'
import type { Filename } from './filename'
import { RelativePath } from './relative-path'
import { PathBase } from './path-base'

export class AbsolutePath extends PathBase {
  protected readonly path_: string

  constructor(p: string | AbsolutePath) {
    super()
    this.path_ = AbsolutePath.#canonicalize(String(p))
  }

  static #canonicalize(p: string): string {
    const resolved = path.resolve(p)
    return resolved.endsWith(path.sep) ? resolved.slice(0, -path.sep.length) : resolved
  }

  //
  // Path manipulation methods
  //

  resolve(...segments: readonly (string | Filename | RelativePath | AbsolutePath | null | undefined)[]): this {
    return this.create(path.resolve(this.path_, ...segments.filter(s => s != null).map(s => String(s))))
  }

  //
  //
  // Path querying methods
  //
 
  relativeTo(base: AbsolutePath): RelativePath {
    return new RelativePath(path.relative(base.path_, this.path_))
  }

  descendsFrom(ancestor: AbsolutePath | string, opts?: { includeSelf?: boolean }): boolean {
    const { includeSelf = false } = opts ?? {}
    const ancestorPath = path.resolve(String(ancestor))
    const current      = this.path_
    if (includeSelf && current === ancestorPath) {
      return true
    }
    return current.startsWith(ancestorPath + path.sep)
  }

  //
  // Static helpers
  //

  static isAbsolutePathString(filepath: string): boolean {
    return path.isAbsolute(filepath)
  }

}
