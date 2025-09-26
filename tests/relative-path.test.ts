import { Filename, RelativePath } from '$src'
import { describe, it, expect } from 'vitest'

describe('RelativePath', () => {

  describe('constructor', () => {

    it('normalizes paths', () => {
      const p = new RelativePath('./foo/../bar/./baz.txt/')
      expect(p.toString()).toBe('bar/baz.txt')
    })

    it('throws if given an absolute path', () => {
      expect(() => new RelativePath('/absolute/path.txt')).toThrow(/absolute/)
    })

    it('normalizes empty paths to "."', () => {
      expect(String(new RelativePath(''))).toBe('.')
      expect(String(new RelativePath('.'))).toBe('.')
      expect(String(new RelativePath('./'))).toBe('.')
      expect(String(new RelativePath('./foo/../'))).toBe('.')
      expect(String(new RelativePath('./foo/..'))).toBe('.')
    })


  })

  it('tests equality of paths', () => {
    const p1 = new RelativePath('foo/bar/A.txt')
    const p2 = new RelativePath('foo/bar/A.txt')
    const p3 = new RelativePath('foo/bar/B.txt')
    expect(p1.equals(p2)).toBe(true)
    expect(p1.equals(p3)).toBe(false)
    expect(p1.equals('./foo/bar/A.txt/')).toBe(true)
  })

  it('toString and valueOf yield the path string', () => {
    const p = new RelativePath('tmp/example.txt')
    expect(p.toString()).toBe('tmp/example.txt')
    expect(p.valueOf()).toBe('tmp/example.txt')
  })



  describe('path properties and manipulation', () => {

    it('exposes filename, stem, extension', () => {
      const p = new RelativePath('tmp/foo/bar/file.test.txt')
      expect(p.filename).toBeInstanceOf(Filename)
      expect(String(p.filename)).toBe('file.test.txt')
      expect(p.stem).toBe('file.test')
      expect(p.extension).toBe('.txt')
    })

    it('exposes parent directory as RelativePath', () => {
      const p = new RelativePath('tmp/foo/bar/file.txt')
      const parent = p.parent
      expect(parent).toBeInstanceOf(RelativePath)
      expect(String(parent)).toBe('tmp/foo/bar')
    })

    it('can replace filname, stem, extension, parent', () => {
      const p = new RelativePath('foo/bar/file.txt')

      const p1 = p.replaceFilename('x.y')
      expect(p1).toBeInstanceOf(RelativePath)
      expect(String(p1)).toBe('foo/bar/x.y')

      const p2 = p.replaceStem('file2')
      expect(p2).toBeInstanceOf(RelativePath)
      expect(String(p2)).toBe('foo/bar/file2.txt')

      const p3 = p.replaceExtension('.md')
      expect(p3).toBeInstanceOf(RelativePath)
      expect(String(p3)).toBe('foo/bar/file.md')

      const p4 = p.replaceParent('tmp')
      expect(p4).toBeInstanceOf(RelativePath)
      expect(String(p4)).toBe('tmp/file.txt')
    })

    it('can transform filename', () => {
      const p = new RelativePath('foo/bar/file.txt')
      const p1 = p.transformFilename(filename => {
        expect(filename).toBeInstanceOf(Filename)
        return filename.toString().toUpperCase()
      })
      expect(p1).toBeInstanceOf(RelativePath)
      expect(String(p1)).toBe('foo/bar/FILE.TXT')
    })

    it('can join segments to form a new path', () => {
      const p = new RelativePath('foo/bar')

      const p1 = p.join('baz.txt')
      expect(p1).toBeInstanceOf(RelativePath)
      expect(String(p1)).toBe('foo/bar/baz.txt')

      expect(String(p.join('baz', null, 'qux.txt'))).toBe('foo/bar/baz/qux.txt')
    })

  })

  describe('RelativePath.isRelativePathString', () => {
    it('returns true for valid relative paths', () => {
      expect(RelativePath.isRelativePathString('foo/bar/file.txt')).toBe(true)
      expect(RelativePath.isRelativePathString('./relative/path')).toBe(true)
      expect(RelativePath.isRelativePathString('..')).toBe(true)
      expect(RelativePath.isRelativePathString('plain')).toBe(true)
    })

    it('returns false for absolute paths', () => {
      expect(RelativePath.isRelativePathString('/absolute/path.txt')).toBe(false)
    })
  })

})
