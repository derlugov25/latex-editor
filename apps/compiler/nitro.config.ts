import { defineNitroConfig } from "nitro/config"

export default defineNitroConfig({
  scanDirs: ["server"],
  routeRules: {
    "/**": {
      cors: true,
      headers: {
        "Access-Control-Allow-Origin": process.env.COMPILER_ALLOWED_ORIGIN ?? "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  },
  devServer: {
    port: Number(process.env.COMPILER_PORT ?? 3001),
  },
})
