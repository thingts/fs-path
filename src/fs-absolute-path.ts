import * as path from './path-tools'
import type { FsFilename } from './fs-filename'
import { FsRelativePath } from './fs-relative-path'
import { PathBase } from './path-base'

export class FsAbsolutePath extends PathBase {
  protected readonly path_: string

  constructor(p: string | FsAbsolutePath) {
    super()
    this.path_ = FsAbsolutePath.#canonicalize(String(p))
  }

  static #canonicalize(p: string): string {
    const resolved = path.resolve(p)
    return resolved.endsWith(path.sep) ? resolved.slice(0, -path.sep.length) : resolved
  }

  //
  // Path manipulation methods
  //

  resolve(...segments: readonly (string | FsFilename | FsRelativePath | FsAbsolutePath | null | undefined)[]): this {
    return this.create(path.resolve(this.path_, ...segments.filter(s => s != null).map(s => String(s))))
  }

  //
  //
  // Path querying methods
  //
 
  relativeTo(base: FsAbsolutePath): FsRelativePath {
    return new FsRelativePath(path.relative(base.path_, this.path_))
  }

  descendsFrom(ancestor: FsAbsolutePath | string, opts?: { includeSelf?: boolean }): boolean {
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
