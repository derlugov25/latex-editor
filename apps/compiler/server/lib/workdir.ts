import { randomUUID } from "node:crypto"
import { mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve, sep } from "node:path"

export interface Workdir {
  path: string
  /** Resolve a project-relative path, throwing if it escapes the workdir. */
  resolveInside(name: string): string
  writeFile(name: string, content: string | Buffer): Promise<string>
  readFile(name: string): Promise<Buffer>
  cleanup(): Promise<void>
}

export async function createWorkdir(): Promise<Workdir> {
  let path = join(tmpdir(), `latex-compile-${randomUUID()}`)
  await mkdir(path, { recursive: true })
  // Pin down the real location so escape checks aren't fooled by a
  // symlinked tmpdir (macOS /tmp -> /private/tmp).
  path = await realpath(path)
  await symlink(
    "/opt/compiler-fonts",
    join(path, "compiler-fonts"),
    "dir"
  ).catch(() => {})

  const resolveInside = (name: string): string => {
    const full = resolve(path, name)
    if (full !== path && !full.startsWith(path + sep)) {
      throw new Error(`Path escapes the working directory: ${name}`)
    }
    return full
  }

  return {
    path,
    resolveInside,
    async writeFile(name, content) {
      const full = resolveInside(name)
      await mkdir(dirname(full), { recursive: true })
      await writeFile(full, content)
      return full
    },
    async readFile(name) {
      return readFile(resolveInside(name))
    },
    async cleanup() {
      await rm(path, { recursive: true, force: true }).catch(() => {})
    },
  }
}
