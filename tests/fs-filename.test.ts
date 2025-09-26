import { FsFilename } from '$src'
import { describe, it, expect } from 'vitest'

describe('FsFilename', () => {

  describe('constructor', () => {
    it('constructs from a string', () => {
      const f = new FsFilename('example.txt')
      expect(String(f)).toBe('example.txt')
    })

    it('throws if filename contains path components', () => {
      expect(() => new FsFilename('/foo/bar/baz.txt')).toThrow('must not contain path components')
    })
  })

  it('tests equality of paths', () => {
    const f1 = new FsFilename('A.txt')
    const f2 = new FsFilename('A.txt')
    const f3 = new FsFilename('B.txt')
    expect(f1.equals(f2)).toBe(true)
    expect(f1.equals(f3)).toBe(false)
  })


  describe('filename properties and manipulation', () => {

    describe('stem and extension', () => {
      it('handles filenames with extension', () => {
        const f = new FsFilename('baz.txt')
        expect(f.stem).toBe('baz')
        expect(f.extension).toBe('.txt')
      })

      it('handles filenames without extension', () => {
        const f = new FsFilename('baz')
        expect(f.stem).toBe('baz')
        expect(f.extension).toBe('')
      })

      it('handles filenames with multiple dots', () => {
        const f = new FsFilename('file.name.txt')
        expect(f.stem).toBe('file.name')
        expect(f.extension).toBe('.txt')
      })

      it('handles dotfiles with no extension', () => {
        const f = new FsFilename('.gitignore')
        expect(f.stem).toBe('.gitignore')
        expect(f.extension).toBe('')
      })

      it('handles dotfiles with extensions', () => {
        const f = new FsFilename('.env.local')
        expect(f.stem).toBe('.env')
        expect(f.extension).toBe('.local')
      })

    })

    it('can replace stem and extension', () => {
      const f = new FsFilename('file.txt')
      expect(String(f.replaceStem('file2'))).toBe('file2.txt')
      expect(String(f.replaceExtension('.md'))).toBe('file.md')
    })

    it('can transform filename with a function', () => {
      const f = new FsFilename('file.txt')
      const transformed = f.transform(name => name.toUpperCase())
      expect(String(transformed)).toBe('FILE.TXT')
    })

  })

  it('toString and valueOf yield the path string', () => {
    const f = new FsFilename('example.txt')
    expect(f.toString()).toBe('example.txt')
    expect(f.valueOf()).toBe('example.txt')
  })

  describe('FsFilename.isFilenameString', () => {
    it('returns true for valid filenames', () => {
      expect(FsFilename.isFilenameString('file.txt')).toBe(true)
      expect(FsFilename.isFilenameString('another_file')).toBe(true)
    })

    it('returns false for filenames with path components', () => {
      expect(FsFilename.isFilenameString('/path/to/file.txt')).toBe(false)
      expect(FsFilename.isFilenameString('folder/file.txt')).toBe(false)
    })
  })
})
