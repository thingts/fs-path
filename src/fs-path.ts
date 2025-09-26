import fg from 'fast-glob'
import type { FilenameBase } from './filename-base'
import type { FsFilename } from './fs-filename'
import type { ReadStream, Stats } from 'node:fs'
import { FsAbsolutePath } from './fs-absolute-path'
import { promises as fs } from 'node:fs'

interface FsPathFilterOptions {
  onlyFiles?:       boolean
  onlyDirs?:        boolean
  includeDotfiles?: boolean
}

const FilterOptionDefaults = {
  onlyFiles:       false,
  onlyDirs:        false,
  includeDotfiles: true
}

interface PermissionFlags {
  read?:    boolean
  write?:   boolean
  execute?: boolean
}

type PermissionSpec = {
  mode: number
} | {
  user?:   PermissionFlags
  group?:  PermissionFlags
  others?: PermissionFlags
} | {
  all:    PermissionFlags // shorthand for user + group + others
}

interface FsReaddirOptions extends FsPathFilterOptions {
  allowMissing?: boolean
}

export class FsPath extends FsAbsolutePath {

  constructor(p: string | FsPath | FsAbsolutePath) {
    if (FsAbsolutePath.isAbsolutePathString(String(p))) {
      super(p)
    } else {
      super(process.cwd() + '/' + String(p))
    }
  }

  //
  // Static methods
  //
  static cwd(): FsPath {
    return new FsPath(process.cwd())
  }

  //
  // File system operations
  //

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.path_)
      return true
    } catch {
      return false
    }
  }

  async stat(): Promise<Stats> {
    return await fs.stat(this.path_)
  }

  async isFile(): Promise<boolean> {
    try {
      return (await this.stat()).isFile()
    } catch {
      return false
    }
  }

  async isDirectory(): Promise<boolean> {
    try {
      return (await this.stat()).isDirectory()
    } catch {
      return false
    }
  }

  async setPermissions(spec: PermissionSpec, opts?: { operation: 'assign' | 'overlay' | 'clear' }) : Promise<void> {
    const { operation = 'assign' } = opts ?? {}

    const mode = buildMode(spec)

    const current = operation === 'assign' ? 0 : (await fs.stat(this.path_)).mode & 0o777
    const final =
      operation === 'overlay' ? current | mode :
      operation === 'clear'   ? current & ~mode :
      mode

    await fs.chmod(this.path_, final)
  }

  async mkdir(opts?: { recursive?: boolean }): Promise<void> {
    const { recursive = false } = opts ?? {}
    await fs.mkdir(this.path_, { recursive })
  }

  async read(encoding: BufferEncoding = 'utf8'): Promise<string> {
    return await fs.readFile(this.path_, { encoding })
  }

  async write( content: string | Uint8Array, opts?: { mkdirIfNeeded?: boolean, append?: boolean, encoding?: BufferEncoding }): Promise<void> {
    const { mkdirIfNeeded = false, append = false, encoding = typeof content === 'string' ? 'utf8' : undefined } = opts ?? {}
    await this.#mkdirIfNeeded(mkdirIfNeeded)
    await fs.writeFile(this.path_, content, {
      encoding,
      flag: append ? 'a' : 'w'
    })
  }

  async touch(opts?: { mkdirIfNeeded?: boolean }): Promise<void> {
    const { mkdirIfNeeded = false } = opts ?? {}
    if (mkdirIfNeeded) {
      await this.parent.mkdir({ recursive: true })
    }

    try {
      const now = new Date()
      await fs.utimes(this.path_, now, now)
    } catch (err) {
      if (errnoExceptionCode(err, 'ENOENT')) {
        await fs.writeFile(this.path_, '')
      } else {
        throw err
      }
    }
  }
  
  async readStream(opts?: { start?: number, end?: number}): Promise<ReadStream> {
    return (await fs.open(this.path_)).createReadStream(opts)
  }

  
  async rename(to: FsAbsolutePath, opts?: { mkdirIfNeeded?: boolean }): Promise<void> {
    const { mkdirIfNeeded = false } = opts ?? {}
    const target = new FsPath(to)
    await target.#mkdirIfNeeded(mkdirIfNeeded)
    await fs.rename(this.path_, target.path_)
  }
  
  
  async remove(opts?: { throwIfMissing?: boolean }): Promise<void> {
    const { throwIfMissing = false } = opts ?? {}
    await fs.rm(this.path_, {
      recursive: true,
      force: !throwIfMissing
    })
  }

  async copyTo(to: FsAbsolutePath, opts?: { intoDir?: boolean, mkdirIfNeeded?: boolean }): Promise<void> {
    const { intoDir = false, mkdirIfNeeded = false } = opts ?? {}
    const target      = new FsPath(to)
    const destination = intoDir ? target.join(this.filename) : target
    await destination.#mkdirIfNeeded(mkdirIfNeeded)
    await fs.copyFile(this.path_, destination.path_)
  }

  async readdir(opts?: FsReaddirOptions): Promise<FsPath[]> {
    const { allowMissing = false, ...filterOptions } = opts ?? {}
    try {
      const entries = await fs.readdir(this.path_)
      const paths = entries.map(e => this.join(e))
      return await asyncFilter(paths, p => p.#shouldBeListed(filterOptions))
    } catch (err: unknown) {
      if (allowMissing && errnoExceptionCode(err, 'ENOENT')) {
        return []
      }
      throw err
    }
  }

  async glob(pattern: string | FsFilename, opts?: FsReaddirOptions): Promise<FsPath[]> {
    const { allowMissing = false, includeDotfiles, onlyDirs, onlyFiles } = { ...FilterOptionDefaults, ...opts }
    // fs-glob will return an empty array if the directory does not exist,
    // but we want to throw ENOENT unless allowMissing is set.
    try {
      void await fs.readdir(this.path_)
    } catch (err: unknown) {
      if (allowMissing && errnoExceptionCode(err, 'ENOENT')) {
        return []
      }
      throw err
    }
    const results = await fg(String(pattern), {
      cwd:      this.path_,
      absolute: true,
      dot:      includeDotfiles,
      onlyDirectories: onlyDirs,
      onlyFiles:       onlyFiles,
    })
    return results.map(p => new FsPath(p))
  }

  async #shouldBeListed(opts?: FsPathFilterOptions): Promise<boolean> {
    const { onlyFiles, onlyDirs, includeDotfiles } = { ...FilterOptionDefaults, ...opts }

    if (!includeDotfiles && this.filename.toString().startsWith('.')) { return false }
    if (!onlyFiles && !onlyDirs)                                      { return true }

    const stat = await this.stat()

    if (onlyFiles && !stat.isFile())     { return false }
    if (onlyDirs && !stat.isDirectory()) { return false }

    return true
  }

  async #mkdirIfNeeded(mkdirIfNeeded: boolean): Promise<void> {
    if (mkdirIfNeeded) {
      await this.parent.mkdir({ recursive: true })
    }
  }

  //
  // PathBase abstract method implemenations
  //
 
  protected withPath(path: string | FilenameBase): this { return new FsPath(String(path)) as this }

}

async function asyncFilter<T>(array: readonly T[], predicate: (value: T) => Promise<boolean>): Promise<T[]> {
  const results = await Promise.all(array.map(predicate))
  return array.filter((_, i) => results[i])
}

function errnoExceptionCode(err: unknown, code: string): boolean {
  return err instanceof Error && 'code' in err && err.code == code
}

// Permission mode helpers

function toOctalDigit(flags: PermissionFlags = {}): number {
  return (flags.read ? 4 : 0) | (flags.write ? 2 : 0) | (flags.execute ? 1 : 0)
}

function combineModes(user: number, group: number, others: number): number {
  return (user << 6) | (group << 3) | others
}

function buildMode(spec: PermissionSpec): number {
  if ('mode' in spec) {
    return spec.mode
  } else if ('all' in spec) {
    const mode = toOctalDigit(spec.all)
    return combineModes(mode, mode, mode)
  } else {
    return combineModes(toOctalDigit(spec.user), toOctalDigit(spec.group), toOctalDigit(spec.others))
  }
}
