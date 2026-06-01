"use client"

import { RiFilePdf2Line, RiLoader4Line } from "@remixicon/react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

interface PdfPreviewProps {
  pdfUrl: string | null
  error: string | null
  log: string | null
  isCompiling?: boolean
}

export function PdfPreview({ pdfUrl, error, log, isCompiling }: PdfPreviewProps) {
  if (error) {
    return (
      <div className="h-full overflow-hidden p-4">
        <Alert variant="destructive">
          <AlertTitle>Compilation failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        {log ? (
          <ScrollArea className="mt-4 h-[calc(100%-5rem)] rounded-md border">
            <pre className="text-muted-foreground p-4 font-mono text-xs whitespace-pre-wrap">
              {log}
            </pre>
          </ScrollArea>
        ) : null}
      </div>
    )
  }

  if (isCompiling) {
    return (
      <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <RiLoader4Line className="text-primary size-8 animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Compiling LaTeX...</p>
          <p className="text-xs opacity-60">This may take a few seconds</p>
        </div>
      </div>
    )
  }

  if (!pdfUrl) {
    return (
      <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="rounded-2xl bg-muted/50 p-4">
          <RiFilePdf2Line className="size-8 opacity-40" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">PDF Preview</p>
          <p className="text-xs opacity-60">
            Click <strong>Compile</strong> or press <kbd className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-mono">⌘↵</kbd> to render
          </p>
        </div>
      </div>
    )
  }

  return (
    <iframe
      src={pdfUrl}
      title="PDF preview"
      className="bg-background h-full w-full border-0"
    />
  )
}
