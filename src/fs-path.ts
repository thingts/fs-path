import { glob } from 'tinyglobby'
import type { Filename, RelativePath } from '@thingts/path'
import type { ReadStream, Stats } from 'node:fs'
import { AbsolutePath } from '@thingts/path'
import { constants, promises as fs, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

/**
 * Options for filtering paths, used by {@link FsPath.readDirectory | `readDirectory()`} and {@link FsPath.glob | `glob()`}.
 */
interface FsPathFilterOptions {
  /** If true, only include files in the result. (Default: false) */
  onlyFiles?:       boolean

  /** If true, only include directories in the result. (Default: false) */
  onlyDirs?:        boolean

  /** If true, include dotfiles in the result. (Default: true) */
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

export type FsFileMode     = 'read' | 'write' | 'execute'
export type FsFileModeSpec = FsFileMode | FsFileMode[] | FsPermissionFlags


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
  user?:   FsFileModeSpec
  /** Permissions for user */
  group?:  FsFileModeSpec
  /** Permissions for user */
  others?: FsFileModeSpec
} | {
  /** Permissions for all (user, group and others) */
  all:    FsFileModeSpec // shorthand for user + group + others
}

/**
 * Options for reading directories, used by {@link FsPath.readDirectory | `readDirectory()`} and
 * {@link FsPath.glob | `glob()`}.
 */
export interface FsReadDirectoryOptions extends FsPathFilterOptions {
  /**
   * If true, return an empty array if the directory does not exist, rather
   * than throwing an error. (Default: false)
   */
  allowMissing?: boolean
}

/**
 * @deprecated Use FsReadDirectoryOptions instead.
 * @hidden
 */
export type FsReaddirOptions = FsReadDirectoryOptions 

/**
 * Represents an absolute filesystem path (i.e. a path starting at the root with
 * a leading separator), and provides methods for path resolution,
 * manipulation and queries as well as (async) filesystem operations.
 *
 * {@link FsPath} instances are normalized and immutable.
 *
 * {@link FsPath} extends {@link AbsolutePath} of
 * [`@thingts/path`](https://github.com/thingts/path), but with added methods
 * for filesystem access.
 *
 * Having an {@link FsPath} instance does not imply that a file or directory
 * exists at that path in the filesystem; use {@link exists | `exists()`}, {@link isFile | `isFile()`},
 * {@link isDirectory | `isDirectory()`} or {@link stat | `stat()`} to check for existence,
 * and use {@link write | `write()`}, {@link touch | `touch()`}, {@link makeDirectory | `makeDirectory()`},
 * or {@link makeTempDirectory | `makeTempDirectory()`} to create files or directories.
 *
 * Methods that create or modify files or directories return a `Promise<this>`,
 * allowing for chaining.
 *
 * FsPath also supports creating temporary files or directories; see {@link disposable | `disposable()`}
 *
 * ⚠️  In the documentation below that is inherited from {@link AbsolutePath},
 * examples that refer to `AbsolutePath` apply equally to `FsPath` -- in
 * particular, the path manipulation methods like {@link join | `join()`} return
 * `FsPath` instances, not `AbsolutePath` instances.
 *
 *
 * @example
 * ```ts
 * const p = new FsPath('/path/to/file.txt')
 * await p.write('Hello, world!', { makeParents: true })
 * const content = await p.read() // Reads the file content
 *
 * // With chaining
 * const p2 = await new FsPath('/path/to/another.txt').write('data')
 *
 * // Multiple chaining is possible, though less ergonomic
 * const p3 = await new FsPath('/path/to/yet-another.txt').write('data').then(p => p.setPermissions({ mode: 0o644 }))
 *
 * const p4 = await (await new FsPath('/path/to/yet-another.txt').write('data')).setPermissions({ mode: 0o644 })
 * ```
 *
 * @property resolve See [`AbsolutePath.resolve`](https://thingts.github.io/path/classes/AbsolutePath.html#resolve)
 * @property replaceStem See [`AbsolutePath.replaceStem`](https://thingts.github.io/path/classes/AbsolutePath.html#replaceStem)
 * @property replaceExtension See [`AbsolutePath.replaceExtension`](https://thingts.github.io/path/classes/AbsolutePath.html#replaceExtension)
 *
 */
export class FsPath extends AbsolutePath {

  /**
   * Creates a new {@link FsPath} instance
   *
   * If given a relative path, it is resolved against the current working
   * directory. The path is always normalized.
   *
   * Creating an {@link FsPath} instance does not imply that the path
   * exists on the filesystem; use {@link exists | `exists()`}, {@link isFile | `isFile()`},
   * {@link isDirectory | `isDirectory()`} or {@link stat | `stat()`} to check for existence,
   * and use {@link write | `write()`}, {@link touch | `touch()`}, {@link makeDirectory | `makeDirectory()`},
   * or {@link makeTempDirectory | `makeTempDirectory()`} to create files or directories.
   *
   * @example
   * ```ts
   * new FsPath('/project/demos')          // Absolute path
   * new FsPath('/project//src/../demos/') // normalized => /project/demos
   * new FsPath('project/demos')           // Resolves against cwd
   * ```
   */
  constructor(path: string | FsPath | AbsolutePath | RelativePath | Filename) {
    const str = String(path)
    if (Self.#isAbsolutePathString(String(path))) {
      super(str)
    } else {
      super(FsPath.cwd().join(str))
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
   * The directory is marked as {@link disposable}.
   *
   * @see {@link disposable | `disposable()`}
   */

  /**
   * Creates a new temporary directory
   *
   * By default, the directory is created under the system temporary
   * directory (see [`os.tmpdir`](https://nodejs.org/api/os.html#ostmpdir))
   *
   * The resulting directory name will begin with the given `prefix`
   * (default: `'temp-'`) followed by a unique suffix, as per
   * [`fs.mkdtemp`](https://nodejs.org/api/fs.html#fsmkdtempprefix-options-callback).
   *
   * The returned FsPath is marked as {@link disposable}, meaning it will be
   * automatically removed when no longer needed (e.g. when used with a
   * `using` declaration, on garbage collection, or on process exit).
   *
   * @param opts.prefix - Prefix for the generated directory name.  `(Default: `'temp-'`)
   * @param opts.parent - The parent directory in which to create the
   *   temporary directory. Defaults to the system temporary directory.
   * @param opts.makeParents - If true, create the parent directory if it
   *   does not exist. (Default: false)
   *
   * @example
   * ```ts
   * // Default: create under system temp directory
   * const dir = await FsPath.makeTempDirectory()
   *
   * // With custom prefix
   * const dir2 = await FsPath.makeTempDirectory({ prefix: 'build-' })
   *
   * // Under a custom parent directory
   * const dir3 = await FsPath.makeTempDirectory({
   *   parent: '/projects/demo/.tmp',
   *   prefix: 'build-',
   *   makeParents: true
   * })
   * ```
   *
   * @returns A Promise resolving to a new {@link FsPath} representing the
   *   temporary directory, marked as {@link disposable}.
   *
   * @see {@link disposable | `disposable()`}
   */
  static async makeTempDirectory(opts?: {
    parent?: string | FsPath | AbsolutePath
    prefix?: string
    makeParents?: boolean
  }): Promise<FsPath> {
    const { parent = tmpdir(), prefix = 'temp-', makeParents = false } = opts ?? {}

    const base = new FsPath(parent)
    if (makeParents) {
      await base.makeDirectory({ makeParents: true })
    }
    return new FsPath(await fs.mkdtemp(base.join(prefix).toString())).disposable()
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
   * Checks the accessibility of the path with the specified mode(s).
   *
   * Note that a successful access check does not guarantee that a
   * subsequent operation will succeed, since the filesystem state may
   * change in between.
   *
   * @param modes - The access mode(s) to check.  Can be a {@link
   * FsFileMode} string, an array of {@link FsFileMode} strings, or an
   * {@link FsPermissionFlags} object specifying read/write/execute
   * booleans.  An empty spec (`[]` or `{}`) checks for
   * existence.
   *
   * @param opts.throw - If true, rethrows the underlying filesystem error
   * if the path is not accessible with the specified mode(s). (Default: false)
   *
   * @returns A Promise resolving to true if the path is accessible with
   * the specified mode(s), or false if it is not (and `opts.throw` is
   * false).
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file')
   * const canRead = await p.access('read')
   * const canReadWrite = await p.access(['read', 'write'])
   * const canExecute = await p.access({ execute: true })
   * ```
   */
  async access(modes: FsFileModeSpec, opts?: { throw?: boolean }): Promise<boolean> {

    const { throw: throwIfInaccessible = false } = opts ?? {}

    const mode = Self.#accessMode(modes)
    try { 
      await fs.access(this.path_, mode)
    } catch (err) {
      if (throwIfInaccessible) {
        throw err
      }
      return false
    }
    return true
  }

  /**
   * Sets the permission mode of the path.
   * 
   * @param spec - The permission specification.  Can be the numeric mode,
   * or an object specifying user/group/others permissions; each category
   * can be specified with a {@link FsFileMode} string, an array of {@link
   * FsFileMode} strings, or an {@link FsPermissionFlags} object specifying
   * read/write/execute booleans.
   *
   * @param opts.operation - The operation to perform: assign the
   * permissions exactly (default), overlay the permissions on top of the
   * existing ones, or clear the specified permissions from the existing
   * ones.
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file')
   *
   * // Set to rw-r--r--
   * await p.setPermissions({ mode: 0o644 })
   *
   * // Add write permission for all => rw-rw-rw-
   * await p.setPermissions({ all: ['read',  'write'] }, { operation: 'overlay' })
   *
   * // Remove write permission for others => rw-rw-r--
   * await p.setPermissions({ others: { write: true } }, { operation: 'clear' })
   * ```
   *
   * @returns A Promise resolving to this instance, for chaining.
   */
  async setPermissions(spec: FsPermissionSpec, opts?: { operation?: 'assign' | 'overlay' | 'clear' }) : Promise<this> {
    const { operation = 'assign' } = opts ?? {}

    const mode = Self.#buildPermissionMode(spec)

    const current = operation === 'assign' ? 0 : (await fs.stat(this.path_)).mode & 0o777
    const final =
      operation === 'overlay' ? current | mode :
      operation === 'clear'   ? current & ~mode :
      mode

    await fs.chmod(this.path_, final)
    return this
  }

  /**
   * Create a directory at this path.
   * @param opts.makeParents - If true, create parent directories as needed.
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/dir')
   * await p.makeDirectory({ makeParents: true }) // Creates the directory and any needed parent directories
   * ```
   *
   * @returns A Promise resolving to this instance, for chaining.
   */
  async makeDirectory(opts?: { makeParents?: boolean }): Promise<this> {
    const { makeParents = false } = opts ?? {}
    await fs.mkdir(this.path_, { recursive: makeParents })
    return this
  }

  /**
   * Read the contents of the file as a string.
   * @param opts.encoding - The file encoding. (Default: 'utf8')
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
   * @param opts.makeParents - If true, create parent directories as needed. (Default: false)
   * @param opts.append - If true, append to the file instead of replacing it. (Default: false)
   * @param opts.encoding - The file encoding. (Default: 'utf8' if content is string)
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file.txt')
   * await p.write('Hello', { makeParents: true }) // Creates the file with content, creating parent directories as needed
   * await p.write(', world!', { append: true })     // Appends to the file
   * ```
   *
   * @returns A Promise resolving to this instance, for chaining.
   */
  async write( content: string | Uint8Array, opts?: { makeParents?: boolean, append?: boolean, encoding?: BufferEncoding }): Promise<this> {
    const { makeParents = false, append = false, encoding = typeof content === 'string' ? 'utf8' : undefined } = opts ?? {}
    await this.#makeParents(makeParents)
    await fs.writeFile(this.path_, content, {
      encoding,
      flag: append ? 'a' : 'w'
    })
    return this
  }

  /**
   * Updates the file's access and modification times, or create an empty file if it does not exist.
   *
   * @param opts.makeParents - If true, create parent directories as needed. (Default: false)
   *
   * @example
   * ```ts
   * const p = await new FsPath('/path/to/file.txt')
   * await p.touch({ makeParents: true }) // Creates the file if it does not exist, creating parent directories as needed
   * ```
   *
   * @returns A Promise resolving to this instance, for chaining.
   */
  async touch(opts?: { makeParents?: boolean }): Promise<this> {
    const { makeParents = false } = opts ?? {}
    await this.#makeParents(makeParents)
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
    return this
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
   * @param opts.throwIfMissing - If true, throw an error if the path does not exist. (Default: false)
   *
   * @example
   * ```ts
   * const p = new FsPath('/path/to/file.txt')
   * await p.remove() // Removes the file if it exists, does nothing if it does not exist
   * await p.remove({ throwIfMissing: true }) // Removes the file, throws an error if it does not exist
   * ```
   *
   * @returns A Promise resolving to this instance, for chaining. (The path object remains valid even though the file or directory has been removed.)
   */
  async remove(opts?: { throwIfMissing?: boolean }): Promise<this> {
    const { throwIfMissing = false } = opts ?? {}
    await fs.rm(this.path_, {
      recursive: true,
      force: !throwIfMissing
    })
    return this
  }

  /**
   * Move (rename) this file or directory to a new location.
   *
   * @param to - The target path to move to.
   * @param opts.intoDir - If true, treat `to` as a directory and move the file into it. (Default: false)
   * @param opts.makeParents - If true, create parent directories of the target path as needed. (Default: false)
   *
   * @example
   * ```ts
   * const p1 = new FsPath('/path/to/file.txt')
   * const p2 = new FsPath('/new/path/to/file.txt')
   * await p1.moveTo(p2, { makeParents: true }) // Renames (moves) the file, creating parent directories as needed
   *
   * const dir = new FsPath('/new/path/')
   * const p3 = await p2.moveTo(dir, { intoDir: true, makeParents: true }) // Moves the file into the directory
   * console.log(p3.toString()) // /new/path/file.txt
   * ```
   *
   * @returns A Promise resolving to a new {@link FsPath} for the final path (either `to` or `to.join(this.filename)` based on `opts.intoDir`)
   */
  async moveTo(to: AbsolutePath, opts?: { intoDir?: boolean, makeParents?: boolean }): Promise<FsPath> {
    const { intoDir = false, makeParents = false } = opts ?? {}
    const target = new FsPath(to)
    const destination = intoDir ? target.join(this.filename) : target
    await destination.#makeParents(makeParents)
    await fs.rename(this.path_, destination.path_)
    return destination
  }
  
  
  /**
   * Copies this file or directory to a new location.
   *
   * By default:
   * - Files are copied and will overwrite an existing file at the destination.
   * - Directories require `recursive: true`; otherwise an error is thrown.
   * - When copying directories recursively:
   *   - If the destination does not exist, it is created.
   *   - If the destination exists, contents are merged.
   *   - Existing files are overwritten unless `overwrite: false` is specified.
   *
   * @param to - The target path to copy to.
   * @param opts.intoDir - If true, treat `to` as a directory and copy this path into it
   *   (i.e. `to.join(this.filename)`). (Default: false)
   * @param opts.makeParents - If true, create parent directories of the target path as needed.
   *   (Default: false)
   * @param opts.recursive - If true, allow copying directories recursively.
   *   Required when the source is a directory. (Default: false)
   * @param opts.overwrite - If false, do not overwrite existing files; instead throw an error
   *   if a destination path already exists. (Default: true)
   *
   * @example
   * ```ts
   * const src = new FsPath('/path/to/file.txt')
   * const dest = new FsPath('/new/path/to/file.txt')
   *
   * await src.copyTo(dest) // overwrites dest if it exists
   *
   * const dir = new FsPath('/new/path/')
   * await src.copyTo(dir, { intoDir: true }) // copies to /new/path/file.txt
   *
   * const srcDir = new FsPath('/path/to/dir')
   * await srcDir.copyTo('/backup/dir', { recursive: true }) // copies entire directory tree
   *
   * await src.copyTo(dest, { overwrite: false }) // throws if dest exists
   * ```
   *
   * @returns A Promise resolving to a new {@link FsPath} for the path of the copy
   *   (either `to` or `to.join(this.filename)` based on `opts.intoDir`)
   */
  async copyTo(
    to: AbsolutePath,
    opts?: {
      intoDir?: boolean
      makeParents?: boolean
      recursive?: boolean
      overwrite?: boolean
    }
  ): Promise<FsPath> {
    const {
      intoDir = false,
        makeParents = false,
        recursive = false,
        overwrite = true
    } = opts ?? {}

    const target      = new FsPath(to)
    const destination = intoDir ? target.join(this.filename) : target

    await destination.#makeParents(makeParents)

    await fs.cp(this.path_, destination.path_, {
      recursive,
      force: overwrite,
      errorOnExist: !overwrite
    })

    return destination
  }

  /**
   * Reads the contents of the directory.
   *
   * @param opts.allowMissing - If true, return an empty array if the directory does not exist, rather than throwing an error. (Default: false)
   * @param opts.onlyFiles - If true, only include files in the result. (Default: false)
   * @param opts.onlyDirs - If true, only include directories in the result. (Default: false)
   * @param opts.includeDotfiles - If true, include dotfiles in the result. (Default: true)
   *
   * @returns An array of {@link FsPath} objects representing the entries in the directory.
   *
   * @example
   * ```ts
   * const dir = new FsPath('/path/to/dir')
   * const paths = await dir.readDirectory()
   * for (const path of paths) {
   *   console.log(path.filename.toString())
   * }
   * ```
   */
  async readDirectory(opts?: FsReadDirectoryOptions): Promise<FsPath[]> {
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
   * @deprecated Use readDirectory instead.
   * @hidden
   */
  get readdir(): (opts?: FsReadDirectoryOptions) => Promise<FsPath[]> { return this.readDirectory.bind(this) } // alias

  /**
   * Finds files and directories matching a glob pattern within this directory.
   *
   * Uses [tinyglobby](https://www.npmjs.com/package/tinyglobby) under the hood.
   *
   * @param pattern - The glob pattern to match
   * @param opts.allowMissing - If true, return an empty array if the directory does not exist, rather than throwing an error. (Default: false)
   * @param opts.onlyFiles - If true, only include files in the result. (Default: false)
   * @param opts.onlyDirs - If true, only include directories in the result. (Default: false)
   * @param opts.includeDotfiles - If true, include dotfiles in the result. (Default: true)
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
  async glob(pattern: string | Filename, opts?: FsReadDirectoryOptions): Promise<FsPath[]> {
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
    const results = await glob(String(pattern), {
      cwd:               this.path_,
      absolute:          true,
      dot:               includeDotfiles,
      onlyDirectories:   onlyDirs,
      onlyFiles:         onlyFiles,
      expandDirectories: false
    })
    return results.map(p => new FsPath(p))
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  //  --- Disposal ---
  //
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Create an {@link FsPath} instance marked as as disposable, meaning the
   * file or directory will be automatically deleted when no longer needed.
   *
   * Disposable paths will be disposed (i.e. the file or directory will be
   * deleted) in one of three circumstances, whichever comes first:
   *
   * * Via [the `using`
   *   declaration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using)
   *   -- the path is disposed as soon as the declared variable goes out of scope.
   *   This is the most immediate and reliable.
   *
   * * Disposal when the {@link FsPath} object is garbage collected. As always,
   *   there's no knowing when or if this will happen.
   *
   * * Disposal on process exit. 
   *
   * ⚠️  Disposal is best-effort; it may fail due to permissions or be
   * skipped if the process exits abnormally.  Failures during disposal are
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
   * await p2.write('data')
   * // The file will be removed eventually, on gc or process exit
   * ```
   *
   * @returns A new instance of this path, marked as disposable.
   *
   * @see {@link retain | `retain()`}
   */
  disposable(): this {
    const clone = new FsPath(this) as this
    clone.#registerDisposable()
    clone[Symbol.dispose] = clone.disposeInstance // eslint-disable-line @typescript-eslint/unbound-method
    return clone
  }

  /**
   * Cancels disposal for this instance.   
   *
   * If this instance was created via {@link disposable | `disposable()`}, so
   * that file or directory would be automatically removed, calling `retain()`
   * prevents that removal.
   *
   * @returns A new instance of this path, unmarked as disposable.
   *
   * ⚠️ The old instance remains valid and can still be used normally.
   * Technically the old instance continues to to be marked as disposable,
   * but its disposal will now be a no-op.
   *
   *
   * @example
   * ```ts
   * {
   *   using p = new FsPath('/path/to/tempfile.txt').disposable()
   *   await p.write('data') // Creates the file
   *   ...
   *   p.retain() // The file will *not* be removed when p goes out of scope
   * }
   *
   * const p2 = new FsPath('/path/to/tempfile2.txt').disposable()
   * await p2.write('data')
   * p2.retain() // the file will *not* be automatically removed
   * ```
   *
   * @returns A new instance of this path, not marked as disposable.
   *
   * @see {@link disposable | `disposable()`}
   */
  retain(): this {
    this.#unregisterDisposable()
    return new FsPath(this) as this
  }


  /////////////////////////////////////////////////////////////////////////////
  //
  //  --- Internal ---
  //
  /////////////////////////////////////////////////////////////////////////////


  //
  // --- file creation helpers ---
  //

  async #makeParents(makeParents: boolean): Promise<void> {
    if (makeParents) {
      await this.parent.makeDirectory({ makeParents: true })
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
  // --- File mode builders ---
  //

  static #buildPermissionMode(spec: FsPermissionSpec): number {
    const combineModes = (user: number, group: number, others: number): number => (user << 6) | (group << 3) | others

    if ('mode' in spec) {
      return spec.mode
    } else if ('all' in spec) {
      const mode = Self.#permissionMode(spec.all)
      return combineModes(mode, mode, mode)
    } else {
      return combineModes(Self.#permissionMode(spec.user), Self.#permissionMode(spec.group), Self.#permissionMode(spec.others))
    }
  }

  //
  // Returns the octal representation of file permissions for a given
  // FsFileModeSpec (e.g. 'read', ['read', 'write'], or { read: true,
  // write: true })
  // 
  static #permissionMode(spec?: FsFileModeSpec): number {
    const flags = Self.#normalizeModeSpec(spec)
    return (flags.read ? 4 : 0) | (flags.write ? 2 : 0) | (flags.execute ? 1 : 0)
  }

  //
  // Returns the binary representation of access permissions for a given
  // FsFileModeSpec (e.g. 'read', ['read', 'write'], or { read: true,
  // write: true })
  static #accessMode(spec?: FsFileModeSpec): number {
    const flags = Self.#normalizeModeSpec(spec)
    let mode = 0
    if (flags.read)    { mode |= constants.R_OK }
    if (flags.write)   { mode |= constants.W_OK }
    if (flags.execute) { mode |= constants.X_OK }
    if (mode === 0) { mode = constants.F_OK }
    return mode
  }

  //
  // Normalizes a FsFileModeSpec (e.g. 'read', ['read', 'write'], or { read: true, write: true }) to FsPermissionFlags ({ read: true, write: true })
  //
  static #normalizeModeSpec(modes?: FsFileModeSpec): FsPermissionFlags {
    const modesToFlags = (modes: readonly FsFileMode[]): FsPermissionFlags => {
      const flags: FsPermissionFlags = {}
      for (const mode of modes) {
        if (mode === 'read') {
          flags.read = true
        } else if (mode === 'write') {
          flags.write = true
        } else if (mode === 'execute') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
          flags.execute = true
        }
      }
      return flags
    }

    if (modes === undefined) {
      return {}
    } else if (typeof modes === 'string') {
      return modesToFlags([modes])
    } else if (Array.isArray(modes)) {
      return modesToFlags(modes)
    } else {
      return modes
    }
  }

  //
  // --- Disposal support ---
  //
  
  /** @hidden */
  [Symbol.dispose]!: () => void

  static #disposableRefs       = new Set<WeakRef<FsPath>>()
  static #onExitRegistered     = false
  static #finalizationRegistry = new FinalizationRegistry((path: string) => { Self.#rmPath(path) })

  #registerDisposable(): void {
    Self.#initOnExitHandler()
    Self.#disposableRefs.add(new WeakRef(this))
    Self.#finalizationRegistry.register(this, this.toString())
  }

  #unregisterDisposable(): void {
    const ref = this.#findDisposableRef()
    if (ref) { Self.#disposableRefs.delete(ref) }
    Self.#finalizationRegistry.unregister(this)
  }

  #findDisposableRef(): WeakRef<FsPath> | undefined {
    for (const ref of Self.#disposableRefs) {
      const obj = ref.deref()
      if (obj === undefined) { Self.#disposableRefs.delete(ref) } // clean up dead refs
      if (obj === this) {
        return ref
      }
    }
    return undefined
  }

  private disposeInstance(): void {
    const ref = this.#findDisposableRef()
    if (ref) {
      Self.#rmPath(this.toString())
      this.#unregisterDisposable()
    }
  }

  static #rmPath(path: string): void {
    try {
      rmSync(path, { recursive: true, force: true })
    } catch {
      // ignore errors during disposal
    }
  }

  static #initOnExitHandler(): void {
    if (!Self.#onExitRegistered) {
      process.on('exit', () => Self.#disposableRefs.forEach(ref => ref.deref()?.disposeInstance()))
      Self.#onExitRegistered = true
    }
  }

  static #isAbsolutePathString(path: string): boolean {
    // Could just check if path starts with '/', but this way we leverage
    // the existing validation in AbsolutePath.  (Which TBH just checks if
    // the path starts with '/')
    try {
      new AbsolutePath(path)
      return true
    } catch {
      return false
    }
  }

}
const Self = FsPath
