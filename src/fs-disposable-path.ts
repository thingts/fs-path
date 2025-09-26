import * as path from './path-tools'
import type { FsAbsolutePath } from './fs-absolute-path'
import { FsPath } from './fs-path'
import { promises as fs, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

export class FsDisposablePath extends FsPath {

  constructor(path: string | FsAbsolutePath, opts?: { dispose?: 'onExit' | false }) {
    super(path)
    const { dispose = false } = opts ?? {}
    if (dispose === 'onExit') {
      FsDisposablePath.removeOnExit(this.path_)
    }
  }

  //
  // Static methods
  //

  static async makeTempDirectory(opts?: { prefix?: string, dispose?: 'onExit' | false }): Promise<FsPath> {
    const { prefix = 'scratch-', dispose = 'onExit' } = opts ?? {}
    return new FsDisposablePath(await fs.mkdtemp(path.join(tmpdir(), prefix)), { dispose })
  }


  ;[Symbol.dispose](): void {
    rmSync(this.path_, { recursive: true, force: true })
  }
  
  private static disposePaths: string[] = []

  private static removeOnExit(path: FsAbsolutePath | string): void {
    if (FsDisposablePath.disposePaths.length == 0) {
      process.on('exit', () => FsDisposablePath.disposePaths.forEach(p => rmSync(p, { recursive: true, force: true })))
    }
    FsDisposablePath.disposePaths.push(String(path))
  }
}
