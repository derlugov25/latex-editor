import { listProjects } from "@workspace/supabase/projects"
import { requireUser } from "@/lib/auth"
import { AppHeader } from "./_components/header"
import { NewProjectDialog } from "./_components/new-project-dialog"
import { ProjectCard } from "./_components/project-card"

export default async function ProjectsPage() {
  const { supabase, user } = await requireUser()
  const projects = await listProjects(supabase)

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader email={user.email ?? null} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Your projects</h1>
            <p className="text-muted-foreground text-sm">
              {projects.length === 0
                ? "Create your first LaTeX project to get started."
                : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <NewProjectDialog />
        </div>

        {projects.length === 0 ? (
          <div className="border-muted-foreground/20 grid place-items-center rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground text-sm">
              No projects yet. Click <strong>New project</strong> above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
