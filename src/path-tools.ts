// A minimal implementation of Node.js path module for non-node
// environments.  
//
// Only POSIX-style paths are supported.   Only implements the functions
// needed by this library

const SEPARATOR = '/'

export const sep = SEPARATOR

export function extname(filename: string): string {
  const dot = filename.lastIndexOf('.')
  const sep = filename.lastIndexOf(SEPARATOR)
  return (dot > 0 && dot > sep) ? filename.slice(dot) : ''
}

export function basename(filename: string, ext?: string): string {
  const base = filename.slice(filename.lastIndexOf(SEPARATOR) + 1)
  if (ext && base.endsWith(ext)) {
    return base.slice(0, base.length - ext.length)
  }
  return base
}

export function dirname(p: string): string {
  if (p.length === 0) { return '.' }

  // Strip trailing slashes (but not if the entire string is '/')
  while (p.length > 1 && p.endsWith(SEPARATOR)) {
    p = p.slice(0, -1)
  }

  const idx = p.lastIndexOf(SEPARATOR)

  if (idx === -1) return '.'        // No slash = current directory
  if (idx === 0)  return SEPARATOR  // Slash is at the start = root
  return p.slice(0, idx)
}


function joinOrResolve(segments: readonly (string | null | undefined)[], mode: 'join' | 'resolve' ): string {
  const filtered = segments.filter((s): s is string => !!s)
  const resolvedParts: string[] = []

  let firstSegment = segments[0]

  for (let i = filtered.length - 1; i >= 0; i--) {
    const segment = filtered[i]
    resolvedParts.unshift(...segment.split(SEPARATOR))
    if (mode === 'resolve' && segment.startsWith(SEPARATOR)) {
      firstSegment = segment
      break
    }
  }

  return (firstSegment?.startsWith(SEPARATOR) ? SEPARATOR : '') + normalizeSegments(resolvedParts)
}

function normalizeSegments(segments: readonly string[]): string {
  const normalized: string[] = []
  for (const segment of segments) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (normalized.length > 0 && normalized.at(-1) !== '..') normalized.pop()
    } else {
      normalized.push(segment)
    }
  }
  return normalized.join(SEPARATOR)
}


export function resolve(...segments: readonly (string | null | undefined)[]): string {
  return joinOrResolve(segments, 'resolve')
}

export function join(...segments: readonly (string | null | undefined)[]): string {
  return joinOrResolve(segments, 'join')
}


// Normalize a path, resolving '..' and '.' segments.
//
// Preserve leading '/' if present, remove leading './', remove trailing '/' unless the path is
// root '/'.  Empty path is normalized to '.'.
export function normalize(p: string): string {
  const leadingDot = '.' + SEPARATOR
  let normalized = normalizeSegments(p.split(SEPARATOR))
  if (isAbsolute(p)) { normalized = SEPARATOR + normalized }
  if (normalized.startsWith(leadingDot)) { normalized = normalized.slice(leadingDot.length) }
  if (normalized === SEPARATOR) { return normalized } // root
  if (normalized.endsWith(SEPARATOR)) { normalized = normalized.slice(0, -SEPARATOR.length) }
  if (normalized === '') { normalized = '.' }
  return normalized
}


export function relative(from: string, to: string): string {
  const fromParts = resolve(from).split(SEPARATOR).filter(Boolean)
  const toParts   = resolve(to).split(SEPARATOR).filter(Boolean)

  // Find common path prefix
  let i = 0
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i++
  }

  const upLevels = fromParts.length - i
  const downParts = toParts.slice(i)

  return [
    ...Array(upLevels).fill('..') as string[],
    ...downParts
  ].join('/') || '.'
}

export function isAbsolute(p: string): boolean {
  return p.startsWith(SEPARATOR)
}
