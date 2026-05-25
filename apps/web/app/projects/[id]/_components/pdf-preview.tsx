"use client"

import { RiFilePdf2Line } from "@remixicon/react"
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
}

export function PdfPreview({ pdfUrl, error, log }: PdfPreviewProps) {
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

  if (!pdfUrl) {
    return (
      <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <RiFilePdf2Line className="size-10 opacity-40" />
        <p className="text-sm">Click <strong>Compile</strong> to render the PDF.</p>
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
