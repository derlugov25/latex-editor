import type { CitationItem, LabelItem } from "../types"

const labelStore: LabelItem[] = []
const citationStore: CitationItem[] = []

export function addLabel(label: LabelItem): void {
  const i = labelStore.findIndex((l) => l.label === label.label)
  if (i >= 0) labelStore[i] = label
  else labelStore.push(label)
}

export function removeLabel(labelText: string): void {
  const i = labelStore.findIndex((l) => l.label === labelText)
  if (i >= 0) labelStore.splice(i, 1)
}

export function clearLabels(): void {
  labelStore.length = 0
}

export function getLabels(): LabelItem[] {
  return [...labelStore]
}

export function addCitation(citation: CitationItem): void {
  const i = citationStore.findIndex((c) => c.key === citation.key)
  if (i >= 0) citationStore[i] = citation
  else citationStore.push(citation)
}

export function removeCitation(key: string): void {
  const i = citationStore.findIndex((c) => c.key === key)
  if (i >= 0) citationStore.splice(i, 1)
}

export function clearCitations(): void {
  citationStore.length = 0
}

export function getCitations(): CitationItem[] {
  return [...citationStore]
}
