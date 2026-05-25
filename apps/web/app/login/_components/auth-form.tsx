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

const INITIAL: AuthFormState = {}

export function AuthForm() {
  return (
    <Tabs defaultValue="signin" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign in</TabsTrigger>
        <TabsTrigger value="signup">Create account</TabsTrigger>
      </TabsList>
      <TabsContent value="signin" className="pt-4">
        <AuthFields action={signInAction} submitLabel="Sign in" />
      </TabsContent>
      <TabsContent value="signup" className="pt-4">
        <AuthFields action={signUpAction} submitLabel="Create account" />
      </TabsContent>
    </Tabs>
  )
}

interface AuthFieldsProps {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>
  submitLabel: string
}

function AuthFields({ action, submitLabel }: AuthFieldsProps) {
  const [state, dispatch] = useActionState(action, INITIAL)
  return (
    <form action={dispatch} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
