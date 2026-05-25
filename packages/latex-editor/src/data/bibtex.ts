import type { BibtexEntryInfo, BibtexOptionalFields } from '../types'

// BibTeX entry types with required fields from LaTeX Workshop data/bibtex-entries.json
export const bibtexEntries: BibtexEntryInfo[] = [
  {
    type: 'article',
    fields: ['author', 'journal', 'number', 'title', 'volume', 'year']
  },
  {
    type: 'book',
    fields: ['author', 'editor', 'publisher', 'title', 'year']
  },
  {
    type: 'booklet',
    fields: ['author', 'title']
  },
  {
    type: 'conference',
    fields: ['author', 'booktitle', 'editor', 'title', 'year']
  },
  {
    type: 'inbook',
    fields: ['author', 'chapter', 'editor', 'pages', 'publisher', 'title', 'year']
  },
  {
    type: 'incollection',
    fields: ['author', 'booktitle', 'publisher', 'title', 'year']
  },
  {
    type: 'inproceedings',
    fields: ['author', 'booktitle', 'editor', 'title', 'year']
  },
  {
    type: 'manual',
    fields: ['author', 'title']
  },
  {
    type: 'mastersthesis',
    fields: ['author', 'school', 'title', 'year']
  },
  {
    type: 'misc',
    fields: ['author', 'howpublished', 'title', 'year']
  },
  {
    type: 'phdthesis',
    fields: ['author', 'school', 'title', 'year']
  },
  {
    type: 'proceedings',
    fields: ['editor', 'publisher', 'series', 'title', 'volume', 'year']
  },
  {
    type: 'techreport',
    fields: ['author', 'institution', 'title', 'year']
  },
  {
    type: 'unpublished',
    fields: ['author', 'note', 'title', 'year']
  },
  {
    type: 'online',
    fields: ['author', 'title', 'url', 'year']
  }
]

// Optional fields from LaTeX Workshop data/bibtex-optional-entries.json
export const bibtexOptionalFields: BibtexOptionalFields = {
  article: [
    'addendum', 'annotator', 'doi', 'editor', 'eprint', 'issn', 'issue',
    'language', 'month', 'note', 'pages', 'series', 'subtitle', 'url', 'urldate'
  ],
  book: [
    'addendum', 'afterword', 'chapter', 'doi', 'edition', 'eprint', 'isbn',
    'language', 'location', 'month', 'note', 'pages', 'series', 'subtitle',
    'translator', 'url', 'urldate', 'volume'
  ],
  inproceedings: [
    'addendum', 'address', 'doi', 'eprint', 'isbn', 'language', 'location',
    'month', 'note', 'number', 'organization', 'pages', 'publisher', 'series',
    'subtitle', 'url', 'urldate', 'volume'
  ],
  misc: [
    'addendum', 'doi', 'eprint', 'howpublished', 'language', 'location',
    'month', 'note', 'organization', 'subtitle', 'type', 'url', 'urldate', 'version'
  ],
  phdthesis: [
    'addendum', 'address', 'doi', 'eprint', 'isbn', 'language', 'location',
    'month', 'note', 'pages', 'subtitle', 'type', 'url', 'urldate'
  ],
  online: [
    'addendum', 'language', 'month', 'note', 'organization', 'subtitle',
    'urldate', 'version'
  ]
}

// Create BibTeX entry snippet
export function createBibtexEntrySnippet(entry: BibtexEntryInfo): string {
  let snippet = `${entry.type}{\${1:key}`
  let placeholderIndex = 2

  for (const field of entry.fields) {
    snippet += `,\n  ${field} = {\${${placeholderIndex}:}}`
    placeholderIndex++
  }

  snippet += '\n}'
  return snippet
}

// Create BibTeX field snippet
export function createBibtexFieldSnippet(field: string): string {
  return `${field} = {\${1:}},`
}
