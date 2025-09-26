import { FsDisposablePath } from '$src'
import { describe, it, expect } from 'vitest'
import { tmpdir } from 'node:os'

describe('FsDisposablePath', () => {

  describe('static methods', () => {

    describe('makeTempDirectory()', () => {
      it('creates a scratch directory under system tmpdir', async () => {
        const dir = await FsDisposablePath.makeTempDirectory()
        expect(dir).toBeInstanceOf(FsDisposablePath)
        expect(dir.descendsFrom(tmpdir())).toBe(true)
        expect(await dir.exists()).toBe(true)
      })

      it('creates a scratch directory with a prefix', async () => {
        const prefix = 'mytest-'
        const dir = await FsDisposablePath.makeTempDirectory({ prefix })
        expect(String(dir.filename)).toMatch(/^mytest-/)
        expect(await dir.exists()).toBe(true)
      })
    })
  })

  describe('dispose', () => {

    it('disposes via using block', async () => {
      const root = await FsDisposablePath.makeTempDirectory()

      const file = root.join('file.txt')
      const dir = root.join('dir')

      await file.write('hello')
      await dir.mkdir()

      {
        using useFile = new FsDisposablePath(file)
        using useDir = new FsDisposablePath(dir)
        expect(await useFile.exists()).toBe(true)
        expect(await useDir.exists()).toBe(true)
      }
      expect(await file.exists()).toBe(false)
      expect(await dir.exists()).toBe(false)
    })
  })

})
