import * as path from './path-tools'
import { PathBase } from './path-base'

export class FsRelativePath extends PathBase {

  protected path_: string

  constructor(relpath: string | FsRelativePath) {
    super()
    relpath = String(relpath)
    if (!FsRelativePath.isRelativePathString(relpath)) {
      throw new Error(`Path must be relative, not absolute: "${relpath}"`)
    }
    this.path_ = path.normalize(relpath)
  }
  //
  // Static helpers
  //

  static isRelativePathString(filepath: string): boolean {
    return !path.isAbsolute(filepath)
  }

}
