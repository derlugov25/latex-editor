import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { AppHeader } from "./header"

interface DatabaseSetupRequiredProps {
  email: string | null
  reason?: "missing_tables" | "rls_recursion"
}

export function DatabaseSetupRequired({
  email,
  reason = "missing_tables",
}: DatabaseSetupRequiredProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader email={email} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>
              {reason === "rls_recursion"
                ? "Database policy fix required"
                : "Database setup required"}
            </CardTitle>
            <CardDescription>
              {reason === "rls_recursion" ? (
                <>
                  Row-level security policies are causing infinite recursion
                  (error <code className="text-sm">42P17</code>). Run the fix
                  migration below in Supabase SQL Editor, then reload.
                </>
              ) : (
                <>
                  Supabase does not have the{" "}
                  <code className="text-sm">projects</code> table yet. Run the SQL
                  migrations in your project dashboard, then reload this page.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4 text-sm">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Open{" "}
                <a
                  href="https://supabase.com/dashboard"
                  className="text-foreground underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Supabase Dashboard
                </a>{" "}
                → your project → <strong>SQL Editor</strong>.
              </li>
              <li>
                Paste and run{" "}
                <code className="text-foreground text-xs">
                  packages/supabase/sql/001_projects.sql
                </code>
                .
              </li>
              {reason === "missing_tables" ? (
                <li>
                  For sharing / invites, also run{" "}
                  <code className="text-foreground text-xs">
                    packages/supabase/sql/002_collaboration.sql
                  </code>
                  .
                </li>
              ) : (
                <li>
                  Run{" "}
                  <code className="text-foreground text-xs">
                    packages/supabase/sql/003_fix_rls_recursion.sql
                  </code>
                  .
                </li>
              )}
            </ol>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
