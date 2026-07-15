import child_process from 'node:child_process'
import { Filename, RelativePath, FsPath } from '$src'
import { beforeEach, describe, it, expect } from 'vitest'
import { symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'

describe('FsPath', () => {

  describe('constructor', () => {
    it('normalizes paths', () => {
      const p = new FsPath('/foo/../bar/./baz.txt/')
      expect(String(p)).toBe('/bar/baz.txt')
    })

    it('resolves relative paths', () => {
      const p = new FsPath('foo/bar/baz.txt')
      expect(String(p)).toBe(`${process.cwd()}/foo/bar/baz.txt`)
    })
  })

  describe('path properties and manipulation', () => {

    it('tests equality of paths', () => {
      const p1 = new FsPath('/foo/bar/A.txt')
      const p2 = new FsPath('/foo/bar/A.txt')
      const p3 = new FsPath('/foo/bar/B.txt')
      expect(p1.equals(p2)).toBe(true)
      expect(p1.equals(p3)).toBe(false)
      expect(p1.equals('/foo/bar/A.txt/')).toBe(true)
    })

    it('exposes filename, stem, extension', () => {
      const p = new FsPath('/tmp/foo/bar/file.test.txt')
      expect(p.filename).toBeInstanceOf(Filename)
      expect(String(p.filename)).toBe('file.test.txt')
      expect(p.stem).toBe('file.test')
      expect(p.extension).toBe('.txt')
    })

    it('exposes parent directory as FsPath', () => {
      const p = new FsPath('/tmp/foo/bar/file.txt')
      const parent = p.parent
      expect(parent).toBeInstanceOf(FsPath)
      expect(String(parent)).toBe('/tmp/foo/bar')
    })

    it('can replace filename, stem, extension, parent', () => {
      const p = new FsPath('/foo/bar/file.txt')
      const p1 = p.replaceFilename('x.y')
      expect(p1).toBeInstanceOf(FsPath)
      expect(String(p1)).toBe('/foo/bar/x.y')

      const p2 = p.replaceStem('file2')
      expect(p2).toBeInstanceOf(FsPath)
      expect(String(p2)).toBe('/foo/bar/file2.txt')

      const p3 = p.replaceExtension('.md')
      expect(p3).toBeInstanceOf(FsPath)
      expect(String(p3)).toBe('/foo/bar/file.md')

      const p4 = p.replaceParent('/tmp')
      expect(p4).toBeInstanceOf(FsPath)
      expect(String(p4)).toBe('/tmp/file.txt')
    })

    it('can transform filename', () => {
      const p = new FsPath('/foo/bar/file.txt')
      const p1 = p.transformFilename(fn => {
        expect(fn).toBeInstanceOf(Filename)
        return fn.toString().toUpperCase()
      })
      expect(p1).toBeInstanceOf(FsPath)
      expect(String(p1)).toBe('/foo/bar/FILE.TXT')
    })

    it('can join segments to form a new path', () => {
      const p = new FsPath('/foo/bar')
      expect(p.join('baz.txt')).toBeInstanceOf(FsPath)
      expect(String(p.join('baz.txt'))).toBe('/foo/bar/baz.txt')
      expect(String(p.join('baz', null, 'qux.txt'))).toBe('/foo/bar/baz/qux.txt')
    })

    it('can extract relative path', () => {
      const base = new FsPath('/foo/bar')
      const child = new FsPath('/foo/bar/baz/qux.txt')
      const relpath = child.relativeTo(base)
      expect(relpath).toBeInstanceOf(RelativePath)
      expect(String(relpath)).toBe('baz/qux.txt')
    })

    describe('descendsFrom()', () => {
      const base = new FsPath('/foo/bar')
      const child = new FsPath('/foo/bar/baz/qux.txt')
      const sibling = new FsPath('/foo/bar2')
      const self = new FsPath('/foo/bar')

      it('returns true if path descends from another', () => {
        expect(child.descendsFrom(base)).toBe(true)
      })

      it('returns false if not a descendant', () => {
        expect(sibling.descendsFrom(base)).toBe(false)
      })

      it('returns false if path is equal and includeSelf is false', () => {
        expect(self.descendsFrom(base)).toBe(false)
      })

      it('returns true if path is equal and includeSelf is true', () => {
        expect(self.descendsFrom(base, { includeSelf: true })).toBe(true)
      })
    })

    describe('resolve()', () => {
      it('resolves a relative segment against the base path', () => {
        const base = new FsPath('/foo/bar')
        const result = base.resolve('baz')
        expect(result).toBeInstanceOf(FsPath)
        expect(String(result)).toBe('/foo/bar/baz')
      })

      it('resets to absolute if the segment starts with a slash', () => {
        const base = new FsPath('/foo/bar')
        const result = base.resolve('/absolute/path')
        expect(result).toBeInstanceOf(FsPath)
        expect(String(result)).toBe('/absolute/path')
      })

      it('resolves upward navigation segments correctly', () => {
        const base = new FsPath('/foo/bar')
        const result = base.resolve('../baz')
        expect(result).toBeInstanceOf(FsPath)
        expect(String(result)).toBe('/foo/baz')
      })

      it('resolves multiple segments including an absolute reset', () => {
        const base = new FsPath('/foo/bar')
        const result = base.resolve('a', '/b', 'c')
        expect(result).toBeInstanceOf(FsPath)
        expect(String(result)).toBe('/b/c')
      })

      it('ignores null and undefined segments', () => {
        const base = new FsPath('/foo/bar')
        const result = base.resolve(null, 'baz', undefined)
        expect(result).toBeInstanceOf(FsPath)
        expect(String(result)).toBe('/foo/bar/baz')
      })
    })

  })

  it('toString yields the path string', () => {
    const p = new FsPath('/tmp/example.txt')
    expect(p.toString()).toBe('/tmp/example.txt')
  })

  describe('file system operations', () => {
    let root: FsPath

    beforeEach(async () => {
      root = await FsPath.makeTempDirectory()
    })

    it('can create, inspect, write, and read a file', async () => {
      const file = await root.join('hello.txt').write('Hello, world!')

      expect(await file.exists()).toBe(true)
      expect(await file.isFile()).toBe(true)
      expect(await file.isDirectory()).toBe(false)
      expect((await file.stat()).mtimeMs).toBeGreaterThan(0)
      expect(await file.read()).toBe('Hello, world!')
    })

    it('can create and inspect a directory', async () => {
      const subdir = await root.join('sub').makeDirectory()
      expect(await subdir.exists()).toBe(true)
      expect(await subdir.isDirectory()).toBe(true)
      expect(await subdir.isFile()).toBe(false)
    })

    describe('realPath()', () => {
      it('resolves symbolic links', async () => {
        const target = await root.join('target.txt').write('hello')
        const link = root.join('link.txt')

        await symlink(String(target), String(link))

        const real = await link.realPath()

        expect(real.equals(await target.realPath())).toBe(true)
        expect(await real.read()).toBe('hello')
      })
    })

    describe('makeDirectory()', () => {
      it ('doesn\'t throw if trying to create an existing directory', async () => {
        const subdir = await root.join('sub').makeDirectory()
        await expect(subdir.makeDirectory()).resolves.toBe(subdir)
      })

      it ('throws if trying to create an existing directory with throwIfExists: true', async () => {
        const subdir = await root.join('sub').makeDirectory()
        await expect(() => subdir.makeDirectory({ throwIfExists: true })).rejects.toThrow(/EEXIST/)
      })

      it ('throws if trying to create an existing directory with makeParents: true and throwIfExists: true', async () => {
        const subdir = await root.join('sub').makeDirectory()
        await expect(() => subdir.makeDirectory({ makeParents: true, throwIfExists: true })).rejects.toThrow(/EEXIST/)
      })
    })

    describe('remove()', () => {
      it('removes a file', async () => {
        const file = await root.join('file.txt').touch()
        expect(await file.exists()).toBe(true)
        const removed = await file.remove()
        expect(await file.exists()).toBe(false)
        expect(removed.equals(file)).toBe(true)
      })

      it('removes a directory and its contents', async () => {
        const subdir  = await root.join('subdir').makeDirectory()
        const subfile = await subdir.join('file.txt').touch()
        expect(await subdir.exists()).toBe(true)
        expect(await subfile.exists()).toBe(true)
        await subdir.remove()
        expect(await subdir.exists()).toBe(false)
        expect(await subfile.exists()).toBe(false)
      })

      it('does not throw for non-existent file', async () => {
        const missingFile = root.join('missing.txt')
        await missingFile.remove()
        expect(await missingFile.exists()).toBe(false)
      })

      it('throws for non-existent file if throwIfMissing is set', async () => {
        const missingFile = root.join('missing.txt')
        await expect(() => missingFile.remove({ throwIfMissing: true })).rejects.toThrow('ENOENT: no such file or directory')
      })
    })

    describe('write()', () => {

      it('fails if parent directory does not exist', async () => {
        const file = new FsPath('/tmp/nonexistent/dir/file.txt')
        await expect(() => file.write('test')).rejects.toThrow('ENOENT: no such file or directory')
      })

      it('can optionally create parent directories', async () => {
        const nested = root.join('a/b/c/file.txt')
        await nested.write('hello', { makeParents: true })
        expect(await nested.read()).toBe('hello')
      })

      it('appends to file when append: true', async () => {
        const file = root.join('log.txt')
        await file.write('line 1\n')
        await file.write('line 2\n', { append: true })
        const result = await file.read()
        expect(result).toBe('line 1\nline 2\n')
      })

      it('creates file when append: true', async () => {
        const file = root.join('new.txt')
        await file.write('content', { append: true })
        const result = await file.read()
        expect(result).toBe('content')
      })

    })

    describe('touch()', () => {

      function delay(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)) }

      it('creates a new empty file if it does not exist', async () => {
        const file = root.join('new.txt')
        expect(await file.exists()).toBe(false)

        const touched = await file.touch()
        expect(await file.exists()).toBe(true)
        expect(await file.read()).toBe('')
        expect(touched.equals(file)).toBe(true)
      })

      it('does not overwrite contents of existing file', async () => {
        const file = await root.join('file.txt').write('original')

        const before = await file.stat()
        await delay(10) // Ensure timestamp can advance
        await file.touch()
        const after = await file.stat()

        expect(await file.read()).toBe('original')
        expect(after.mtimeMs).toBeGreaterThan(before.mtimeMs)
      })

      it('creates parent directories if makeParents is true', async () => {
        const nested = root.join('a/b/c/file.txt')
        await nested.touch({ makeParents: true })
        expect(await nested.exists()).toBe(true)
      })

      it('throws if parent directory is missing and makeParents is false', async () => {
        const nested = root.join('a/b/c/file.txt')
        await expect(() => nested.touch()).rejects.toThrow('ENOENT')
      })
    })

    describe('readBytes()', () => {
      it('reads a portion of a file', async () => {
        const file = root.join('file.txt')
        await file.write('abcdef')

        const bytes = await file.readBytes({
          offset: 2,
          size: 3,
        })

        expect(bytes.toString()).toBe('cde')
      })

      it('truncates reads at end of file', async () => {
        const file = root.join('file.txt')
        await file.write('abc')
        const bytes = await file.readBytes({
          offset: 1,
          size: 10,
        })

        expect(bytes.toString()).toBe('bc')
      })
    })

    describe('readStream()', () => {
      it('returns a readable stream for the file', async () => {
        const content = 'Hello, stream!'
        const file = await root.join('file.txt').write(content)

        const stream = await file.readStream()
        expect(stream.readable).toBe(true)

        let data = ''
        for await (const chunk of stream) {
          data += chunk as string
        }
        expect(data).toBe(content)
      })

      it('throws if file does not exist', async () => {
        const file = root.join('missing.txt')
        await expect(() => file.readStream()).rejects.toThrow('ENOENT')
      })

      it('supports start and end options', async () => {
        const content = '0123456789'
        const file = await root.join('file.txt').write(content)

        const stream = await file.readStream({ start: 2, end: 5 })
        let data = ''
        for await (const chunk of stream) {
          data += chunk as string
        }
        expect(data).toBe('2345')
      })
    })

    describe('moveTo()', () => {
      const content = 'Hello, world!'

      it('moves a file to a new location', async () => {
        const oldPath = await root.join('old.txt').write(content)
        const newPath = root.join('new.txt')

        const moved = await oldPath.moveTo(newPath)

        expect(await newPath.read()).toBe(content)
        expect(await oldPath.exists()).toBe(false)
        expect(moved.equals(newPath)).toBe(true)
      })

      it('moves into a directory', async () => {
        const oldPath = await root.join('old.txt').write(content)
        const subdir  = await root.join('subdir').makeDirectory()

        const moved = await oldPath.moveTo(subdir, { intoDir: true })

        const newPath = subdir.join('old.txt')
        expect(await newPath.read()).toBe(content)
        expect(await oldPath.exists()).toBe(false)
        expect(moved.equals(newPath)).toBe(true)
      })

      it('creates destination directory if makeParents is true', async () => {
        const src = await root.join('file.txt').write(content)
        const dest = root.join('nested/newname.txt')

        await expect(() => src.moveTo(dest)).rejects.toThrow('ENOENT: no such file or directory')
        await src.moveTo(dest, { makeParents: true })

        expect(await dest.read()).toBe(content)
        expect(await src.exists()).toBe(false)
      })

      it('overwrites an existing file by default', async () => {
        const source = await root.join('source.txt').write('new')
        const target = await root.join('target.txt').write('old')

        await source.moveTo(target)
        expect(await target.read()).toBe('new')
        expect(await source.exists()).toBe(false)
      })

      it('throws instead of overwriting when overwrite: false', async () => {
        const source = await root.join('source.txt').write('new')
        const target = await root.join('target.txt').write('old')

        await expect(() => source.moveTo(target, { overwrite: false })).rejects.toThrow()
        expect(await target.read()).toBe('old')
        expect(await source.read()).toBe('new')
      })
    })


    describe('copyTo()', () => {
      const content = 'Hello, world!'

      it('copies a file to another location', async () => {
        const source = await root.join('source.txt').write(content)
        const target = root.join('target.txt')

        const copied = await source.copyTo(target)

        expect(await target.read()).toBe(content)
        expect(copied.equals(target)).toBe(true)
      })

      it('can copy into a directory', async () => {
        const source    = await root.join('source.txt').write(content)
        const targetDir = await root.join('target-dir').makeDirectory()

        const copied = await source.copyTo(targetDir, { intoDir: true })

        const targetFile = targetDir.join('source.txt')
        expect(await targetFile.read()).toBe(content)
        expect(copied.equals(targetFile)).toBe(true)
      })

      it('can copy to a new file with makeParents', async () => {
        const source = await root.join('source.txt').write(content)
        const target = root.join('new-dir/target.txt')

        await source.copyTo(target, { makeParents: true })

        expect(await target.read()).toBe(content)
      })

      it('throws when copying a directory without recursive: true', async () => {
        const sourceDir = await root.join('source-dir').makeDirectory()
        await sourceDir.join('file.txt').write(content)

        const targetDir = root.join('target-dir')

        await expect(() => sourceDir.copyTo(targetDir)).rejects.toThrow()
        expect(await targetDir.exists()).toBe(false)
      })

      it('copies a directory recursively when recursive: true', async () => {
        const sourceDir = await root.join('source-dir').makeDirectory()
        await sourceDir.join('file.txt').write(content)
        await sourceDir.join('nested/file.txt').write('nested content', { makeParents: true })

        const targetDir = root.join('target-dir')

        const copied = await sourceDir.copyTo(targetDir, { recursive: true })

        expect(await targetDir.isDirectory()).toBe(true)
        expect(await targetDir.join('file.txt').read()).toBe(content)
        expect(await targetDir.join('nested/file.txt').read()).toBe('nested content')
        expect(copied.equals(targetDir)).toBe(true)
      })

      it('copies a directory recursively into an existing directory', async () => {
        const sourceDir = await root.join('source-dir').makeDirectory()
        await sourceDir.join('file.txt').write(content)

        const targetParent = await root.join('target-parent').makeDirectory()

        const copied = await sourceDir.copyTo(targetParent, {
          intoDir: true,
          recursive: true
        })

        const targetDir = targetParent.join('source-dir')
        expect(await targetDir.join('file.txt').read()).toBe(content)
        expect(copied.equals(targetDir)).toBe(true)
      })

      it('copies a directory recursively with makeParents: true', async () => {
        const sourceDir = await root.join('source-dir').makeDirectory()
        await sourceDir.join('file.txt').write(content)

        const targetDir = root.join('missing/parent/target-dir')

        await sourceDir.copyTo(targetDir, {
          recursive: true,
          makeParents: true
        })

        expect(await targetDir.join('file.txt').read()).toBe(content)
      })

      it('overwrites an existing file by default', async () => {
        const source = await root.join('source.txt').write('new')
        const target = await root.join('target.txt').write('old')

        await source.copyTo(target)

        expect(await target.read()).toBe('new')
      })

      it('throws instead of overwriting when overwrite: false', async () => {
        const source = await root.join('source.txt').write('new')
        const target = await root.join('target.txt').write('old')

        await expect(() => source.copyTo(target, { overwrite: false })).rejects.toThrow()
        expect(await target.read()).toBe('old')
      })

      it('merges and overwrites directory contents by default', async () => {
        const source = await root.join('source').makeDirectory()
        await source.join('a.txt').write('new a')
        await source.join('b.txt').write('new b')

        const target = await root.join('target').makeDirectory()
        await target.join('a.txt').write('old a')
        await target.join('c.txt').write('old c')

        await source.copyTo(target, { recursive: true })

        expect(await target.join('a.txt').read()).toBe('new a')
        expect(await target.join('b.txt').read()).toBe('new b')
        expect(await target.join('c.txt').read()).toBe('old c')
      })

      it('throws on directory content conflict when overwrite: false', async () => {
        const source = await root.join('source').makeDirectory()
        await source.join('a.txt').write('new a')

        const target = await root.join('target').makeDirectory()
        await target.join('a.txt').write('old a')

        await expect(() =>
                     source.copyTo(target, { recursive: true, overwrite: false })
                    ).rejects.toThrow()

                    expect(await target.join('a.txt').read()).toBe('old a')
      })
    })

    describe('readDirectory()', () => {
      it('returns FsPath objects', async () => {
        await root.join('a.txt').touch()
        await root.join('b.txt').touch()

        const files = await root.readDirectory()
        const names = files.map(f => f.filename.toString()).sort()
        expect(names).toEqual(['a.txt', 'b.txt'])
      })

      it('throws if directory is missing', async () => {
        const ghost = root.join('ghost-dir')
        await expect(() => ghost.readDirectory()).rejects.toThrow('ENOENT: no such file or directory')
      })

      it('returns [] if directory is missing and allowMissing is true', async () => {
        const ghost = root.join('ghost-dir')
        const result = await ghost.readDirectory({ allowMissing: true })
        expect(result).toEqual([])
      })

      it('throws if called on a file', async () => {
        const file = await root.join('file.txt').touch()
        await expect(() => file.readDirectory()).rejects.toThrow(/ENOTDIR/)
        await expect(() => file.readDirectory({ allowMissing: true })).rejects.toThrow(/ENOTDIR/)
      })

      it('filters files based on options', async () => {
        await root.join('.hidden').touch()
        await root.join('visible.txt').touch()
        await root.join('subdir').makeDirectory()

        const all = await root.readDirectory()
        expect(all.length).toBe(3)

        const onlyFiles = await root.readDirectory({ onlyFiles: true })
        expect(onlyFiles.map(f => String(f.filename)).sort()).toEqual(['.hidden', 'visible.txt'])

        const onlyDirs = await root.readDirectory({ onlyDirs: true })
        expect(onlyDirs.map(f => String(f.filename))).toEqual(['subdir'])

        const noDotfiles = await root.readDirectory({ includeDotfiles: false })
        expect(noDotfiles.map(f => String(f.filename)).sort()).toEqual(['subdir', 'visible.txt'])
      })
    })

    describe('glob()', () => {
      it('returns matching files from a directory', async () => {
        await root.join('foo.txt').touch()
        await root.join('bar.log').touch()
        await root.join('baz.txt').touch()

        const matches = await root.glob('*.txt')
        const names = matches.map(p => p.filename.toString()).sort()
        expect(names).toEqual(['baz.txt', 'foo.txt'])
      })

      it('throws ENOTDIR if called on a file', async () => {
        const file = await root.join('some.txt').touch()
        await expect(() => file.glob('*')).rejects.toThrow(/ENOTDIR/)
      })

      it('throws ENOENT if dir is missing and allowMissing is false', async () => {
        const missing = root.join('ghost')
        await expect(() => missing.glob('*', { allowMissing: false })).rejects.toThrow(/ENOENT/)
      })

      it('returns [] if dir is missing and allowMissing is true', async () => {
        const missing = root.join('ghost')
        const result = await missing.glob('*', { allowMissing: true })
        expect(result).toEqual([])
      })

      it('returns a directory if it matches the glob pattern', async () => {
        const subdir = await root.join('subdir').makeDirectory()
        await subdir.join('file.txt').write('test content')

        const matches = await root.glob('sub*')
        expect(matches.length).toBe(1)
        expect(matches[0]).toBeInstanceOf(FsPath)
        expect(String(matches[0])).toBe(String(subdir))
      })
    })
    
    describe('access()', () => {
      let file: FsPath

      beforeEach(async () => {
        file = await root.join('test.txt').write('hello')
      })

      it('returns true when the path exists', async () => {
        expect(await file.access([])).toBe(true)
        expect(await file.access({})).toBe(true)
      })

      it('returns false when the path does not exist', async () => {
        expect(await root.join('missing.txt').access([])).toBe(false)
      })

      it('checks access from a mode string', async () => {
        await file.setPermissions({ mode: 0o400 })

        expect(await file.access('read')).toBe(true)
        expect(await file.access('execute')).toBe(false)
      })

      it('checks access from a mode array', async () => {
        await file.setPermissions({ mode: 0o600 })

        expect(await file.access(['read', 'write'])).toBe(true)
        expect(await file.access(['read', 'execute'])).toBe(false)
      })

      it('checks access from permission flags', async () => {
        await file.setPermissions({ mode: 0o100 })

        expect(await file.access({ execute: true })).toBe(true)
        expect(await file.access({ read: true })).toBe(false)
      })

      it('throws the underlying error when throw is true', async () => {
        const missing = root.join('missing.txt')

        await expect(() => missing.access([], { throw: true })).rejects.toThrow(/ENOENT/)
      })
    })

    describe('setPermissions', () => {
      let file: FsPath

      beforeEach(async () => {
        file = await root.join('test.txt').touch()
      })

      it('applies numeric mode exactly', async () => {
        const set = await file.setPermissions({ mode: 0o600 })
        const stat = await file.stat()
        expect(stat.mode & 0o777).toBe(0o600)
        expect(set.equals(file)).toBe(true)
      })

      it('applies semantic user/group/others', async () => {
        await file.setPermissions({
          user: { read: true, write: true },
          group: { read: true },
          others: { read: true }
        })
        const stat = await file.stat()
        expect(stat.mode & 0o777).toBe(0o644)
      })

      it('applies "all" shorthand', async () => {
        await file.setPermissions({ all: { read: true, execute: true } })
        const stat = await file.stat()
        expect(stat.mode & 0o777).toBe(0o555)
      })

      it('overlays bits using operation: "overlay"', async () => {
        await file.setPermissions({ mode: 0o644 })
        await file.setPermissions({ mode: 0o110 }, { operation: 'overlay' })
        const stat = await file.stat()
        expect(stat.mode & 0o777).toBe(0o754)
      })

      it('clears bits using operation: "clear"', async () => {
        await file.setPermissions({ mode: 0o755 })
        await file.setPermissions({ mode: 0o101 }, { operation: 'clear' })
        const stat = await file.stat()
        expect(stat.mode & 0o777).toBe(0o654)
      })

      it('accepts FsFileMode string and array specs', async () => {
        await file.setPermissions({
          user: ['read', 'write'],
          group: 'read',
          others: []
        })

        const stat = await file.stat()
        expect(stat.mode & 0o777).toBe(0o640)

      })
    })
  })

  describe('disposable', () => {
    let root: FsPath

    beforeEach(async () => {
      root = await FsPath.makeTempDirectory()
    })

    it('disposes via using block', async () => {
      const file = await root.join('file.txt').touch()
      const dir = await root.join('dir').makeDirectory()
      {
        using useFile = new FsPath(file).disposable()
        using useDir = new FsPath(dir).disposable()
        expect(await useFile.exists()).toBe(true)
        expect(await useDir.exists()).toBe(true)
      }
      expect(await file.exists()).toBe(false)
      expect(await dir.exists()).toBe(false)
    })

    it('retains a disposable path to prevent disposal', async () => {
      const file = await root.join('file.txt').touch()
      const dir = await root.join('dir').makeDirectory()
      {
        using useFile = new FsPath(file).disposable()
        using useDir = new FsPath(dir).disposable()
        expect(await useFile.exists()).toBe(true)
        expect(await useDir.exists()).toBe(true)

        useFile.retain()
      }
      expect(await file.exists()).toBe(true)
      expect(await dir.exists()).toBe(false) // dir was not retained
    })

    it('lets an equivalent instance retain a path from disposal', async () => {
      const file = await root.join('file.txt').touch()
      const original = new FsPath(file).disposable()
      const equivalent = new FsPath(file)
      equivalent.retain()

      original[Symbol.dispose]()
      expect(await file.exists()).toBe(true)
    })

    it('is harmless to call disposable() or retain() repeatedly', async () => {
      const file = await root.join('file.txt').touch()
      {
        using p = new FsPath(file).disposable().disposable()
        p.retain()
        p.retain()
        p.disposable()
        expect(await p.exists()).toBe(true)
      }
      expect(await file.exists()).toBe(false)
    })

    it('disposes at process exit', async () => {
      const program = await root.join('program.ts').write(`
        import { FsPath } from '${__dirname}/../src'
        const path = new FsPath(process.argv[2])
        if (path.stem == 'dispose-of-me') { // ensure disposing the right thing!
          path.disposable()
        }
      `)
      const file = await root.join('dispose-of-me.txt').touch()
      expect(await file.exists()).toBe(true)
      await new Promise<void>((resolve, reject) => {
        child_process.exec(`npx --quiet tsx ${String(program)} ${String(file)}`, (error, _stdout, stderr) => {
          if (error) { reject(error) }
          else if (stderr) { reject(new Error(stderr)) }
          else { resolve() }
        })
      })
      expect(await file.exists()).toBe(false)
    })

    it('lets an equivalent instance retain a path from process-exit disposal', async () => {
      const program = await root.join('program.ts').write(`
        import { FsPath } from '${__dirname}/../src'
        const path = new FsPath(process.argv[2])
        if (path.stem == 'dispose-of-me') { // ensure disposing the right thing!
          path.disposable()
          new FsPath(path).retain() // retain via an equivalent, but distinct, instance
        }
      `)
      const file = await root.join('dispose-of-me.txt').touch()
      expect(await file.exists()).toBe(true)
      await new Promise<void>((resolve, reject) => {
        child_process.exec(`npx --quiet tsx ${String(program)} ${String(file)}`, (error, _stdout, stderr) => {
          if (error) { reject(error) }
          else if (stderr) { reject(new Error(stderr)) }
          else { resolve() }
        })
      })
      expect(await file.exists()).toBe(true)
    })

    it('throws an error for using declaration without disposable()', async () => {
      const file = await root.join('file.txt').touch()
      await expect(async () => {
        using useFile = new FsPath(file)
        expect(await useFile.exists()).toBe(true)
      }).rejects.toThrow('Object not disposable')
      expect(await file.exists()).toBe(true) // file was not disposed
    })

    it('throws an error for using dedlaration after retain', async () => {
      const file = await root.join('file.txt').touch()
      file.disposable().retain()
      await expect(async () => {
        using useFile = new FsPath(file)
        expect(await useFile.exists()).toBe(true)
      }).rejects.toThrow('Object not disposable')
      expect(await file.exists()).toBe(true) // file was not disposed
    })

  })


  describe('static methods', () => {
    let root: FsPath

    beforeEach(async () => {
      root = await FsPath.makeTempDirectory()
    })

    it('cwd() returns current persistence directory', () => {
      const cwd = FsPath.cwd()
      expect(String(cwd)).toBe(process.cwd())
    })

    describe('makeTempDirectory()', () => {
      it('creates a scratch directory under system tmpdir', async () => {
        const dir = await FsPath.makeTempDirectory()
        expect(dir).toBeInstanceOf(FsPath)
        expect(dir.descendsFrom(new FsPath(tmpdir()))).toBe(true)
        expect(await dir.exists()).toBe(true)
      })

      it('creates a scratch directory with a prefix', async () => {
        const prefix = 'mytest-'
        const dir = await FsPath.makeTempDirectory({ prefix })
        expect(String(dir.filename)).toMatch(/^mytest-/)
        expect(await dir.exists()).toBe(true)
      })

      it('generates unique directories for same prefix', async () => {
        const prefix = 'unique-'
        const d1 = await FsPath.makeTempDirectory({ prefix })
        const d2 = await FsPath.makeTempDirectory({ prefix })

        expect(String(d1)).not.toBe(String(d2))
      })

      it('creates a temp directory under a custom directory', async () => {
        const parent = await root.join('custom').makeDirectory()
        const dir = await FsPath.makeTempDirectory({ parent })

        expect(dir.descendsFrom(parent)).toBe(true)
        expect(await dir.exists()).toBe(true)
      })

      it('creates parent directory when makeParents is true', async () => {
        const parent = root.join('nested/custom')

        const dir = await FsPath.makeTempDirectory({ parent, makeParents: true })

        expect(await parent.exists()).toBe(true)
        expect(dir.descendsFrom(parent)).toBe(true)
        expect(await dir.exists()).toBe(true)
      })

      it('throws if parent directory does not exist and makeParents is false', async () => {
        const parent = root.join('missing/custom')

        await expect(() => FsPath.makeTempDirectory({ parent })).rejects.toThrow('ENOENT')
      })

    })

  })

})

