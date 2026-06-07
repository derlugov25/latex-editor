import type { LiveblocksYjsProvider } from "@liveblocks/yjs"

/** The awareness instance exposed by the Liveblocks Yjs provider. */
type ProviderAwareness = LiveblocksYjsProvider["awareness"]

/** Shape of the `user` field we publish into the awareness channel. */
interface AwarenessUser {
  name?: string
  color?: string
}

const FALLBACK_COLOR = "#64748b"
const MAX_NAME_LENGTH = 40

/**
 * Keep a single `<style>` element in sync with the room's awareness so each
 * remote collaborator's caret renders in their own color with their name.
 *
 * y-monaco decorates every peer's selection with the classes
 * `yRemoteSelection-<clientId>` / `yRemoteSelectionHead-<clientId>` but never
 * colors or labels them — that is left to the integrator. We translate each
 * peer's awareness `user` field into per-client CSS custom properties
 * (`--yc`, `--yc-name`) that the base rules in `globals.css` consume.
 *
 * @returns a disposer that detaches the listener and removes the styles.
 */
export function attachRemoteCursorStyles(awareness: ProviderAwareness): () => void {
  if (typeof document === "undefined") return () => {}

  const style = document.createElement("style")
  style.dataset.yjsRemoteCursors = ""
  document.head.append(style)

  const render = () => {
    const localId = awareness.doc.clientID
    const rules: string[] = []
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === localId) return
      const user = (state as { user?: AwarenessUser } | null | undefined)?.user
      rules.push(
        clientRules(clientId, cssColor(user?.color), cssString(user?.name ?? "Anonymous")),
      )
    })
    style.textContent = rules.join("\n")
  }

  render()
  awareness.on("change", render)

  return () => {
    awareness.off("change", render)
    style.remove()
  }
}

/** Per-client rule wiring this peer's color + name into the shared base styles. */
function clientRules(clientId: number, color: string, name: string): string {
  return (
    `.yRemoteSelection-${clientId},` +
    `.yRemoteSelectionHead-${clientId}{--yc:${color};--yc-name:${name}}`
  )
}

/** Allow only hex / rgb(a) colors; fall back to a neutral slate otherwise. */
function cssColor(value: string | undefined): string {
  if (value && /^#[0-9a-fA-F]{3,8}$|^rgba?\([\d.,%\s/]+\)$/.test(value)) {
    return value
  }
  return FALLBACK_COLOR
}

/**
 * Escape an arbitrary display name into a safe quoted CSS string. Names are
 * user-controlled, so this guards against breaking out of the `content` value.
 */
function cssString(value: string): string {
  let out = '"'
  for (const ch of value.slice(0, MAX_NAME_LENGTH)) {
    const code = ch.codePointAt(0) ?? 0
    if (ch === '"' || ch === "\\") {
      out += "\\" + ch
    } else if (code < 0x20) {
      // Control chars (incl. newlines) -> CSS unicode escape with trailing space.
      out += "\\" + code.toString(16) + " "
    } else {
      out += ch
    }
  }
  return out + '"'
}
