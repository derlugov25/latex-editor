/**
 * Provision (or update) the dev test user via Supabase's admin API so it can
 * sign in without going through email confirmation. Idempotent.
 *
 * Run from `apps/web`:
 *   pnpm seed:test-user
 *
 * Reads SUPABASE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, TEST_USER_EMAIL,
 * TEST_USER_PASSWORD from .env.local (via Node's --env-file flag).
 */
import { createClient } from "@supabase/supabase-js"

const url = required("NEXT_PUBLIC_SUPABASE_URL")
const secretKey = required("SUPABASE_SECRET_KEY")
const email = required("TEST_USER_EMAIL")
const password = required("TEST_USER_PASSWORD")

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const existing = await findUserByEmail(email)

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  })
  if (error) throw error
  console.log(`✓ Updated existing test user ${email} (id=${existing.id})`)
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Test User" },
  })
  if (error) throw error
  console.log(`✓ Created test user ${email} (id=${data.user?.id})`)
}

async function findUserByEmail(target: string) {
  // listUsers paginates 50 per page; for a dev workspace one page is plenty.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) throw error
  return data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase()) ?? null
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`✗ Missing env var ${name}. Set it in apps/web/.env.local.`)
    process.exit(1)
  }
  return value
}
