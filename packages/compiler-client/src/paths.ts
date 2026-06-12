/**
 * Project-relative file path rules shared by the web app (validation at file
 * creation/upload) and the compiler service (defense before writing to disk).
 *
 * Paths use "/" separators, never start with "/" or contain "." / ".."
 * segments, and stay within a sane depth/length. Unicode file names are
 * allowed (e.g. Cyrillic), control characters and Windows-reserved
 * punctuation are not.
 */

export const MAX_PATH_LENGTH = 240
export const MAX_PATH_DEPTH = 10

// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARS = /[\u0000-\u001f\u007f\\:*?"<>|]/

/** Trim, drop leading "./" and "/", collapse duplicate slashes, NFC-normalize. */
export function normalizeProjectPath(input: string): string {
  let path = input.normalize("NFC").trim().replace(/\\/g, "/")
  path = path.replace(/\/{2,}/g, "/")
  path = path.replace(/^(\.?\/)+/, "")
  path = path.replace(/\/+$/, "")
  return path
}

/** Why a path was rejected, suitable for showing to the user. */
export function projectPathError(path: string): string | null {
  if (path.length === 0) return "File name is empty"
  if (path.length > MAX_PATH_LENGTH)
    return `Path is longer than ${MAX_PATH_LENGTH} characters`
  if (FORBIDDEN_CHARS.test(path)) return "Path contains forbidden characters"
  const segments = path.split("/")
  if (segments.length > MAX_PATH_DEPTH)
    return `Folders are nested deeper than ${MAX_PATH_DEPTH} levels`
  for (const segment of segments) {
    if (segment.length === 0) return "Path contains an empty segment"
    if (segment === "." || segment === "..") return "Path may not contain . or .. segments"
    if (segment.startsWith(".")) return "File and folder names may not start with a dot"
    if (segment.endsWith(" ") || segment.endsWith("."))
      return "File and folder names may not end with a space or dot"
  }
  return null
}

export function isValidProjectPath(path: string): boolean {
  return projectPathError(path) === null
}

const TEXT_EXTENSIONS = new Set([
  "tex", "bib", "sty", "cls", "bst", "txt", "md", "csv", "tsv", "dat",
  "tikz", "json", "yml", "yaml", "toml", "log", "lst", "def", "clo",
])

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"])

export function pathExtension(path: string): string {
  const name = path.split("/").pop() ?? ""
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ""
}

/** Whether a file at this path is edited as text (lives in Yjs) or stored as a binary blob. */
export function classifyPath(path: string): "text" | "binary" {
  return TEXT_EXTENSIONS.has(pathExtension(path)) ? "text" : "binary"
}

export function isImagePath(path: string): boolean {
  return IMAGE_EXTENSIONS.has(pathExtension(path))
}

/** Monaco language id for a text file. */
export function languageForPath(path: string): "latex" | "bibtex" | "plaintext" {
  const ext = pathExtension(path)
  if (ext === "bib") return "bibtex"
  if (ext === "tex" || ext === "sty" || ext === "cls" || ext === "tikz" || ext === "def" || ext === "clo") {
    return "latex"
  }
  return "plaintext"
}
