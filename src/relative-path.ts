import * as path from './path-tools'
import { PathBase } from './path-base'

export class RelativePath extends PathBase {

  protected path_: string

  constructor(relpath: string | RelativePath) {
    super()
    relpath = String(relpath)
    if (!RelativePath.isRelativePathString(relpath)) {
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
