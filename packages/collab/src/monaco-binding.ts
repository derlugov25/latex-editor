import type { LiveblocksYjsProvider } from "@liveblocks/yjs"
import { MonacoBinding } from "y-monaco"
import type * as Monaco from "monaco-editor"
import type * as Y from "yjs"

export interface BindMonacoOptions {
  editor: Monaco.editor.IStandaloneCodeEditor
  doc: Y.Doc
  provider: LiveblocksYjsProvider
  /** Name of the shared text inside the Y.Doc (default `"latex"`). */
  textName?: string
  /** Initial value to seed the shared text with if the doc is empty. */
  seed?: string
}

export interface MonacoBindingHandle {
  binding: MonacoBinding
  text: Y.Text
  dispose: () => void
}

/**
 * Bind a Monaco editor to a Y.Text inside the given Y.Doc, wiring presence
 * (cursors/selections) through the Liveblocks awareness channel.
 */
export function bindMonacoToYjs(opts: BindMonacoOptions): MonacoBindingHandle {
  const { editor, doc, provider, textName = "latex", seed } = opts
  const text = doc.getText(textName)

  if (seed && text.length === 0) {
    text.insert(0, seed)
  }

  const model = editor.getModel()
  if (!model) throw new Error("bindMonacoToYjs: editor has no model")

  // y-monaco expects the y-protocols Awareness instance. Liveblocks' Yjs
  // provider exposes a compatible one via `provider.awareness`; cast through
  // unknown to bridge nominal-type differences between bundled copies.
  const awareness = provider.awareness as unknown as
    | ConstructorParameters<typeof MonacoBinding>[3]
    | undefined
  const binding = new MonacoBinding(text, model, new Set([editor]), awareness)

  return {
    binding,
    text,
    dispose() {
      binding.destroy()
    },
  }
}
