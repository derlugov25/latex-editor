import { listProjects } from "@workspace/supabase/projects"
import { requireUser } from "@/lib/auth"
import {
  isMissingSchemaError,
  isRlsRecursionError,
} from "@/lib/supabase-errors"
import { AppHeader } from "./_components/header"
import { DatabaseSetupRequired } from "./_components/database-setup-required"
import { NewProjectDialog } from "./_components/new-project-dialog"
import { ProjectCard } from "./_components/project-card"

export default async function ProjectsPage() {
  const { supabase, user } = await requireUser()

  let projects
  try {
    projects = await listProjects(supabase)
  } catch (err) {
    if (isMissingSchemaError(err)) {
      return <DatabaseSetupRequired email={user.email ?? null} />
    }
    if (isRlsRecursionError(err)) {
      return (
        <DatabaseSetupRequired
          email={user.email ?? null}
          reason="rls_recursion"
        />
      )
    }
    throw err
  }

  const ownedProjects = projects.filter((p) => p.owner_id === user.id)
  const sharedProjects = projects.filter((p) => p.owner_id !== user.id)

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader email={user.email ?? null} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Your projects</h1>
            <p className="text-muted-foreground text-sm">
              {ownedProjects.length === 0
                ? "Create your first LaTeX project to get started."
                : `${ownedProjects.length} project${ownedProjects.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <NewProjectDialog />
        </div>

        {ownedProjects.length === 0 ? (
          <div className="border-muted-foreground/20 grid place-items-center rounded-xl border border-dashed p-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-2xl">
                <span className="text-2xl font-bold tracking-tight select-none opacity-40">
                  T<span className="text-lg">e</span>X
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No projects yet</p>
                <p className="text-muted-foreground text-sm">
                  Click <strong>New project</strong> above to create your first LaTeX document.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownedProjects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}

        {sharedProjects.length > 0 && (
          <>
            <div className="mb-4 mt-10">
              <h2 className="text-xl font-semibold">Shared with you</h2>
              <p className="text-muted-foreground text-sm">
                {sharedProjects.length} project{sharedProjects.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sharedProjects.map((p) => (
                <ProjectCard key={p.id} project={p} isShared />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
