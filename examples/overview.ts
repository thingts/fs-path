import { FsPath } from '@thingts/fs-path'

// #### Normalize & resolve on construction

const normalized = new FsPath('/foo/../bar/file.txt')
normalized.equals('/bar/file.txt') // → true

const resolved = new FsPath('relative/to/cwd.txt')
resolved.equals(FsPath.cwd().join('relative/to/cwd.txt')) // → true

// #### Path parts & transforms

const path = new FsPath('/bar/file.txt')
path.toString()              // → '/bar/file.txt'
path.filename                // → Filename('file.txt')
path.filename.toString()     // → 'file.txt'
path.stem                    // → 'file'
path.extension               // → '.txt'
path.parent                  // → FsPath('/bar')
path.segments                // → ['bar', 'file.txt']
path.replaceStem('report')                           // → FsPath('/bar/report.txt')
path.replaceExtension('.md')                         // → FsPath('/bar/file.md')
path.replaceParent('/other')                         // → FsPath('/other/file.txt')
path.replaceFilename('REPORT.MD')                    // → FsPath('/bar/REPORT.MD')
path.transformFilename(f => String(f).toUpperCase()) // → FsPath('/bar/FILE.TXT')

// #### Navigation

const base = new FsPath('/projects/demo')
base.join('src/index.ts')                  // → FsPath('/projects/demo/src/index.ts')
base.join('/src/index.ts')                 // → FsPath('/projects/demo/src/index.ts')
base.resolve('src/index.ts')               // → FsPath('/projects/demo/src/index.ts')
base.resolve('/src/index.ts')              // → FsPath('/src/index.ts')
base.descendsFrom(new FsPath('/projects')) // → true
base.parent.equals('/projects')            // → true
const rel = base.join('src/main.ts').relativeTo(base) // → RelativePath('src/main.ts')

// #### Filesystem operations

const dir = new FsPath('/projects/demo')
const file = dir.join('logs/app.log')

// Writing and reading
await file.write('start\n', { makeParents: true })
await file.write('listening\n', { append: true })
await file.read()                  // → 'start\nlistening\n'
await file.readBytes({ size: 16 }) // → Buffer containing first 16 bytes
await file.readStream()            // → Readable stream of file contents

// File info
await file.exists()       // → true
await file.isFile()       // → true
await file.isDirectory()  // → false
await file.parent.isDirectory() // → true
await file.access('read')             // → true
await file.access(['read', 'write'])  // → true
await file.stat()         // → fs.Stats object
await file.realPath()     // → FsPath of the real path (resolving symlinks)

// Directory operations
await dir.join('sub').makeDirectory()
const entries = await dir.readDirectory()  // → [FsPath, ...]
const logs    = await dir.glob('**/*.log') // → [FsPath, ...]

// File and directory manipulation
const backupDir  = new FsPath('/projects/backup')
const backupFile = backupDir.join('app.log')
await file.copyTo(backupFile, { makeParents: true })    // copy file
await file.copyTo(backupDir, { intoDir: true })         // copy into a directory
await dir.copyTo(backupDir, { recursive: true })        // copy a directory recursively
await file.copyTo(backupFile, { overwrite: false })     // throws if destination exists
await file.moveTo(backupFile, { overwrite: true })      // move file, overwriting if exists
await file.moveTo(backupDir, { intoDir: true })         // move into a directory
await file.remove()                                     // remove file
await file.setPermissions({ mode: 0o600 })              // set file permissions mode
await file.setPermissions({ user: ['read', 'write'] })  // set permissions symbolically
await file.touch()                                      // update file timestamps or create if not exists

// #### Temporary (a.k.a. disposable) files and directories

// Explicit resource management
{
    using tempDir  = await FsPath.makeTempDirectory()                  // returns disposable directory
    using tempFile = new FsPath('/projects/tempfile.txt').disposable() // register for disposal

    tempDir.exists()        // → true
    tempFile.write('data')  // create file

    // tempDir and tempFile are removed when they go out of scope
}

// Removed eventually, on gc or exit
const gcDir  = await FsPath.makeTempDirectory()
const gcFile = new FsPath('/projects/tempfile.txt').disposable()
