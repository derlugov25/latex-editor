"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  CompileFailure,
  compileLatex,
  type WebCompileRequest,
} from "@workspace/compiler-client"

interface UseCompileOptions {
  compilerUrl: string
}

export interface CompileState {
  pdfUrl: string | null
  error: string | null
  log: string | null
  isCompiling: boolean
  compile(request: WebCompileRequest): Promise<void>
}

export function useCompile({ compilerUrl }: UseCompileOptions): CompileState {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [log, setLog] = useState<string | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const previousUrlRef = useRef<string | null>(null)

  useEffect(() => () => {
    if (previousUrlRef.current) URL.revokeObjectURL(previousUrlRef.current)
  }, [])

  const compile = useCallback(
    async (request: WebCompileRequest) => {
      setIsCompiling(true)
      setError(null)
      setLog(null)
      try {
        const result = await compileLatex(request, { baseUrl: compilerUrl })
        if (previousUrlRef.current) URL.revokeObjectURL(previousUrlRef.current)
        previousUrlRef.current = result.pdfUrl
        setPdfUrl(result.pdfUrl)
      } catch (err) {
        if (err instanceof CompileFailure) {
          setError(err.message)
          setLog(err.log ?? null)
        } else {
          setError((err as Error).message)
        }
      } finally {
        setIsCompiling(false)
      }
    },
    [compilerUrl],
  )

  return { pdfUrl, error, log, isCompiling, compile }
}
