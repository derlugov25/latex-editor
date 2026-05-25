import type { MonacoApi } from "../types"

const BIBTEX_ENTRY_TYPES = [
  "article", "book", "booklet", "conference", "inbook", "incollection",
  "inproceedings", "manual", "mastersthesis", "misc", "phdthesis",
  "proceedings", "techreport", "unpublished", "online",
]

export function registerBibtexLanguage(monaco: MonacoApi): void {
  const has = monaco.languages.getLanguages().some((l) => l.id === "bibtex")
  if (has) return

  monaco.languages.register({ id: "bibtex", extensions: [".bib"] })

  monaco.languages.setLanguageConfiguration("bibtex", {
    comments: { lineComment: "%" },
    brackets: [
      ["{", "}"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
    ],
  })

  monaco.languages.setMonarchTokensProvider("bibtex", {
    defaultToken: "",
    tokenPostfix: ".bibtex",
    entryTypes: BIBTEX_ENTRY_TYPES,
    tokenizer: {
      root: [
        [/%.*$/, "comment"],
        [
          /@[a-zA-Z]+/,
          { cases: { "@entryTypes": "keyword", "@default": "tag" } },
        ],
        [/[a-zA-Z_][a-zA-Z0-9_]*\s*=/, "variable"],
        [/"[^"]*"/, "string"],
        [/\{[^{}]*\}/, "string"],
        [/[{}()]/, "@brackets"],
        [/\d+/, "number"],
      ],
    },
  })
}
