import type { CompileAsset } from "@workspace/compiler-client/types"
import type { Workdir } from "./workdir"

const MAX_ASSET_BYTES = Number(
  process.env.COMPILER_MAX_ASSET_BYTES ?? 25 * 1024 * 1024
)
const MAX_TOTAL_ASSET_BYTES = Number(
  process.env.COMPILER_MAX_TOTAL_ASSET_BYTES ?? 100 * 1024 * 1024
)
const DOWNLOAD_TIMEOUT_MS = Number(
  process.env.COMPILER_ASSET_TIMEOUT_MS ?? 30_000
)
const CONCURRENCY = 4

/** Comma-separated host suffixes asset URLs must match (empty = allow any https). */
const ALLOWED_HOSTS = (process.env.COMPILER_ASSET_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean)

export class AssetError extends Error {}

function assertAllowedUrl(raw: string, path: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new AssetError(`Asset "${path}" has an invalid URL`)
  }
  if (url.protocol !== "https:") {
    throw new AssetError(`Asset "${path}" must use an https URL`)
  }
  if (
    ALLOWED_HOSTS.length > 0 &&
    !ALLOWED_HOSTS.some(
      (h) => url.hostname === h || url.hostname.endsWith(`.${h}`)
    )
  ) {
    throw new AssetError(`Asset "${path}" points at a disallowed host`)
  }
  return url
}

/**
 * Download every asset into the work tree. Throws `AssetError` on the first
 * failure (bad URL, size cap, HTTP error) — a compile with missing figures
 * would only fail later with a more confusing TeX log.
 */
export async function downloadAssets(
  workdir: Workdir,
  assets: CompileAsset[]
): Promise<void> {
  let totalBytes = 0
  const queue = [...assets]

  const worker = async () => {
    for (;;) {
      const asset = queue.shift()
      if (!asset) return
      assertAllowedUrl(asset.url, asset.path)

      let response: Response
      try {
        response = await fetch(asset.url, {
          signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
          redirect: "error",
        })
      } catch {
        throw new AssetError(`Asset "${asset.path}" could not be downloaded`)
      }
      if (!response.ok) {
        throw new AssetError(
          `Asset "${asset.path}" download failed with HTTP ${response.status}`
        )
      }

      const declared = Number(response.headers.get("content-length") ?? 0)
      if (declared > MAX_ASSET_BYTES) {
        throw new AssetError(`Asset "${asset.path}" exceeds the size limit`)
      }

      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.byteLength > MAX_ASSET_BYTES) {
        throw new AssetError(`Asset "${asset.path}" exceeds the size limit`)
      }
      totalBytes += bytes.byteLength
      if (totalBytes > MAX_TOTAL_ASSET_BYTES) {
        throw new AssetError("Combined asset size exceeds the limit")
      }

      await workdir.writeFile(asset.path, bytes)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, assets.length) }, worker)
  )
}
