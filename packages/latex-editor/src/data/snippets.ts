import type { SnippetInfo } from '../types'

// LaTeX snippets from LaTeX Workshop data/latex-snippet.json
export const snippets: SnippetInfo[] = [
  // Environment snippets
  { prefix: 'BEQ', body: '\\begin{equation}\n\t$0\n\\end{equation}', description: 'equation environment' },
  { prefix: 'BSEQ', body: '\\begin{equation*}\n\t$0\n\\end{equation*}', description: 'equation* environment' },
  { prefix: 'BAL', body: '\\begin{align}\n\t$0\n\\end{align}', description: 'align environment' },
  { prefix: 'BSAL', body: '\\begin{align*}\n\t$0\n\\end{align*}', description: 'align* environment' },
  { prefix: 'BGA', body: '\\begin{gather}\n\t$0\n\\end{gather}', description: 'gather environment' },
  { prefix: 'BSGA', body: '\\begin{gather*}\n\t$0\n\\end{gather*}', description: 'gather* environment' },
  { prefix: 'BMU', body: '\\begin{multline}\n\t$0\n\\end{multline}', description: 'multline environment' },
  { prefix: 'BSMU', body: '\\begin{multline*}\n\t$0\n\\end{multline*}', description: 'multline* environment' },
  { prefix: 'BIT', body: '\\begin{itemize}\n\t\\item $0\n\\end{itemize}', description: 'itemize environment' },
  { prefix: 'BEN', body: '\\begin{enumerate}\n\t\\item $0\n\\end{enumerate}', description: 'enumerate environment' },
  { prefix: 'BSPL', body: '\\begin{split}\n\t$0\n\\end{split}', description: 'split environment' },
  { prefix: 'BCAS', body: '\\begin{cases}\n\t$0\n\\end{cases}', description: 'cases environment' },
  { prefix: 'BFR', body: '\\begin{frame}\n\t\\frametitle{${1:<title>}}\n\n\t$0\n\\end{frame}', description: 'frame (beamer)' },
  { prefix: 'BFI', body: '\\begin{figure}[${1:htbp}]\n\t\\centering\n\t$0\n\t\\caption{${2:<caption>}}\n\t\\label{${3:<label>}}\n\\end{figure}', description: 'figure' },
  { prefix: 'BTA', body: '\\begin{table}[${1:htbp}]\n\t\\centering\n\t\\begin{tabular}{${4:<columns>}}\n\t\t$0\n\t\\end{tabular}\n\t\\caption{${2:<caption>}}\n\t\\label{${3:<label>}}\n\\end{table}', description: 'table (caption after)' },
  { prefix: 'BTB', body: '\\begin{table}[${1:htbp}]\n\t\\centering\n\t\\caption{${2:<caption>}}\n\t\\label{${3:<label>}}\n\t\\begin{tabular}{${4:<columns>}}\n\t\t$0\n\t\\end{tabular}\n\\end{table}', description: 'table (caption before)' },
  { prefix: 'BTC', body: '\\begin{tikzcd}\n\t$0\n\\end{tikzcd}', description: 'tikzcd' },
  { prefix: 'BTP', body: '\\begin{tikzpicture}\n\t$0\n\\end{tikzpicture}', description: 'tikzpicture' },

  // Font snippets
  { prefix: 'FNO', body: '\\textnormal{${1:text}}', description: 'normal font' },
  { prefix: 'FRM', body: '\\textrm{${1:text}}', description: 'roman font' },
  { prefix: 'FEM', body: '\\emph{${1:text}}', description: 'emphasis font' },
  { prefix: 'FSF', body: '\\textsf{${1:text}}', description: 'sans serif font' },
  { prefix: 'FTT', body: '\\texttt{${1:text}}', description: 'typewriter font' },
  { prefix: 'FIT', body: '\\textit{${1:text}}', description: 'italic font' },
  { prefix: 'FSL', body: '\\textsl{${1:text}}', description: 'slanted font' },
  { prefix: 'FSC', body: '\\textsc{${1:text}}', description: 'smallcaps font' },
  { prefix: 'FUL', body: '\\underline{${1:text}}', description: 'underline text' },
  { prefix: 'FUC', body: '\\uppercase{${1:text}}', description: 'uppercase text' },
  { prefix: 'FLC', body: '\\lowercase{${1:text}}', description: 'lowercase text' },
  { prefix: 'FBF', body: '\\textbf{${1:text}}', description: 'bold font' },
  { prefix: 'FSS', body: '\\textsuperscript{${1:text}}', description: 'superscript' },
  { prefix: 'FBS', body: '\\textsubscript{${1:text}}', description: 'subscript' },

  // Math font snippets
  { prefix: 'MRM', body: '\\mathrm{${1:text}}', description: 'math roman font' },
  { prefix: 'MSF', body: '\\mathsf{${1:text}}', description: 'math sans serif font' },
  { prefix: 'MBF', body: '\\mathbf{${1:text}}', description: 'math bold font' },
  { prefix: 'MBB', body: '\\mathbb{${1:text}}', description: 'math blackboard bold' },
  { prefix: 'MCA', body: '\\mathcal{${1:text}}', description: 'math caligraphic font' },
  { prefix: 'MIT', body: '\\mathit{${1:text}}', description: 'math italic font' },
  { prefix: 'MTT', body: '\\mathtt{${1:text}}', description: 'math typewriter font' },

  // Section snippets
  { prefix: 'SPA', body: '\\part{${1}}', description: 'part' },
  { prefix: 'SCH', body: '\\chapter{${1}}', description: 'chapter' },
  { prefix: 'SSE', body: '\\section{${1}}', description: 'section' },
  { prefix: 'SSS', body: '\\subsection{${1}}', description: 'subsection' },
  { prefix: 'SS2', body: '\\subsubsection{${1}}', description: 'subsubsection' },
  { prefix: 'SPG', body: '\\paragraph{${1}}', description: 'paragraph' },
  { prefix: 'SSP', body: '\\subparagraph{${1}}', description: 'subparagraph' },

  // Other common snippets
  { prefix: 'item', body: '\n\\item ', description: '\\item on a newline' },
  { prefix: '__', body: '_{${1}}', description: 'subscript' },
  { prefix: '**', body: '^{${1}}', description: 'superscript' },
  { prefix: '...', body: '\\dots', description: '\\dots' },
]
