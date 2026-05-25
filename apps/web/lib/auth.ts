import { redirect } from "next/navigation"
import { createClient } from "@workspace/supabase/server"

/** Resolve the current Supabase user, or redirect to `/login` if there is none. */
export async function requireUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect("/login")
  return { supabase, user: data.user }
}

/** Resolve the current user without redirecting. Returns `null` when signed out. */
export async function getOptionalUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}
