import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "act_session"

/**
 * Catch-all BFF proxy: forwards same-origin /api/* requests (minus /api/auth/*,
 * which have dedicated routes) to the Spring backend, attaching the session JWT
 * from the httpOnly cookie as the Authorization header. The backend URL is a
 * server-side env var (BACKEND_URL) and is never exposed to the browser.
 */
async function proxy(request: NextRequest, path: string[]) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8080"
  const target = `${backendUrl}/api/${path.join("/")}${request.nextUrl.search}`

  const headers = new Headers(request.headers)
  headers.delete("cookie")
  headers.delete("host")
  headers.delete("content-length")

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.body,
    // @ts-expect-error - required for streaming request bodies through undici
    duplex: "half",
  })

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  })
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "transfer-encoding" && key.toLowerCase() !== "content-encoding") {
      response.headers.set(key, value)
    }
  })
  return response
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await ctx.params).path)
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await ctx.params).path)
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await ctx.params).path)
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await ctx.params).path)
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await ctx.params).path)
}
