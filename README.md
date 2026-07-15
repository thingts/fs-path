# @thingts/fs-path

[![npm version](https://img.shields.io/npm/v/@thingts/fs-path.svg)](https://www.npmjs.com/package/@thingts/fs-path)
[![docs](https://img.shields.io/badge/docs-typedoc-blue)](https://thingts.github.io/fs-path/)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/thingts/fs-path/ci.yml)](https://github.com/thingts/fs-path/actions/workflows/ci.yml)
[![GitHub License](https://img.shields.io/github/license/thingts/fs-path)](LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@thingts/fs-path)](https://bundlephobia.com/package/@thingts/fs-path)


Type-safe, ergonomic package for working with paths and files in Node.js

## Why?

Instead of juggling raw strings with
[node:path](https://nodejs.org/api/path.html) and
[node:fs](https://nodejs.org/api/fs.html), this package makes file paths
**first-class citizens** in your code -- with type-safe manipulation and
convenient filesystem methods.

## Features

* Immutable, chainable path objects with type-safe operations
* Path normalization and resolution on construction
* Easy access to path parts (filename, stem, extension, parent, etc)
* Path transformations (replace stem/extension/parent, transform filename, etc)
* Path navigation (join, resolve, relativeTo, descendsFrom, etc)
* Async filesystem operations (exists, isFile, isDirectory, stat, read, write, makeDirectory, readDirectory, glob, etc)
* Temporary directory & file management

Together, these features give you a safer, more expressive way to work with
paths, files, and directories in Node.js

Under the hood, this package uses:

* [`@thingts/path`](https://github.com/thingts/path) for path manipulation
* [`node:fs/promises`](https://nodejs.org/api/fs/promises.html) for async filesystem operations
* [`tinyglobby`](https://www.npmjs.com/package/tinyglobby) for globbing

## Documentation

* See API reference at [https://thingts.github.io/fs-path/](https://thingts.github.io/fs-path/).
* See [CHANGELOG.md](./CHANGELOG.md) for release history and breaking changes.

## Overview

**@thingts/fs-path** provides a set of classes to represent and manipulate
filesystem paths.  All classes are immutable; any path manipulation
operation returns a new instance.

This package defines:

* [`FsPath`](https://thingts.github.io/fs-path/classes/FsPath.html) - An
  absolute filesystem path object, with path manipulation and filesystem
  operations.  `FsPath` extends
  [`AbsolutePath`](https://thingts.github.io/path/classes/AbsolutePath.html)
  from [`@thingts/path`](https://github.com/thingts/path) which provides
  path manipulation, and adds the filesystem operations.

For convenience this package also re-exports these two classes from
[`@thingts/path`](https://github.com/thingts/path):

* [`RelativePath`](https://thingts.github.io/path/classes/RelativePath.html) - Relative path object with path manipulation.
* [`Filename`](https://thingts.github.io/path/classes/Filename.html) - Filename object with file part manipulation.

The classes work together to maintain type safety and ergonomics.  For
example, the `.relativeTo()` method of `FsPath` returns a `RelativePath`
-- which would need to be joined to a base `FsPath` in order to
perform filesystem operations.

> ⚠️ Currently only POSIX-style paths are supported (e.g. `/foo/bar`).

> 🔧 This package supports most commonly used [`node:fs`](https://nodejs.org/api/fs.html) features & options.  But not all; contributions to expand functionality are welcome.


## Installation

```bash
npm install @thingts/fs-path
```

## Usage examples

This is a quick overview of the available operations. It does not show all possible options; for complete docs see the [API Reference](https://thingts.github.io/fs-path).

<!-- %%embed%% examples/overview.ts -->
```typescript
import { FsPath } from '@thingts/fs-path'

// #### Normalize & resolve on construction

const normalized = new FsPath('/foo/../bar/file.txt')
normalized.equals('/bar/file.txt') // → true

const resolved = new FsPath('relative/to/cwd.txt')
resolved.equals(FsPath.cwd().join('relative/to/cwd.txt')) // → true

// #### Path parts & transforms

const path = new FsPath('/bar/file.txt')
path.toString()              // → '/bar/file.txt'
path.filename                // → Filename('file.txt')
path.filename.toString()     // → 'file.txt'
path.stem                    // → 'file'
path.extension               // → '.txt'
path.parent                  // → FsPath('/bar')
path.segments                // → ['bar', 'file.txt']
path.replaceStem('report')                           // → FsPath('/bar/report.txt')
path.replaceExtension('.md')                         // → FsPath('/bar/file.md')
path.replaceParent('/other')                         // → FsPath('/other/file.txt')
path.replaceFilename('REPORT.MD')                    // → FsPath('/bar/REPORT.MD')
path.transformFilename(f => String(f).toUpperCase()) // → FsPath('/bar/FILE.TXT')

// #### Navigation

const base = new FsPath('/projects/demo')
base.join('src/index.ts')                  // → FsPath('/projects/demo/src/index.ts')
base.join('/src/index.ts')                 // → FsPath('/projects/demo/src/index.ts')
base.resolve('src/index.ts')               // → FsPath('/projects/demo/src/index.ts')
base.resolve('/src/index.ts')              // → FsPath('/src/index.ts')
base.descendsFrom(new FsPath('/projects')) // → true
base.parent.equals('/projects')            // → true
const rel = base.join('src/main.ts').relativeTo(base) // → RelativePath('src/main.ts')

// #### Filesystem operations

const dir = new FsPath('/projects/demo')
const file = dir.join('logs/app.log')

// Writing and reading
await file.write('start\n', { makeParents: true })
await file.write('listening\n', { append: true })
await file.read()                  // → 'start\nlistening\n'
await file.readBytes({ size: 16 }) // → Buffer containing first 16 bytes
await file.readStream()            // → Readable stream of file contents

// File info
await file.exists()       // → true
await file.isFile()       // → true
await file.isDirectory()  // → false
await file.parent.isDirectory() // → true
await file.access('read')             // → true
await file.access(['read', 'write'])  // → true
await file.stat()         // → fs.Stats object
await file.realPath()     // → FsPath of the real path (resolving symlinks)

// Directory operations
await dir.join('sub').makeDirectory()
const entries = await dir.readDirectory()  // → [FsPath, ...]
const logs    = await dir.glob('**/*.log') // → [FsPath, ...]

// File and directory manipulation
const backupDir  = new FsPath('/projects/backup')
const backupFile = backupDir.join('app.log')
await file.copyTo(backupFile, { makeParents: true })    // copy file
await file.copyTo(backupDir, { intoDir: true })         // copy into a directory
await dir.copyTo(backupDir, { recursive: true })        // copy a directory recursively
await file.copyTo(backupFile, { overwrite: false })     // throws if destination exists
await file.moveTo(backupFile, { overwrite: true })      // move file, overwriting if exists
await file.moveTo(backupDir, { intoDir: true })         // move into a directory
await file.remove()                                     // remove file
await file.setPermissions({ mode: 0o600 })              // set file permissions mode
await file.setPermissions({ user: ['read', 'write'] })  // set permissions symbolically
await file.touch()                                      // update file timestamps or create if not exists

// #### Temporary (a.k.a. disposable) files and directories

// Explicit resource management
{
    using tempDir  = await FsPath.makeTempDirectory()                  // returns disposable directory
    using tempFile = new FsPath('/projects/tempfile.txt').disposable() // register for disposal

    tempDir.exists()        // → true
    tempFile.write('data')  // create file

    // tempDir and tempFile are removed when they go out of scope
}

// Removed eventually, on gc or exit
const gcDir  = await FsPath.makeTempDirectory()
const gcFile = new FsPath('/projects/tempfile.txt').disposable()
```






## Related

* [@thingts/path](https://github.com/thingts/path) – Path manipulation only (no fs), pure javascript, no node.js dependences (browser-safe)

## Contributing

Contributions are welcome!

As usual: fork the repo, create a feature branch, and open a
pull request, with tests and docs for any new functionality.  Thanks!
