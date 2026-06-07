import { randomUUID } from "node:crypto"
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

export interface Workdir {
  path: string
  writeFile(name: string, content: string): Promise<string>
  readFile(name: string): Promise<Buffer>
  cleanup(): Promise<void>
}

export async function createWorkdir(): Promise<Workdir> {
  const path = join(tmpdir(), `latex-compile-${randomUUID()}`)
  await mkdir(path, { recursive: true })
  await symlink(
    "/opt/compiler-fonts",
    join(path, "compiler-fonts"),
    "dir"
  ).catch(() => {})

  return {
    path,
    async writeFile(name, content) {
      const full = join(path, name)
      await writeFile(full, content, "utf-8")
      return full
    },
    async readFile(name) {
      return readFile(join(path, name))
    },
    async cleanup() {
      await rm(path, { recursive: true, force: true }).catch(() => {})
    },
  }
}
