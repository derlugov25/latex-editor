"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { RiUserLine } from "@remixicon/react"
import { Button } from "@workspace/ui/components/button"
import { signInAsDemoAction, type AuthFormState } from "../actions"

const INITIAL: AuthFormState = {}

// Public labels only — credentials live server-side in actions.ts (DEMO_ACCOUNTS).
const DEMO_BUTTONS = [
  { id: "alice", name: "Alice" },
  { id: "bob", name: "Bob" },
]

export function DemoButtons() {
  return (
    <div className="grid gap-2">
      {DEMO_BUTTONS.map((demo) => (
        <DemoButton key={demo.id} id={demo.id} name={demo.name} />
      ))}
    </div>
  )
}

function DemoButton({ id, name }: { id: string; name: string }) {
  const [state, dispatch] = useActionState(
    async () => signInAsDemoAction(id),
    INITIAL
  )
  return (
    <form action={dispatch} className="grid gap-1">
      <SubmitButton name={name} />
      {state.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
    </form>
  )
}

function SubmitButton({ name }: { name: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="w-full"
    >
      <RiUserLine className="size-4" />
      {pending ? "Signing in…" : `Continue as ${name}`}
    </Button>
  )
}
