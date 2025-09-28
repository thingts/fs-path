import child_process from 'node:child_process'
import { Filename, RelativePath, FsPath } from '$src'
import { beforeEach, describe, it, expect } from 'vitest'
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

    describe('makeDirectory()', () => {
      it ('throws if trying to create an existing directory', async () => {
        const subdir = await root.join('sub').makeDirectory()
        await expect(subdir.makeDirectory()).rejects.toThrow(/EEXIST/)
      })

      it ('doesn\'t throw if trying to create an existing directory with makeParents: true', async () => {
        const subdir = await root.join('sub').makeDirectory()
        await expect(subdir.makeDirectory({ makeParents: true})).resolves.toBeDefined()
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
    })

    describe('readdir()', () => {
      it('returns FsPath objects', async () => {
        await root.join('a.txt').touch()
        await root.join('b.txt').touch()

        const files = await root.readdir()
        const names = files.map(f => f.filename.toString()).sort()
        expect(names).toEqual(['a.txt', 'b.txt'])
      })

      it('throws if directory is missing', async () => {
        const ghost = root.join('ghost-dir')
        await expect(() => ghost.readdir()).rejects.toThrow('ENOENT: no such file or directory')
      })

      it('returns [] if directory is missing and allowMissing is true', async () => {
        const ghost = root.join('ghost-dir')
        const result = await ghost.readdir({ allowMissing: true })
        expect(result).toEqual([])
      })

      it('throws if called on a file', async () => {
        const file = await root.join('file.txt').touch()
        await expect(() => file.readdir()).rejects.toThrow(/ENOTDIR/)
        await expect(() => file.readdir({ allowMissing: true })).rejects.toThrow(/ENOTDIR/)
      })

      it('filters files based on options', async () => {
        await root.join('.hidden').touch()
        await root.join('visible.txt').touch()
        await root.join('subdir').makeDirectory()

        const all = await root.readdir()
        expect(all.length).toBe(3)

        const onlyFiles = await root.readdir({ onlyFiles: true })
        expect(onlyFiles.map(f => String(f.filename)).sort()).toEqual(['.hidden', 'visible.txt'])

        const onlyDirs = await root.readdir({ onlyDirs: true })
        expect(onlyDirs.map(f => String(f.filename))).toEqual(['subdir'])

        const noDotfiles = await root.readdir({ includeDotfiles: false })
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

    it('disposes on gc', async () => {
      if (!global.gc) {
        expect('gc() is not available. set config poolOptions.forks.execArgv === ["--expose-gc"]').toBe(false)
      }

      const file = await root.join('file.txt').touch()
      expect(await file.exists()).toBe(true)

      let disposable: FsPath | null = new FsPath(file).disposable()
      expect(await disposable.exists()).toBe(true)
      disposable = null
      for (let i = 0; i < 10; i++) {
        global.gc!()                            // eslint-disable-line @typescript-eslint/no-non-null-assertion
        await new Promise(r => setTimeout(r, 100))
        if (!await file.exists()) { break }
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
  })


  describe('static methods', () => {

    it('cwd() returns current persistence directory', () => {
      const cwd = FsPath.cwd()
      expect(String(cwd)).toBe(process.cwd())
    })

    describe('makeTempDirectory()', () => {
      it('creates a scratch directory under system tmpdir', async () => {
        const dir = await FsPath.makeTempDirectory()
        expect(dir).toBeInstanceOf(FsPath)
        expect(dir.descendsFrom(tmpdir())).toBe(true)
        expect(await dir.exists()).toBe(true)
      })

      it('creates a scratch directory with a prefix', async () => {
        const prefix = 'mytest-'
        const dir = await FsPath.makeTempDirectory({ prefix })
        expect(String(dir.filename)).toMatch(/^mytest-/)
        expect(await dir.exists()).toBe(true)
      })
    })

  })

})

