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
* [`fast-glob`](https://www.npmjs.com/package/fast-glob) for globbing


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

This is a quick overview of some common operations. For complete docs, see the [API Reference](https://thingts.github.io/fs-path).


```typescript
import { FsPath } from '@thingts/fs-path'
``` 

#### Normalize & resolve on construction

```typescript
const a = new FsPath('/foo/../bar/file.txt')
a.equals('/bar/file.txt') // true

const b = new FsPath('relative/to/cwd.txt')
b.equals(FsPath.cwd().join('relative/to/cwd.txt')) // true
```

#### Path parts & transforms

```typescript
const a = new FsPath('/bar/file.txt')
a.filename                // Filename: 'file.txt'
a.filename.toString()     // string: 'file.txt'
a.stem                    // string: 'file'
a.extension               // string: '.txt'
a.parent                  // FsPath: '/bar'
const b = a.replaceStem('report')         // FsPath: '/bar/report.txt'
const c = b.replaceExtension('.md')       // FsPath: '/bar/report.md'
const d = c.replaceParent('/other')       // FsPath: '/other/report.md'
const e = d.transformFilename(f => String(f).toUpperCase()) // FsPath: '/other/REPORT.MD'
```

#### Navigation

```typescript
const base = new FsPath('/projects/demo')
base.join('src/index.ts')               // FsPath: '/projects/demo/src/index.ts'
base.descendsFrom('/projects')          // true
base.parent.equals('/projects')         // true
const rel = base.join('src/main.ts').relativeTo(base) // RelativePath: 'src/main.ts'
```

#### Filesystem operations

```typescript
const dir = new FsPath('/projects/demo')
const file = dir.join('logs/app.log')

// --- Writing and reading ---
await file.write('start\n', { makeParents: true })
await file.write('listening\n', { append: true })
await file.read()       // string: 'start\nlistening\n'

// --- File info ---
await file.exists()       // true
await file.isFile()       // true
await file.isDirectory()  // false
await file.parent.isDirectory() // true
await file.stat()         // fs.Stats object

// --- Directory operations...
await dir.join('sub').makeDirectory()
const files = await dir.readDirectory()    // [FsPath, ...]
const txts  = await dir.glob('**/*.log')   // glob within a directory
```

#### Temporary (a.k.a. disposable) files and directories

```typescript
// --- Explicit resource management ---
{
    using dir  = await FsPath.makeTempDirectory() // returns disposable directory
    using file = new FsPath('/project/tempfile.txt').disposable() // register for disposal

    dir.exists() // true
    file.write('data') // create file

    ...

    // dir and file are removed when they go out of scope
}

// --- Removed eventually, on gc or exit ---
const dir  = await FsPath.makeTempDirectory() 
const file = new FsPath('/project/tempfile.txt').disposable()
```

## Related

* [@thingts/path](https://github.com/thingts/path) – Path manipulation only (no fs), pure javascript, no node.js dependences (browser-safe)

## Contributing

Contributions are welcome!

As usual: fork the repo, create a feature branch, and open a
pull request, with tests and docs for any new functionality.  Thanks!
