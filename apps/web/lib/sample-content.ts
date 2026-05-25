export const DEFAULT_LATEX = String.raw`\documentclass{article}
\usepackage[utf8]{inputenc}
\usepackage[T2A]{fontenc}
\usepackage[english,russian]{babel}
\usepackage{amsmath}

\title{Новый проект}
\author{}
\date{\today}

\begin{document}
\maketitle

\section{Введение}
Это пустой LaTeX-проект. Печатайте здесь — изменения видны соавторам в реальном времени.

\section{Пример}
\begin{equation}
  E = mc^2
\end{equation}

\end{document}
`

export const DEFAULT_BIBTEX = String.raw`@article{einstein1905,
  author  = {Albert Einstein},
  title   = {Zur Elektrodynamik bewegter K\"orper},
  journal = {Annalen der Physik},
  year    = {1905},
  volume  = {17},
  pages   = {891--921}
}
`
