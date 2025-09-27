import fg from 'fast-glob'
import type { Filename, RelativePath } from '@thingts/filepath'
import type { ReadStream, Stats } from 'node:fs'
import { AbsolutePath } from '@thingts/filepath'
import { promises as fs, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

/**
 * Options for filtering paths, used by {@link FsPath.readdir} and {@link FsPath.glob}
 */
interface FsPathFilterOptions {
  /** If true, only include files in the result (default false) */
  onlyFiles?:       boolean

  /** If true, only include directories in the result (default false) */
  onlyDirs?:        boolean

  /** If true, include dotfiles in the result (default true) */
  includeDotfiles?: boolean
}

const FilterOptionDefaults = {
  onlyFiles:       false,
  onlyDirs:        false,
  includeDotfiles: true
}

export interface FsPermissionFlags {
  read?:    boolean
  write?:   boolean
  execute?: boolean
}

/**
 * Specification for setting file access permissions.
 *
 * Can be one of:
 * - Numeric mode (e.g. 0o755)
 * - An object specifying separate permissions for user, group and others.
 *     (Note that omitting a category means setting its permissions to 0.)
 * - An object specifying the same permissions for all (user, group and others)
 */
export type FsPermissionSpec = {
  /** Numeric mode (e.g. 0o755) */
  mode: number
} | {
  /** Permissions for user */
  user?:   FsPermissionFlags
  /** Permissions for user */
  group?:  FsPermissionFlags
  /** Permissions for user */
  others?: FsPermissionFlags
} | {
  /** Permissions for all (user, group and others) */
  all:    FsPermissionFlags // shorthand for user + group + others
}

/**
 * Options for reading directories, used by {@link FsPath.readdir} and
 * {@link FsPath.glob}
 */
export interface FsReaddirOptions extends FsPathFilterOptions {

  /**
   * If true, return an empty array if the directory does not exist, rather
   * than throwing an error (default: false).
   */
  allowMissing?: boolean
}

/**
 * Represents an absolute filesystem path (i.e. a path starting at the root, i.e.
 * has a leading separator), and provides methods for path resolution,
 * manipulation and queries as well as filesystem operations.
 *
 * {@link FsPath} instances are normalized and immutable.
 *
 * {@link FsPath} inherits from `@thingts/filepath`'s {@link AbsolutePath} but
 * with added methods for filesystem access.
 *
 * Having a {@link FsPath} doesn't imply that a file or directory exists at
 * that path in the filesystem; use {@link exists}, {@link isFile}, {@link
 * isDirectory} or {@link stat} to check for existence, and use {@link
 * write}, {@link touch}, {@link mkdir}, or {@link makeTempDirectory} to
 * create files or directories.
 *
 * ⚠️  In the documentation below that is inherited from {@link AbsolutePath},
 * examples that refer to `AbsolutePath` apply equally to `FsPath` -- in
 * particular, the path manipulation methods like {@link join} return
 * `FsPath` instances, not `AbsolutePath` instances.
 *
 *
 * @example
 * ```ts
 * const p = new FsPath('/path/to/file.txt')
 * await p.write('Hello, world!', { mkdirIfNeeded: true }) // Creates the file with content, creating parent directories as needed
 * ```
 *
 */
export class FsPath extends AbsolutePath {

  /**
   * Creates a new {@link FsPath} 
   *
   * If given a relative path, it is resolved against the current working
   * directory. The path is always normalized.
   *
   * Creating an {@link FsPath} instance does not imply that the path
   * exists on the filesystem; use {@link exists}, {@link isFile}, {@link
   * isDirectory} or {@link stat} to check for existence, and use {@link
   * write}, {@link touch}, {@link mkdir}, or {@link makeTempDirectory} to
   * create files or directories.
   *
   * @example
   * ```ts
   * new FsPath('/project/demos')          // Absolute path
   * new FsPath('/project//src/../demos/') // normalized => /project/demos
   * new FsPath('project/demos')           // Resolves against cwd
   * ```
   */
  constructor(path: string | FsPath | AbsolutePath | RelativePath | Filename) {
    if (AbsolutePath.isAbsolutePathString(String(path))) {
      super(path.toString())
    } else {
      super(FsPath.cwd().join(path))
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  //  --- Static methods ---
  //
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Gets the current working directory as an {@link FsPath}.
   */
  static cwd(): FsPath {
    return new FsPath(process.cwd())
  }

  /**
   * Creates a new temporary directory under the system temporary directory.
   *
   * The directory is marked as {@link FsPath.disposable}().
   */
  static async makeTempDirectory(opts?: { prefix?: string }): Promise<FsPath> {
    const { prefix = 'temp-' } = opts ?? {}
    return new FsPath(await fs.mkdtemp(new FsPath(tmpdir()).join(prefix).toString())).disposable()
  }


  /////////////////////////////////////////////////////////////////////////////
  //
  //  --- File system operations ---
  //
  /////////////////////////////////////////////////////////////////////////////

  /*
   * Returns true if the path exists.
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file')
   * const exists = await p.exists()
   * ```
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.path_)
      return true
    } catch {
      return false
    }
  }

  /*
   * Returns the `fs.Stats` object for the path.
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file')
   * const stats = await p.stat()
   * console.log(stats.size) // File size in bytes
   * ```
   */
  async stat(): Promise<Stats> {
    return await fs.stat(this.path_)
  }

  /*
   * Returns true if the path exists and is a file.
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file')
   * const isFile = await p.isFile()
   * ```
   */
  async isFile(): Promise<boolean> {
    try {
      return (await this.stat()).isFile()
    } catch {
      return false
    }
  }

  /*
   * Returns true if the path exists and is a directory.
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/dir')
   * const isDir = await p.isDirectory()
   * ```
   */
  async isDirectory(): Promise<boolean> {
    try {
      return (await this.stat()).isDirectory()
    } catch {
      return false
    }
  }

  /**
   * Sets the permission mode of the path.
   * 
   * @param spec - The permission specification.  Can be the numeric mode, or an object specifying user/group/others permissions.
   * @param opts.operation - The operation to perform: assign the permissions exactly (default), overlay the permissions on top of the existing ones, or clear the specified permissions from the existing ones.
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file')
   *
   * // Set to rw-r--r--
   * await p.setPermissions({ mode: 0o644 })
   *
   * // Add write permission for all => rw-rw-rw-
   * await p.setPermissions({ all: { read: true, write: true } }, { operation: 'overlay' })
   *
   * // Remove write permission for others => rw-rw-r--
   * await p.setPermissions({ others: { write: true } }, { operation: 'clear' })
   * ```
   */
  async setPermissions(spec: FsPermissionSpec, opts?: { operation: 'assign' | 'overlay' | 'clear' }) : Promise<void> {
    const { operation = 'assign' } = opts ?? {}

    const mode = Self.#buildMode(spec)

    const current = operation === 'assign' ? 0 : (await fs.stat(this.path_)).mode & 0o777
    const final =
      operation === 'overlay' ? current | mode :
      operation === 'clear'   ? current & ~mode :
      mode

    await fs.chmod(this.path_, final)
  }

  /**
   * Create a directory at this path.
   * @param opts.recursive - If true, create parent directories as needed.
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/dir')
   * await p.mkdir({ recursive: true }) // Creates the directory and any needed parent directories
   * ```
   */
  async mkdir(opts?: { recursive?: boolean }): Promise<void> {
    const { recursive = false } = opts ?? {}
    await fs.mkdir(this.path_, { recursive })
  }

  /**
   * Read the contents of the file as a string.
   * @param opts.encoding - The file encoding (default: 'utf8').
   * @returns The file contents as a string.
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file.txt')
   * const content = await p.read()
   * ```
   */
  async read(opts?: { encoding: BufferEncoding }): Promise<string> {
    const { encoding = 'utf8' } = opts ?? {}
    return await fs.readFile(this.path_, { encoding })
  }

  /**
   * Writes content to the file, replacing or appending to the existing content.
   *
   * @param content - The content to write (string or Uint8Array).
   * @param opts.mkdirIfNeeded - If true, create parent directories as needed (default: false).
   * @param opts.append - If true, append to the file instead of replacing it (default false).
   * @param opts.encoding - The file encoding (default: 'utf8' if content is string).
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file.txt')
   * await p.write('Hello', { mkdirIfNeeded: true }) // Creates the file with content, creating parent directories as needed
   * await p.write(', world!', { append: true })     // Appends to the file
   * ```
   */
  async write( content: string | Uint8Array, opts?: { mkdirIfNeeded?: boolean, append?: boolean, encoding?: BufferEncoding }): Promise<void> {
    const { mkdirIfNeeded = false, append = false, encoding = typeof content === 'string' ? 'utf8' : undefined } = opts ?? {}
    await this.#mkdirParentIfNeeded(mkdirIfNeeded)
    await fs.writeFile(this.path_, content, {
      encoding,
      flag: append ? 'a' : 'w'
    })
  }

  /**
   * Updates the file's access and modification times, or create an empty file if it does not exist.
   *
   * @param opts.mkdirIfNeeded - If true, create parent directories as needed (default: false).
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file.txt')
   * await p.touch({ mkdirIfNeeded: true }) // Creates the file if it does not exist, creating parent directories as needed
   * ```
   */
  async touch(opts?: { mkdirIfNeeded?: boolean }): Promise<void> {
    const { mkdirIfNeeded = false } = opts ?? {}
    if (mkdirIfNeeded) {
      await this.parent.mkdir({ recursive: true })
    }

    try {
      const now = new Date()
      await fs.utimes(this.path_, now, now)
    } catch (err) {
      if (Self.#errnoExceptionCode(err, 'ENOENT')) {
        await fs.writeFile(this.path_, '')
      } else {
        throw err
      }
    }
  }
  
  /**
   * Creates a readable stream for the file.
   *
   * @param opts.start - The starting byte position (inclusive).
   * @param opts.end - The ending byte position (inclusive).
   * @returns A readable stream for the file.
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file.txt')
   * const stream = await p.readStream()
   * stream.pipe(process.stdout) // Print file contents to stdout
   * ```
   */
  async readStream(opts?: { start?: number, end?: number}): Promise<ReadStream> {
    return (await fs.open(this.path_)).createReadStream(opts)
  }

  /**
   * Removes the file or directory.
   *
   * @param opts.throwIfMissing - If true, throw an error if the path does not exist (default: false).
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file.txt')
   * await p.remove() // Removes the file if it exists, does nothing if it does not exist
   * await p.remove({ throwIfMissing: true }) // Removes the file, throws an error if it does not exist
   * ```
   */
  async remove(opts?: { throwIfMissing?: boolean }): Promise<void> {
    const { throwIfMissing = false } = opts ?? {}
    await fs.rm(this.path_, {
      recursive: true,
      force: !throwIfMissing
    })
  }

  /**
   * Move (rename) the file or directory to a new path.
   *
   * @param to - The target path to move to.
   * @param opts.intoDir - If true, treat `to` as a directory and move the file into it (default: false).
   * @param opts.mkdirIfNeeded - If true, create parent directories of the target path as needed (default: false).
   *
   * @example
   * ```ts
   * const p1 = new FsPath('/path/to/file.txt')
   * const p2 = new FsPath('/new/path/to/file.txt')
   * await p1.moveTo(p2, { mkdirIfNeeded: true }) // Renames (moves) the file, creating parent directories as needed
   * ```
   */
  async moveTo(to: AbsolutePath, opts?: { intoDir?: boolean, mkdirIfNeeded?: boolean }): Promise<void> {
    const { intoDir = false, mkdirIfNeeded = false } = opts ?? {}
    const target = new FsPath(to)
    const destination = intoDir ? target.join(this.filename) : target
    await destination.#mkdirParentIfNeeded(mkdirIfNeeded)
    await fs.rename(this.path_, destination.path_)
  }
  
  
  /**
   * Copies the file to a new path.
   * @param to - The target path to copy to.
   * @param opts.intoDir - If true, treat `to` as a directory and copy the file into it (default: false).
   * @param opts.mkdirIfNeeded - If true, create parent directories of the target path as needed (default: false).
   *
   * @example
   * ```ts
   * const p1 = new FsPath('/path/to/file.txt')
   * const p2 = new FsPath('/new/path/to/file.txt')
   * await p1.copyTo(p2, { mkdirIfNeeded: true }) // Copies the file, creating parent directories as needed
   * 
   * const dir = new FsPath('/new/path/')
   * await p1.copyTo(dir, { intoDir: true, mkdirIfNeeded: true }) // Copies the file into the directory, creating parent directories as needed
   * ```
   */
  async copyTo(to: AbsolutePath, opts?: { intoDir?: boolean, mkdirIfNeeded?: boolean }): Promise<void> {
    const { intoDir = false, mkdirIfNeeded = false } = opts ?? {}
    const target      = new FsPath(to)
    const destination = intoDir ? target.join(this.filename) : target
    await destination.#mkdirParentIfNeeded(mkdirIfNeeded)
    await fs.copyFile(this.path_, destination.path_)
  }

  /**
   * Reads the contents of the directory.
   *
   * @param opts.allowMissing - If true, return an empty array if the directory does not exist, rather than throwing an error (default: false).
   * @param opts.onlyFiles - If true, only include files in the result (default: false).
   * @param opts.onlyDirs - If true, only include directories in the result (default: false).
   * @param opts.includeDotfiles - If true, include dotfiles in the result (default: true).
   *
   * @returns An array of {@link FsPath} objects representing the entries in the directory.
   *
   * @example
   * ```ts
   * const dir = new FsPath('/path/to/dir')
   * const paths = await dir.readdir()
   * for (const path of paths) {
   *   console.log(path.filename.toString())
   * }
   * ```
   */
  async readdir(opts?: FsReaddirOptions): Promise<FsPath[]> {
    const { allowMissing = false, ...filterOptions } = opts ?? {}
    try {
      const entries = await fs.readdir(this.path_)
      const paths = entries.map(e => this.join(e))
      return await Self.#asyncFilter(paths, p => p.#pathFilerPredicate(filterOptions))
    } catch (err: unknown) {
      if (allowMissing && Self.#errnoExceptionCode(err, 'ENOENT')) {
        return []
      }
      throw err
    }
  }

  /**
   * Finds files and directories matching a glob pattern within this directory.
   *
   * Uses [fast-glob](https://www.npmjs.com/package/fast-glob) under the hood.
   *
   * @param pattern - The glob pattern to match
   * @param opts.allowMissing - If true, return an empty array if the directory does not exist, rather than throwing an error (default: false).
   * @param opts.onlyFiles - If true, only include files in the result (default: false).
   * @param opts.onlyDirs - If true, only include directories in the result (default: false).
   * @param opts.includeDotfiles - If true, include dotfiles in the result (default: true).
   *
   * @returns An array of {@link FsPath} objects representing the matching
   * entries.
   *
   * @example
   * ```ts
   * const dir = new FsPath('/path/to/dir')
   * const paths = await dir.glob('**\/*.js')
   * for (const path of paths) {
   *   console.log(path.filename.toString())
   * }
   * ```
   */
  async glob(pattern: string | Filename, opts?: FsReaddirOptions): Promise<FsPath[]> {
    const { allowMissing = false, includeDotfiles, onlyDirs, onlyFiles } = { ...FilterOptionDefaults, ...opts }
    // fs-glob will return an empty array if the directory does not exist,
    // but we want to throw ENOENT unless allowMissing is set.
    try {
      void await fs.readdir(this.path_)
    } catch (err: unknown) {
      if (allowMissing && Self.#errnoExceptionCode(err, 'ENOENT')) {
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

  /////////////////////////////////////////////////////////////////////////////
  //
  //  --- Disposal ---
  //
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Marks this path as disposable, meaning the file or directory will
   * be automatically deleted when no longer needed.
   *
   * Disposable paths will be disposed of in one of three circumstances,
   * whichever comes first:
   *
   * * Via `using` -- The path is deleted as soon as FsPath object goes out
   *   of scope.  This is the most immediate and reliable.
   *
   * * Disposal when the {@link FsPath} object is garbage collected. As always,
   *   there's no knowing when or if this will happen.
   *
   * * Disposal on process exit. 
   *
   * ⚠️  Disposal is best-effort; it may fail due to permissions or be
   * skipped if the process exits abnomrally.  Failures during disposal are
   * silently ignored.
   *
   * @example
   * ```ts
   * {
   *   using p = new FsPath('/path/to/tempfile.txt').disposable()
   *   await p.write('data') // Creates the file
   *   ...
   * } // The file is automatically removed when p goes out of scope
   *
   * const p2 = new FsPath('/path/to/tempfile2.txt').disposable()
   * // The file will be removed eventually, on gc or process exit
   * ```
   *
   * @returns This instance, for chaining.
   */
  disposable(): this {
    const path = this.toString()
    Self.#initOnExitHandler()
    Self.#disposablePaths.add(path)
    Self.#finalizationRegistry.register(this, path)
    return this
  }

  /**
   * Cancels automatic disposal for this path.   
   *
   * @example
   * ```ts
   * {
   *   using p = new FsPath('/path/to/tempfile.txt').disposable()
   *   await p.write('data') // Creates the file
   *   ...
   *   p.retain() // The file will not be removed when p goes out of scope
   * }
   * ```
   *
   * @returns This instance, for chaining.
   */
  retain(): this {
    const path = this.toString()
    Self.#disposablePaths.delete(path)
    Self.#finalizationRegistry.unregister(this)
    return this
  }

  /** @hidden */
  [Symbol.dispose](): void {
    if (Self.#disposablePaths.has(this.path_)) {
      Self.#dispose(this.path_)
      Self.#disposablePaths.delete(this.path_)
      Self.#finalizationRegistry.unregister(this)
    }
  }


  /////////////////////////////////////////////////////////////////////////////
  //
  //  --- Internal ---
  //
  /////////////////////////////////////////////////////////////////////////////


  //
  // --- file creation helpers ---
  //

  async #mkdirParentIfNeeded(mkdirIfNeeded: boolean): Promise<void> {
    if (mkdirIfNeeded) {
      await this.parent.mkdir({ recursive: true })
    }
  }

  //
  // --- Filtering support ---
  //

  async #pathFilerPredicate(opts?: FsPathFilterOptions): Promise<boolean> {
    const { onlyFiles, onlyDirs, includeDotfiles } = { ...FilterOptionDefaults, ...opts }

    if (!includeDotfiles && this.filename.toString().startsWith('.')) { return false }
    if (!onlyFiles && !onlyDirs)                                      { return true }

    const stat = await this.stat()

    if (onlyFiles && !stat.isFile())     { return false }
    if (onlyDirs && !stat.isDirectory()) { return false }

    return true
  }

  static async #asyncFilter<T>(array: readonly T[], predicate: (value: T) => Promise<boolean>): Promise<T[]> {
    const results = await Promise.all(array.map(predicate))
    return array.filter((_, i) => results[i])
  }

  //
  // --- Error helpers ---
  //

  static #errnoExceptionCode(err: unknown, code: string): boolean {
    return err instanceof Error && 'code' in err && err.code == code
  }

  //
  // --- Permission mode builder ---
  //

  static #buildMode(spec: FsPermissionSpec): number {
    const toOctalDigit = (flags: FsPermissionFlags = {}): number =>                 { return (flags.read ? 4 : 0) | (flags.write ? 2 : 0) | (flags.execute ? 1 : 0) }
    const combineModes = (user: number, group: number, others: number): number => { return (user << 6) | (group << 3) | others }

    if ('mode' in spec) {
      return spec.mode
    } else if ('all' in spec) {
      const mode = toOctalDigit(spec.all)
      return combineModes(mode, mode, mode)
    } else {
      return combineModes(toOctalDigit(spec.user), toOctalDigit(spec.group), toOctalDigit(spec.others))
    }
  }

  //
  // --- Disposal support ---
  //
  
  static #disposablePaths      = new Set<string>()
  static #onExitRegistered     = false
  static #finalizationRegistry = new FinalizationRegistry((path: string) => { Self.#dispose(path) })

  static #dispose(path: string): void {
    rmSync(path, { recursive: true, force: true })
  }

  static #initOnExitHandler(): void {
    if (!Self.#onExitRegistered) {
      process.on('exit', () => Self.#disposablePaths.forEach(path => Self.#dispose(path)))
      Self.#onExitRegistered = true
    }
  }


}
const Self = FsPath
