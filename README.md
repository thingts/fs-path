# @thingts/fs-path

Type-safe, ergonomic package for working with paths and fs in Node.js.

Instead of juggling raw strings with
[node:path](https://nodejs.org/api/path.html) and
[node:fs](https://nodejs.org/api/fs.html), `@thingts/fs-path` makes
filesystem paths **first-class citizens** in your code.

Built on [`@thingts/filepath`](https://www.npmjs.com/package/@thingts/filepath) for path manipulation, and adds async filesystem operations.

* Immutable, chainable path objects with type-safe operations
* Path normalization and resolution on construction
* Easy access to path parts (filename, stem, extension, parent, etc)
* Path transformations (replace stem/extension/parent, transform filename, etc)
* Path navigation (join, resolve, relativeTo, descendsFrom, etc)
* Async filesystem operations (exists, isFile, isDirectory, stat, read, write, mkdir, readdir, glob, etc)
* Temporary directory & file management

Together, these features give you a safer, more expressive way to work with
paths, files, and directories in Node.js

#### Notes:

⚠️ Currently only POSIX-style paths are supported (e.g. `/foo/bar`).

💡 For environments outside Node.js (like browser or Deno), [`@thingts/filepath`](https://www.npmjs.com/package/@thingts/filepath) provides path manipulation with no dependencies (and no file operations).

🔧 This package supports most commonly used [`node:fs`](https://nodejs.org/api/fs.html) features & options.  But not all; contributions to expand functionality are welcome.

## Overview

The package provides a set of classes to represent and manipulate
filesystem paths.  All classes are immutable; any path manipulation
operation returns a new instance.

Most commonly, you'll likely use `FsPath`, but the full set of exported classes is:

* `FsPath` - Absolute path, with path manipulation and filesystem operations (extends `@thingts/filepath`'s [AbsolutePath](https://thingts.github.io/filepath/classes/AbsolutePath.html))
* `FsRelativePath` - Relative path with path manipulation.  (Re-export of [RelativePath](https://thingts.github.io/filepath/classes/RelativePath.html) from [`@thingts/filepath`](https://www.npmjs.com/package/@thingts/filepath) for convenience)
* `FsFilename` - Immutable filename with file part manipulation.  (Re-export of [Filename](https://thingts.github.io/filepath/classes/Filename.html) from [`@thingts/filepath`](https://www.npmjs.com/package/@thingts/filepath) for convenience)

The classes work together to maintain type safety and ergonomics.  For
example, the `.relativeTo()` method of `FsPath` returns an `FsRelativePath`
object -- which would need to be joined to a base `FsPath` in order to
perform filesystem operations.


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
const e = d.transformFilename(fn => fn.toUpperCase()) // FsPath: '/other/REPORT.MD'
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

Automatically deletes disposable files and directories when they're no
longer needed.

```typescript
// --- Explicit resource management ---
{
    using file = new FsPath('/project/tempfile.txt').disposable() // register for disposal
    using dir  = await FsPath.makeTempDirectory() // returns already disposable object

    dir.exists() // true
    file.write('data') // create file

    ...

    // dir and file are removed when they go out of scope
}

// --- Cleanup eventually, on gc or exit ---
const dir  = await FsPath.makeTempDirectory() 
const file = new FsPath('/project/tempfile.txt').disposable()
```

## Contributing

Contributions are welcome!

As usual: fork the repo, create a feature branch, and open a
pull request, with tests and docs for any new functionality.  Thanks!
