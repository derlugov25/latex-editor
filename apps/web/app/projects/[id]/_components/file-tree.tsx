"use client"

import { useMemo, useRef, useState, type FormEvent } from "react"
import {
  RiAddLine,
  RiFile3Line,
  RiFilePdf2Line,
  RiFileTextLine,
  RiFolder3Fill,
  RiFolderOpenFill,
  RiImageLine,
  RiLoader4Line,
  RiMore2Fill,
  RiUpload2Line,
} from "@remixicon/react"
import { isImagePath, pathExtension } from "@workspace/compiler-client/paths"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import type { ProjectFileEntry } from "./use-project-files"

interface FileTreeProps {
  files: ProjectFileEntry[]
  activeFileId: string | null
  mainFileId: string | null
  uploading: boolean
  onOpen(fileId: string): void
  /** Returns an error message to show in the dialog, or null on success. */
  onCreateFile(path: string): string | null
  onRename(fileId: string, newPath: string): string | null
  onDelete(fileId: string): void
  onSetMain(fileId: string): void
  onUpload(files: File[]): void
}

interface Folder {
  name: string
  path: string
  folders: Map<string, Folder>
  files: ProjectFileEntry[]
}

function buildTree(files: ProjectFileEntry[]): Folder {
  const root: Folder = { name: "", path: "", folders: new Map(), files: [] }
  for (const file of files) {
    const segments = file.path.split("/")
    let node = root
    for (const segment of segments.slice(0, -1)) {
      let next = node.folders.get(segment)
      if (!next) {
        next = {
          name: segment,
          path: node.path ? `${node.path}/${segment}` : segment,
          folders: new Map(),
          files: [],
        }
        node.folders.set(segment, next)
      }
      node = next
    }
    node.files.push(file)
  }
  return root
}

function FileIcon({ path }: { path: string }) {
  const ext = pathExtension(path)
  const className = "size-4 shrink-0 text-muted-foreground"
  if (isImagePath(path)) return <RiImageLine className={className} />
  if (ext === "pdf") return <RiFilePdf2Line className={className} />
  if (ext === "tex" || ext === "bib" || ext === "sty" || ext === "cls") {
    return <RiFileTextLine className={className} />
  }
  return <RiFile3Line className={className} />
}

type DialogState =
  | { mode: "create" }
  | { mode: "rename"; file: ProjectFileEntry }
  | { mode: "delete"; file: ProjectFileEntry }
  | null

export function FileTree({
  files,
  activeFileId,
  mainFileId,
  uploading,
  onOpen,
  onCreateFile,
  onRename,
  onDelete,
  onSetMain,
  onUpload,
}: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<DialogState>(null)
  const [dialogValue, setDialogValue] = useState("")
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleFolder = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const openDialog = (state: NonNullable<DialogState>) => {
    setDialogError(null)
    setDialogValue(state.mode === "rename" ? state.file.path : "")
    setDialog(state)
  }

  const submitDialog = (event?: FormEvent) => {
    event?.preventDefault()
    if (!dialog) return
    if (dialog.mode === "delete") {
      onDelete(dialog.file.id)
      setDialog(null)
      return
    }
    const error =
      dialog.mode === "create"
        ? onCreateFile(dialogValue)
        : onRename(dialog.file.id, dialogValue)
    if (error) setDialogError(error)
    else setDialog(null)
  }

  const renderFolder = (folder: Folder, depth: number): React.ReactNode => {
    const sortedFolders = [...folder.folders.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    )
    return (
      <div key={folder.path || "(root)"}>
        {sortedFolders.map((sub) => {
          const isCollapsed = collapsed.has(sub.path)
          return (
            <div key={sub.path}>
              <button
                type="button"
                onClick={() => toggleFolder(sub.path)}
                className="hover:bg-muted/60 flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm"
                style={{ paddingLeft: `${8 + depth * 14}px` }}
              >
                {isCollapsed ? (
                  <RiFolder3Fill className="size-4 shrink-0 text-sky-600/80" />
                ) : (
                  <RiFolderOpenFill className="size-4 shrink-0 text-sky-600/80" />
                )}
                <span className="truncate">{sub.name}</span>
              </button>
              {!isCollapsed && renderFolder(sub, depth + 1)}
            </div>
          )
        })}
        {folder.files.map((file) => {
          const name = file.path.split("/").pop() ?? file.path
          const isActive = file.id === activeFileId
          const isMain = file.id === mainFileId
          return (
            <div
              key={file.id}
              className={cn(
                "group flex items-center gap-1.5 rounded-md pr-1 text-sm",
                isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
              )}
              style={{ paddingLeft: `${8 + depth * 14}px` }}
            >
              <button
                type="button"
                onClick={() => onOpen(file.id)}
                className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
                title={file.path}
              >
                <FileIcon path={file.path} />
                <span className="truncate">{name}</span>
                {isMain ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="bg-primary/10 text-primary rounded px-1 text-[10px] font-medium">
                        main
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Root document for compilation</TooltipContent>
                  </Tooltip>
                ) : null}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                  >
                    <RiMore2Fill className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {file.kind === "text" && pathExtension(file.path) === "tex" && !isMain ? (
                    <>
                      <DropdownMenuItem onClick={() => onSetMain(file.id)}>
                        Set as main file
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
                  <DropdownMenuItem onClick={() => openDialog({ mode: "rename", file })}>
                    Rename / move
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => openDialog({ mode: "delete", file })}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        dragOver && "ring-primary/60 ring-2 ring-inset",
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const dropped = [...e.dataTransfer.files]
        if (dropped.length > 0) onUpload(dropped)
      }}
    >
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <span className="text-muted-foreground flex-1 px-1 text-xs font-medium tracking-wide uppercase">
          Files
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => openDialog({ mode: "create" })}
          >
            <RiAddLine className="size-4" />
          </Button>
          </TooltipTrigger>
          <TooltipContent>{'New file (folders via "/")'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <RiLoader4Line className="size-4 animate-spin" />
              ) : (
                <RiUpload2Line className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upload files (or drag & drop)</TooltipContent>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const picked = [...(e.target.files ?? [])]
            e.target.value = ""
            if (picked.length > 0) onUpload(picked)
          }}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1.5">{renderFolder(tree, 0)}</div>
      </ScrollArea>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          {dialog?.mode === "delete" ? (
            <>
              <DialogHeader>
                <DialogTitle>Delete {dialog.file.path}?</DialogTitle>
                <DialogDescription>
                  The file is removed for every collaborator. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialog(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => submitDialog()}>
                  Delete
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={submitDialog} className="space-y-4">
              <DialogHeader>
                <DialogTitle>
                  {dialog?.mode === "create" ? "New file" : "Rename / move file"}
                </DialogTitle>
                <DialogDescription>
                  {'Use "/" to place the file in a folder, e.g. '}
                  <code className="font-mono text-xs">sections/intro.tex</code>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Input
                  autoFocus
                  value={dialogValue}
                  onChange={(e) => {
                    setDialogValue(e.target.value)
                    setDialogError(null)
                  }}
                  placeholder="sections/intro.tex"
                />
                {dialogError ? (
                  <p className="text-destructive text-xs">{dialogError}</p>
                ) : null}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {dialog?.mode === "create" ? "Create" : "Rename"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
