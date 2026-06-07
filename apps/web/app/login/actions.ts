"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@workspace/supabase/server"

export interface AuthFormState {
  error?: string
  notice?: string
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!email || !password) return { error: "Email and password are required" }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  redirect("/projects")
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!email || !password) return { error: "Email and password are required" }

  const supabase = await createClient()
  const headerList = await headers()
  const origin = headerList.get("origin") ?? `https://${headerList.get("host")}`
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })
  if (error) return { error: error.message }
  if (data.session) redirect("/projects")
  return { notice: "Check your email to confirm the account." }
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
