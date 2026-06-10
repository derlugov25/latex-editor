"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  signInAction,
  signUpAction,
  type AuthFormState,
} from "../actions"
import { USERNAME_RULE_HINT } from "@/lib/username"

const INITIAL: AuthFormState = {}

export function AuthForm() {
  return (
    <Tabs defaultValue="signin" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign in</TabsTrigger>
        <TabsTrigger value="signup">Create account</TabsTrigger>
      </TabsList>
      <TabsContent value="signin" className="pt-4">
        <AuthFields action={signInAction} submitLabel="Sign in" mode="signin" />
      </TabsContent>
      <TabsContent value="signup" className="pt-4">
        <AuthFields
          action={signUpAction}
          submitLabel="Create account"
          mode="signup"
        />
      </TabsContent>
    </Tabs>
  )
}

interface AuthFieldsProps {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>
  submitLabel: string
  mode: "signin" | "signup"
}

function AuthFields({ action, submitLabel, mode }: AuthFieldsProps) {
  const [state, dispatch] = useActionState(action, INITIAL)
  const isSignup = mode === "signup"
  return (
    <form action={dispatch} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${mode}-username`}>
          {isSignup ? "Username" : "Username or email"}
        </Label>
        <Input
          id={`${mode}-username`}
          name={isSignup ? "username" : "identifier"}
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          placeholder={isSignup ? "e.g. alice" : "alice or you@example.com"}
        />
        {isSignup ? (
          <p className="text-muted-foreground text-xs">{USERNAME_RULE_HINT}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${mode}-password`}>Password</Label>
        <Input
          id={`${mode}-password`}
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={6}
          required
        />
      </div>
      {state.error ? (
        <p className="text-destructive text-sm">{state.error}</p>
      ) : null}
      {state.notice ? (
        <p className="text-muted-foreground text-sm">{state.notice}</p>
      ) : null}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  )
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Please wait…" : children}
    </Button>
  )
}
