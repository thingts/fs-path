import { Filename } from '$src'
import { describe, it, expect } from 'vitest'

describe('Filename', () => {

  describe('constructor', () => {
    it('constructs from a string', () => {
      const f = new Filename('example.txt')
      expect(String(f)).toBe('example.txt')
    })

    it('throws if filename contains path components', () => {
      expect(() => new Filename('/foo/bar/baz.txt')).toThrow('must not contain path components')
    })
  })

  it('tests equality of paths', () => {
    const f1 = new Filename('A.txt')
    const f2 = new Filename('A.txt')
    const f3 = new Filename('B.txt')
    expect(f1.equals(f2)).toBe(true)
    expect(f1.equals(f3)).toBe(false)
  })


  describe('filename properties and manipulation', () => {

    describe('stem and extension', () => {
      it('handles filenames with extension', () => {
        const f = new Filename('baz.txt')
        expect(f.stem).toBe('baz')
        expect(f.extension).toBe('.txt')
      })

      it('handles filenames without extension', () => {
        const f = new Filename('baz')
        expect(f.stem).toBe('baz')
        expect(f.extension).toBe('')
      })

      it('handles filenames with multiple dots', () => {
        const f = new Filename('file.name.txt')
        expect(f.stem).toBe('file.name')
        expect(f.extension).toBe('.txt')
      })

      it('handles dotfiles with no extension', () => {
        const f = new Filename('.gitignore')
        expect(f.stem).toBe('.gitignore')
        expect(f.extension).toBe('')
      })

      it('handles dotfiles with extensions', () => {
        const f = new Filename('.env.local')
        expect(f.stem).toBe('.env')
        expect(f.extension).toBe('.local')
      })

    })

    it('can replace stem and extension', () => {
      const f = new Filename('file.txt')
      expect(String(f.replaceStem('file2'))).toBe('file2.txt')
      expect(String(f.replaceExtension('.md'))).toBe('file.md')
    })

    it('can transform filename with a function', () => {
      const f = new Filename('file.txt')
      const transformed = f.transform(name => name.toUpperCase())
      expect(String(transformed)).toBe('FILE.TXT')
    })

  })

  it('toString and valueOf yield the path string', () => {
    const f = new Filename('example.txt')
    expect(f.toString()).toBe('example.txt')
    expect(f.valueOf()).toBe('example.txt')
  })

  describe('Filename.isFilenameString', () => {
    it('returns true for valid filenames', () => {
      expect(Filename.isFilenameString('file.txt')).toBe(true)
      expect(Filename.isFilenameString('another_file')).toBe(true)
    })

    it('returns false for filenames with path components', () => {
      expect(Filename.isFilenameString('/path/to/file.txt')).toBe(false)
      expect(Filename.isFilenameString('folder/file.txt')).toBe(false)
    })
  })
})
