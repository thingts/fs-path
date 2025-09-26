# @thingts/fs-path

Type-safe, ergonomic package for working with paths and fs in Node.js.

Instead of juggling raw strings with
[node:path](https://nodejs.org/api/path.html) and
[node:fs](https://nodejs.org/api/fs.html), `@thingts/fs-path` makes
filesystem paths **first-class citizens** in your code.


* Immutable, chainable path objects with type-safe operations
* Path normalization and resolution on construction
* Easy access to path parts (filename, stem, extension, parent, etc)
* Path transformations (replace stem/extension/parent, transform filename, etc)
* Path navigation (join, resolve, relativeTo, descendsFrom, etc)
* Async filesystem operations (exists, isFile, isDirectory, stat, read, write, mkdir, readdir, glob, etc)
* Temporary directory & file management


Together these features give you a safer, more expressive way to work with paths, files, and directories in Node.js

## Overview

The package provides a set of classes to represent and manipulate
filesystem paths.  All classes are immutable; any path or filename
manipulation operation returns a new instance.

Most commonly, you'll likely use `FsPath`, but the full collection of classes is:

* `FsPath` - Path object with filesystem operations (extends `FsAbsolutePath`)
* `FsAbsolutePath` - Absolute path object with path manipulation (no fs ops)
* `FsRelativePath` - Relative path object with path manipulation (no fs ops)
* `FsFilename` - Immutable filename with file part manipulation (no fs ops)
* `FsDisposablePath` - Extends `FsPath` with automatic cleanup of temporary files and directories

The classes work together to maintain type safety and ergonomics.  For
example, the `.relativeTo()` method of `FsPath` returns an `FsRelativePath`
object, which would need to be joined to a base `FsPath` in order to
perform filesystem operations.


## Usage summary

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
a.filename.toString()     // string: 'file.txt'
a.stem                    // string: 'file'
a.extension               // string: '.txt'
const b = a.replaceStem('report')         // FsPath: '/bar/report.txt'
const c = b.replaceExtension('.md')       // FsPath: '/bar/report.md'
const d = c.transformFilename(fn => fn.toUpperCase()) // FsPath: '/bar/REPORT.MD'
```

#### Navigation

```typescript
const base = new FsPath('/projects/demo')
base.join('src/index.ts')               // FsPath: '/projects/demo/src/index.ts'
base.descendsFrom('/projects')          // true
base.parent.equals('/projects')         // true
const rel = base.join('src/main.ts').relativeTo(base) // FsRelativePath: 'src/main.ts'
```

#### Filesystem operations

```typescript
const dir = new FsPath('/projects/demo')
const file = dir.join('logs/app.log')

// --- Writing and reading ---
await file.write('start\n', { mkdirIfNeeded: true })
await file.write('listening\n', { append: true })
await file.read()       // string: 'start\nlistening\n'

// --- File info ---
await file.exists()       // true
await file.isFile()       // true
await file.isDirectory()  // false
await file.parent.isDirectory() // true
await file.stat()         // fs.Stats object

// --- Directory operations...
await dir.join('sub').mkdir()
const files = await dir.readdir()          // [FsPath, ...]
const txts  = await dir.glob('**/*.log')   // glob within a directory
```

#### Temporary files and directories

`FsDisposablePath` disposes (removes) files and directories via the `using`
keyword or cleanup on process exit.

```typescript
import { FsDisposablePath } from '@thingts/fs-path'

// --- Explicit resource management ---
{
    using dir  = await FsDisposablePath.makeTempDirectory()
    using file = new FsDisposablePath('/project/tempfile.txt')

    dir.exists() // true
    file.write('data') // create file

    ...

    // removes dir and file from the filesystem when they go out of scope
}

// --- Cleanup on exit ---
const dir  = await FsDisposablePath.makeTempDirectory({ dispose: 'onExit' }) 
const file = new FsDisposablePath('/project/tempfile.txt', { dispose: 'onExit' })
```
