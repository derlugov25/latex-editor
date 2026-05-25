"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { RiFlaskLine } from "@remixicon/react"
import { Button } from "@workspace/ui/components/button"
import {
  signInAsTestUserAction,
  type AuthFormState,
} from "../actions"

const INITIAL: AuthFormState = {}

export function TestUserButton({ email }: { email: string }) {
  const [state, dispatch] = useActionState(
    async () => signInAsTestUserAction(),
    INITIAL,
  )

  return (
    <form action={dispatch} className="grid gap-2">
      <SubmitButton email={email} />
      {state.error ? (
        <p className="text-destructive text-xs">{state.error}</p>
      ) : null}
    </form>
  )
}

function SubmitButton({ email }: { email: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="outline" disabled={pending} className="w-full">
      <RiFlaskLine className="size-4" />
      {pending ? "Signing in…" : `Sign in as ${email}`}
    </Button>
  )
}
