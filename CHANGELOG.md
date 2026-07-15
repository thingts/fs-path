# Change Log

## 3.0.1

- *Fixed:* disposable paths are no longer deleted when an `FsPath` instance is garbage-collected. Cleanup now occurs only through `Symbol.dispose` (`using`) or at process exit. This prevents temporary directories from disappearing while derived paths are still in use, and is generally more predictable and safer.


## 3.0.0

### Breaking changes

- Type safety: `.descendsFrom()` no longer accepts strings, only `FsPath` instances.

### Dependency updates

- Updated `@thingts/path` to `^3.0.0`.

## 2.1.0

### New features

- Added `.readBytes({ offset, size })` method to `FsPath` for reading partial file contents as a `Buffer`.


## 2.0.0

### Breaking changes

- `FsPath.makeDirectory()` is now idempotent by default.
  - Previously, calling `makeDirectory()` on an existing directory threw `EEXIST`.
  - It now succeeds as a no-op when the directory already exists.
  - To preserve the previous strict behavior, use:
    `makeDirectory({ throwIfExists: true })`

- The `parent` option of `FsPath.makeTempDirectory()` now requires an `AbsolutePath`.
  - Previously, it accepted arbitrary strings, which were resolved against the current working directory.
  - To preserve the previous behavior, use:
    `makeTempDirectory({ parent: new FsPath('parentString') })`

### New features

- Added `throwIfExists` option to `FsPath.makeDirectory()` to control behavior when the directory already exists.
- Added `overwrite` option to `FsPath.moveTo()` (default `true`).
  - Setting it to `false` causes the method to throw if the destination already exists.
