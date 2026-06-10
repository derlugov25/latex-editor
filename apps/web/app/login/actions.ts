"use server"

import { redirect } from "next/navigation"
import { createClient } from "@workspace/supabase/server"
import { createAdminClient } from "@workspace/supabase/admin"
import {
  identifierToEmail,
  normalizeUsername,
  USERNAME_RULE_HINT,
} from "@/lib/username"

export interface AuthFormState {
  error?: string
  notice?: string
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const identifier = String(formData.get("identifier") ?? "")
  const password = String(formData.get("password") ?? "")
  if (!identifier.trim() || !password) {
    return { error: "Username and password are required." }
  }

  const email = identifierToEmail(identifier)
  if (!email) return { error: `Invalid username. ${USERNAME_RULE_HINT}` }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: "Invalid username or password." }
  redirect("/projects")
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const rawUsername = String(formData.get("username") ?? "")
  const password = String(formData.get("password") ?? "")

  const normalized = normalizeUsername(rawUsername)
  if (!normalized) return { error: `Invalid username. ${USERNAME_RULE_HINT}` }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." }
  }

  // Create an already-confirmed account through the admin API. This sends no
  // email at all, so Supabase's built-in email rate limits never apply and
  // sign-up works reliably during a live demo. Requires SUPABASE_SECRET_KEY.
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return {
      error: "Sign-up is unavailable: the server is missing SUPABASE_SECRET_KEY.",
    }
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email: normalized.email,
    password,
    email_confirm: true,
    user_metadata: { name: rawUsername.trim(), username: normalized.canonical },
  })
  if (createError) {
    if (isUsernameTakenError(createError)) {
      return { error: "That username is already taken." }
    }
    return { error: createError.message }
  }

  // Establish the auth-cookie session for the freshly created account.
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: normalized.email,
    password,
  })
  if (signInError) return { error: signInError.message }
  redirect("/projects")
}

/** True when admin.createUser failed because the username/email already exists. */
function isUsernameTakenError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const code = "code" in err ? String((err as { code: unknown }).code) : ""
  const message =
    "message" in err ? String((err as { message: unknown }).message) : ""
  return (
    code === "email_exists" ||
    code === "user_already_exists" ||
    /already.*(registered|exists)/i.test(message)
  )
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

/**
 * Dev-only: sign in as the test user provisioned by `pnpm seed:test-user`.
 * Returns a form-state error if the credentials aren't configured.
 */
export async function signInAsTestUserAction(): Promise<AuthFormState> {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) {
    return {
      error:
        "Test user is not configured. Set TEST_USER_EMAIL and TEST_USER_PASSWORD, then run `pnpm seed:test-user`.",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return {
      error: `${error.message}. Did you run \`pnpm seed:test-user\` against this Supabase project?`,
    }
  }
  redirect("/projects")
}

/**
 * Public demo accounts for one-click login (e.g. coursework review / demos).
 * The credentials are intentionally shared and pre-seeded in Supabase with the
 * email already confirmed — anyone visiting the site can sign in as them. They
 * stay server-side: this is a "use server" module, so these values are never
 * bundled into the browser. Remove the demo buttons and delete these accounts
 * before any real production use.
 */
const DEMO_ACCOUNTS: {
  id: string
  name: string
  email: string
  password: string
}[] = [
  {
    id: "alice",
    name: "Alice",
    email: "demo.alice@example.com",
    password: "Demo-Alice-2026",
  },
  {
    id: "bob",
    name: "Bob",
    email: "demo.bob@example.com",
    password: "Demo-Bob-2026",
  },
]

export async function signInAsDemoAction(id: string): Promise<AuthFormState> {
  const account = DEMO_ACCOUNTS.find((a) => a.id === id)
  if (!account) return { error: "Unknown demo account" }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  })
  if (error) return { error: error.message }
  redirect("/projects")
}
