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
import { TestUserButton } from "./_components/test-user-button"

export default async function LoginPage() {
  const user = await getOptionalUser()
  if (user) redirect("/projects")

  const testEmail = process.env.TEST_USER_EMAIL
  const showTestButton = Boolean(testEmail && process.env.TEST_USER_PASSWORD)

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Kursach LaTeX Editor</CardTitle>
          <CardDescription>
            Sign in to your projects or create a new account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <AuthForm />
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
    </div>
  )
}
