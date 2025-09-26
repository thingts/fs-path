import { FsAbsolutePath, FsFilename, FsRelativePath } from '$src'
import { describe, it, expect } from 'vitest'

describe('FsAbsolutePath', () => {

  describe('constructor', () => {
    it('normalizes paths', () => {
      const p = new FsAbsolutePath('/foo/../bar/.//baz.txt/')
      expect(String(p)).toBe('/bar/baz.txt')
    })

  })

  describe('path properties and manipulation', () => {

    it('tests equality of paths', () => {
      const p1 = new FsAbsolutePath('/foo/bar/A.txt')
      const p2 = new FsAbsolutePath('/foo/bar/A.txt')
      const p3 = new FsAbsolutePath('/foo/bar/B.txt')
      expect(p1.equals(p2)).toBe(true)
      expect(p1.equals(p3)).toBe(false)
      expect(p1.equals('/foo/bar/A.txt/')).toBe(true)
    })

    it('exposes filename, stem, extension', () => {
      const p = new FsAbsolutePath('/tmp/foo/bar/file.test.txt')
      expect(p.filename).toBeInstanceOf(FsFilename)
      expect(String(p.filename)).toBe('file.test.txt')
      expect(p.stem).toBe('file.test')
      expect(p.extension).toBe('.txt')
    })

    it('exposes parent directory as FsAbsolutePath', () => {
      const p = new FsAbsolutePath('/tmp/foo/bar/file.txt')
      const parent = p.parent
      expect(parent).toBeInstanceOf(FsAbsolutePath)
      expect(String(parent)).toBe('/tmp/foo/bar')
    })

    it('can replace filename, stem, extension, parent', () => {
      const p = new FsAbsolutePath('/foo/bar/file.txt')
      const p1 = p.replaceFilename('x.y')
      expect(p1).toBeInstanceOf(FsAbsolutePath)
      expect(String(p1)).toBe('/foo/bar/x.y')

      const p2 = p.replaceStem('file2')
      expect(p2).toBeInstanceOf(FsAbsolutePath)
      expect(String(p2)).toBe('/foo/bar/file2.txt')

      const p3 = p.replaceExtension('.md')
      expect(p3).toBeInstanceOf(FsAbsolutePath)
      expect(String(p3)).toBe('/foo/bar/file.md')

      const p4 = p.replaceParent('/tmp')
      expect(p4).toBeInstanceOf(FsAbsolutePath)
      expect(String(p4)).toBe('/tmp/file.txt')
    })

    it('can transform filename', () => {
      const p = new FsAbsolutePath('/foo/bar/file.txt')
      const p1 = p.transformFilename(fn => {
        expect(fn).toBeInstanceOf(FsFilename)
        return fn.toString().toUpperCase()
      })
      expect(p1).toBeInstanceOf(FsAbsolutePath)
      expect(String(p1)).toBe('/foo/bar/FILE.TXT')
    })

    it('can join segments to form a new path', () => {
      const p = new FsAbsolutePath('/foo/bar')
      expect(p.join('baz.txt')).toBeInstanceOf(FsAbsolutePath)
      expect(String(p.join('baz.txt'))).toBe('/foo/bar/baz.txt')
      expect(String(p.join('baz', null, 'qux.txt'))).toBe('/foo/bar/baz/qux.txt')
    })

    it('can extract relative path', () => {
      const base = new FsAbsolutePath('/foo/bar')
      const child = new FsAbsolutePath('/foo/bar/baz/qux.txt')
      const relpath = child.relativeTo(base)
      expect(relpath).toBeInstanceOf(FsRelativePath)
      expect(String(relpath)).toBe('baz/qux.txt')
    })

    describe('descendsFrom()', () => {
      const base = new FsAbsolutePath('/foo/bar')
      const child = new FsAbsolutePath('/foo/bar/baz/qux.txt')
      const sibling = new FsAbsolutePath('/foo/bar2')
      const self = new FsAbsolutePath('/foo/bar')

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
        const base = new FsAbsolutePath('/foo/bar')
        const result = base.resolve('baz')
        expect(result).toBeInstanceOf(FsAbsolutePath)
        expect(String(result)).toBe('/foo/bar/baz')
      })

      it('resets to absolute if the segment starts with a slash', () => {
        const base = new FsAbsolutePath('/foo/bar')
        const result = base.resolve('/absolute/path')
        expect(result).toBeInstanceOf(FsAbsolutePath)
        expect(String(result)).toBe('/absolute/path')
      })

      it('resolves upward navigation segments correctly', () => {
        const base = new FsAbsolutePath('/foo/bar')
        const result = base.resolve('../baz')
        expect(result).toBeInstanceOf(FsAbsolutePath)
        expect(String(result)).toBe('/foo/baz')
      })

      it('resolves multiple segments including an absolute reset', () => {
        const base = new FsAbsolutePath('/foo/bar')
        const result = base.resolve('a', '/b', 'c')
        expect(result).toBeInstanceOf(FsAbsolutePath)
        expect(String(result)).toBe('/b/c')
      })

      it('ignores null and undefined segments', () => {
        const base = new FsAbsolutePath('/foo/bar')
        const result = base.resolve(null, 'baz', undefined)
        expect(result).toBeInstanceOf(FsAbsolutePath)
        expect(String(result)).toBe('/foo/bar/baz')
      })
    })

  })

  it('toString and valueOf yield the path string', () => {
    const p = new FsAbsolutePath('/tmp/example.txt')
    expect(p.toString()).toBe('/tmp/example.txt')
    expect(p.valueOf()).toBe('/tmp/example.txt')
  })

  describe('FsAbsolutePath.isAbsolutePathString', () => {
    it('returns true for absolute paths', () => {
      expect(FsAbsolutePath.isAbsolutePathString('/foo/bar/baz.txt')).toBe(true)
    })

    it('returns false for relative paths', () => {
      expect(FsAbsolutePath.isAbsolutePathString('foo/bar/baz.txt')).toBe(false)
      expect(FsAbsolutePath.isAbsolutePathString('./foo/bar/baz.txt')).toBe(false)
      expect(FsAbsolutePath.isAbsolutePathString('../foo/bar/baz.txt')).toBe(false)
      expect(FsAbsolutePath.isAbsolutePathString('plain')).toBe(false)
    })
  })

})
