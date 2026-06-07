import { redirect } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { getOptionalUser } from "@/lib/auth"
import { AuthForm } from "./_components/auth-form"
import { DemoButtons } from "./_components/demo-buttons"
import { TestUserButton } from "./_components/test-user-button"

export default async function LoginPage() {
  const user = await getOptionalUser()
  if (user) redirect("/projects")

  const testEmail = process.env.TEST_USER_EMAIL
  const showTestButton = Boolean(testEmail && process.env.TEST_USER_PASSWORD)

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl text-2xl font-bold tracking-tight select-none">
            T<span className="text-primary/60 text-lg">e</span>X
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Kursach LaTeX Editor</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Collaborative LaTeX editing in real time
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Welcome</CardTitle>
            <CardDescription>
              Sign in to your projects or create a new account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <AuthForm />
            <div className="relative">
              <Separator />
              <span className="bg-card text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs uppercase tracking-wide">
                demo accounts
              </span>
            </div>
            <DemoButtons />
            {showTestButton ? (
              <>
                <div className="relative">
                  <Separator />
                  <span className="bg-card text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs uppercase tracking-wide">
                    dev only
                  </span>
                </div>
                <TestUserButton email={testEmail!} />
              </>
            ) : null}
          </CardContent>
        </Card>

        <p className="text-muted-foreground/60 text-center text-xs">
          Built with Next.js, Supabase & Liveblocks
        </p>
      </div>
    </div>
  )
}
