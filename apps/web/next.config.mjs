/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@workspace/latex-editor",
    "@workspace/collab",
    "@workspace/compiler-client",
    "@workspace/supabase",
  ],
}

export default nextConfig
