import type { MonacoApi } from "../types"

const LATEX_KEYWORDS = [
  "begin", "end", "documentclass", "usepackage", "newcommand", "renewcommand",
  "section", "subsection", "subsubsection", "chapter", "part",
  "title", "author", "date", "maketitle",
  "textbf", "textit", "emph", "underline",
  "cite", "ref", "label", "caption",
  "includegraphics", "input", "include",
]

export function registerLatexLanguage(monaco: MonacoApi): void {
  const has = monaco.languages.getLanguages().some((l) => l.id === "latex")
  if (has) return

  monaco.languages.register({
    id: "latex",
    extensions: [".tex", ".ltx", ".sty", ".cls"],
  })

  monaco.languages.setLanguageConfiguration("latex", {
    comments: { lineComment: "%" },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "$", close: "$" },
      { open: "`", close: "'" },
      { open: '"', close: '"' },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "$", close: "$" },
      { open: "`", close: "'" },
    ],
    folding: {
      markers: { start: /\\begin\{/, end: /\\end\{/ },
    },
  })

  monaco.languages.setMonarchTokensProvider("latex", {
    defaultToken: "",
    tokenPostfix: ".latex",
    keywords: LATEX_KEYWORDS,
    brackets: [
      { open: "{", close: "}", token: "delimiter.curly" },
      { open: "[", close: "]", token: "delimiter.bracket" },
      { open: "(", close: ")", token: "delimiter.parenthesis" },
    ],
    tokenizer: {
      root: [
        [/%.*$/, "comment"],
        [/\$\$/, { token: "string.math", next: "@mathDisplay" }],
        [/\$/, { token: "string.math", next: "@mathInline" }],
        [/\\\[/, { token: "string.math", next: "@mathDisplay" }],
        [/\\\(/, { token: "string.math", next: "@mathInline" }],
        [
          /\\[a-zA-Z@]+\*?/,
          { cases: { "@keywords": "keyword", "@default": "tag" } },
        ],
        [/\\[{}$%&_#~^]/, "string.escape"],
        [/\\begin\{([^}]+)\}/, "keyword"],
        [/\\end\{([^}]+)\}/, "keyword"],
        [/[{}[\]()]/, "@brackets"],
        [/\d+/, "number"],
      ],
      mathInline: [
        [/[^$\\]+/, "string.math"],
        [/\\\$/, "string.math"],
        [/\\[a-zA-Z]+/, "string.math.command"],
        [/\$/, { token: "string.math", next: "@pop" }],
      ],
      mathDisplay: [
        [/[^$\\]+/, "string.math"],
        [/\\\$/, "string.math"],
        [/\\[a-zA-Z]+/, "string.math.command"],
        [/\$\$/, { token: "string.math", next: "@pop" }],
        [/\\\]/, { token: "string.math", next: "@pop" }],
      ],
    },
  })
}
