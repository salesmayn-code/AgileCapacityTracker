import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "act_session"

/**
 * Cookie secure flag: default-secure in production; COOKIE_SECURE=false opts out
 * for plain-http local parity (docker compose) without weakening prod.
 */
function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "false") return false
  return process.env.NODE_ENV === "production"
}

/**
 * POST /api/auth/login — proxies the backend login, stores the issued JWT in an
 * httpOnly cookie (the browser never sees the token), and returns the user JSON.
 */
export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8080"
  const body = await request.text()

  const upstream = await fetch(`${backendUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })

  if (!upstream.ok) {
    return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status })
  }

  const login = await upstream.json()
  const response = NextResponse.json({ user: login.user, expiresAtEpochSeconds: login.expiresAtEpochSeconds })
  response.cookies.set(SESSION_COOKIE, login.token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "strict",
    path: "/",
    maxAge: Math.max(0, login.expiresAtEpochSeconds - Math.floor(Date.now() / 1000)),
  })
  return response
}
