import { FsFilename, FsPath, FsDisposablePath, FsRelativePath } from '$src'
import { beforeEach, describe, it, expect } from 'vitest'


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
      expect(p.filename).toBeInstanceOf(FsFilename)
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
        expect(fn).toBeInstanceOf(FsFilename)
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
      expect(relpath).toBeInstanceOf(FsRelativePath)
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

  it('toString and valueOf yield the path string', () => {
    const p = new FsPath('/tmp/example.txt')
    expect(p.toString()).toBe('/tmp/example.txt')
    expect(p.valueOf()).toBe('/tmp/example.txt')
  })

  describe('file system operations', () => {
    let dir: FsPath

    beforeEach(async () => {
      dir = await FsDisposablePath.makeTempDirectory({ dispose: 'onExit' })
    })

    it('can create, inspect, write, and read a file', async () => {
      const file = dir.join('hello.txt')

      await file.write('Hello, world!')
      expect(await file.exists()).toBe(true)
      expect(await file.isFile()).toBe(true)
      expect(await file.isDirectory()).toBe(false)
      expect((await file.stat()).mtimeMs).toBeGreaterThan(0)
      expect(await file.read()).toBe('Hello, world!')
    })

    it('can create and inspect a directory', async () => {
      const subdir = dir.join('sub')
      await subdir.mkdir()
      expect(await subdir.exists()).toBe(true)
      expect(await subdir.isDirectory()).toBe(true)
      expect(await subdir.isFile()).toBe(false)
    })

    describe('mkdir()', () => {
      it ('throws if trying to create an existing directory', async () => {
        const subdir = dir.join('sub')
        await subdir.mkdir()
        await expect(subdir.mkdir()).rejects.toThrow(/EEXIST/)
      })

      it ('doesn\'t throw if trying to create an existing directory with recursive: true', async () => {
        const subdir = dir.join('sub')
        await subdir.mkdir()
        await expect(subdir.mkdir({ recursive: true})).resolves.toBeUndefined()
      })
    })

    describe('remove()', () => {
      it('removes a file', async () => {
        const file = dir.join('file.txt')
        await file.write('test')
        expect(await file.exists()).toBe(true)
        await file.remove()
        expect(await file.exists()).toBe(false)
      })

      it('removes a directory and its contents', async () => {
        const subdir = dir.join('subdir')
        await subdir.mkdir()
        const subfile = subdir.join('file.txt')
        await subfile.write('test')
        expect(await subdir.exists()).toBe(true)
        expect(await subfile.exists()).toBe(true)
        await subdir.remove()
        expect(await subdir.exists()).toBe(false)
        expect(await subfile.exists()).toBe(false)
      })

      it('does not throw for non-existent file', async () => {
        const missingFile = dir.join('missing.txt')
        await missingFile.remove()
        expect(await missingFile.exists()).toBe(false)
      })

      it('throws for non-existent file if throwIfMissing is set', async () => {
        const missingFile = dir.join('missing.txt')
        await expect(() => missingFile.remove({ throwIfMissing: true })).rejects.toThrow('ENOENT: no such file or directory')
      })
    })

    describe('write()', () => {

      it('fails if parent directory does not exist', async () => {
        const file = new FsPath('/tmp/nonexistent/dir/file.txt')
        await expect(() => file.write('test')).rejects.toThrow('ENOENT: no such file or directory')
      })

      it('can optionally create parent directories', async () => {
        const root = await FsDisposablePath.makeTempDirectory()
        const nested = root.join('a/b/c/file.txt')
        await nested.write('hello', { mkdirIfNeeded: true })
        expect(await nested.read()).toBe('hello')
      })

      it('appends to file when append: true', async () => {
        const file = dir.join('log.txt')
        await file.write('line 1\n')
        await file.write('line 2\n', { append: true })
        const result = await file.read()
        expect(result).toBe('line 1\nline 2\n')
      })

      it('creates file when append: true', async () => {
        const file = dir.join('new.txt')
        await file.write('content', { append: true })
        const result = await file.read()
        expect(result).toBe('content')
      })

    })

    describe('touch()', () => {

      function delay(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)) }

      it('creates a new empty file if it does not exist', async () => {
        const file = dir.join('new.txt')
        expect(await file.exists()).toBe(false)

        await file.touch()
        expect(await file.exists()).toBe(true)
        expect(await file.read()).toBe('')
      })

      it('does not overwrite contents of existing file', async () => {
        const file = dir.join('file.txt')
        await file.write('original')

        const before = await file.stat()
        await delay(10) // Ensure timestamp can advance
        await file.touch()
        const after = await file.stat()

        expect(await file.read()).toBe('original')
        expect(after.mtimeMs).toBeGreaterThan(before.mtimeMs)
      })

      it('creates parent directories if mkdirIfNeeded is true', async () => {
        const nested = dir.join('a/b/c/file.txt')
        await nested.touch({ mkdirIfNeeded: true })
        expect(await nested.exists()).toBe(true)
      })

      it('throws if parent directory is missing and mkdirIfNeeded is false', async () => {
        const nested = dir.join('a/b/c/file.txt')
        await expect(() => nested.touch()).rejects.toThrow('ENOENT')
      })
    })

    describe('readStream()', () => {
      it('returns a readable stream for the file', async () => {
        const file = dir.join('file.txt')
        const content = 'Hello, stream!'
        await file.write(content)

        const stream = await file.readStream()
        expect(stream.readable).toBe(true)

        let data = ''
        for await (const chunk of stream) {
          data += chunk as string
        }
        expect(data).toBe(content)
      })

      it('throws if file does not exist', async () => {
        const file = dir.join('missing.txt')
        await expect(() => file.readStream()).rejects.toThrow('ENOENT')
      })

      it('supports start and end options', async () => {
        const file = dir.join('file.txt')
        const content = '0123456789'
        await file.write(content)

        const stream = await file.readStream({ start: 2, end: 5 })
        let data = ''
        for await (const chunk of stream) {
          data += chunk as string
        }
        expect(data).toBe('2345')
      })
    })

    describe('rename()', () => {
      it('renames a file to a new location', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        const oldPath = dir.join('old.txt')
        const newPath = dir.join('new.txt')

        await oldPath.write('hello world')
        await oldPath.rename(newPath)

        expect(await newPath.read()).toBe('hello world')
        expect(await oldPath.exists()).toBe(false)
      })

      it('creates destination directory iff mkdirIfNeeded is true', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        const src = dir.join('file.txt')
        const dest = dir.join('nested/newname.txt')

        await src.write('data')
        await expect(() => src.rename(dest)).rejects.toThrow('ENOENT: no such file or directory')
        await src.rename(dest, { mkdirIfNeeded: true })

        expect(await dest.read()).toBe('data')
        expect(await src.exists()).toBe(false)
      })
    })


    describe('copyTo()', () => {
      const content = 'Hello, world!'

      it('copies a file to another location', async () => {
        const source = dir.join('source.txt')
        await source.write(content)

        const target = dir.join('target.txt')
        await source.copyTo(target)

        expect(await target.read()).toBe(content)
      })

      it('can copy into a directory', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        const source = dir.join('source.txt')
        await source.write(content)

        const targetDir = dir.join('target-dir')
        await targetDir.mkdir()
        await source.copyTo(targetDir, { intoDir: true })

        const targetFile = targetDir.join('source.txt')
        expect(await targetFile.read()).toBe(content)
      })

      it('can copy to a new file with mkdirIfNeeded', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        const source = dir.join('source.txt')
        await source.write(content)

        const target = dir.join('new-dir/target.txt')
        await source.copyTo(target, { mkdirIfNeeded: true })

        expect(await target.read()).toBe(content)
      })
    })

    describe('readdir()', () => {
      it('returns FsPath objects', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        await dir.join('a.txt').touch()
        await dir.join('b.txt').touch()

        const files = await dir.readdir()
        const names = files.map(f => f.filename.toString()).sort()
        expect(names).toEqual(['a.txt', 'b.txt'])
      })

      it('throws if directory is missing', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        const ghost = dir.join('ghost-dir')
        await expect(() => ghost.readdir()).rejects.toThrow('ENOENT: no such file or directory')
      })

      it('returns [] if directory is missing and allowMissing is true', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        const ghost = dir.join('ghost-dir')
        const result = await ghost.readdir({ allowMissing: true })
        expect(result).toEqual([])
      })

      it('throws if called on a file', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        const file = dir.join('file.txt')
        await file.touch()
        await expect(() => file.readdir()).rejects.toThrow(/ENOTDIR/)
        await expect(() => file.readdir({ allowMissing: true })).rejects.toThrow(/ENOTDIR/)
      })

      it('filters files based on options', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        await dir.join('.hidden').touch()
        await dir.join('visible.txt').touch()
        await dir.join('subdir').mkdir()

        const all = await dir.readdir()
        expect(all.length).toBe(3)

        const onlyFiles = await dir.readdir({ onlyFiles: true })
        expect(onlyFiles.map(f => String(f.filename)).sort()).toEqual(['.hidden', 'visible.txt'])

        const onlyDirs = await dir.readdir({ onlyDirs: true })
        expect(onlyDirs.map(f => String(f.filename))).toEqual(['subdir'])

        const noDotfiles = await dir.readdir({ includeDotfiles: false })
        expect(noDotfiles.map(f => String(f.filename)).sort()).toEqual(['subdir', 'visible.txt'])
      })
    })

    describe('glob()', () => {
      it('returns matching files from a directory', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        await dir.join('foo.txt').touch()
        await dir.join('bar.log').touch()
        await dir.join('baz.txt').touch()

        const matches = await dir.glob('*.txt')
        const names = matches.map(p => p.filename.toString()).sort()
        expect(names).toEqual(['baz.txt', 'foo.txt'])
      })

      it('throws ENOTDIR if called on a file', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        const file = dir.join('some.txt')
        await file.touch()
        await expect(() => file.glob('*')).rejects.toThrow(/ENOTDIR/)
      })

      it('throws ENOENT if dir is missing and allowMissing is false', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        const missing = dir.join('ghost')
        await expect(() => missing.glob('*', { allowMissing: false })).rejects.toThrow(/ENOENT/)
      })

      it('returns [] if dir is missing and allowMissing is true', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        const missing = dir.join('ghost')
        const result = await missing.glob('*', { allowMissing: true })
        expect(result).toEqual([])
      })

      it('returns a directory if it matches the glob pattern', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        const subdir = dir.join('subdir')
        await subdir.mkdir()
        await subdir.join('file.txt').write('test content')

        const matches = await dir.glob('sub*')
        expect(matches.length).toBe(1)
        expect(matches[0]).toBeInstanceOf(FsPath)
        expect(String(matches[0])).toBe(String(subdir))
      })
    })
    
    describe('setPermissions', () => {
      let dir: FsPath
      let file: FsPath

      beforeEach(async () => {
        dir = await FsDisposablePath.makeTempDirectory()
        file = dir.join('test.txt')
        await file.write('hello')
      })

      it('applies numeric mode exactly', async () => {
        await file.setPermissions({ mode: 0o600 })
        const stat = await file.stat()
        expect(stat.mode & 0o777).toBe(0o600)
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
    })
  })


  describe('static methods', () => {

    it('cwd() returns current persistence directory', () => {
      const cwd = FsPath.cwd()
      expect(String(cwd)).toBe(process.cwd())
    })

  })
})

