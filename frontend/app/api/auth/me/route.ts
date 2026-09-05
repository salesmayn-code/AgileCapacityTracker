import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "act_session"

/** GET /api/auth/me — resolves the session user via the backend, using the cookie JWT. */
export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8080"
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const upstream = await fetch(`${backendUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!upstream.ok) {
    // Expired/invalid token -> clear the cookie so the client stops retrying
    const response = NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status })
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
    return response
  }

  return NextResponse.json(await upstream.json())
}

/** PUT /api/auth/me — Phase 11 self-service profile update (username, github, capacity). */
export async function PUT(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8080"
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const upstream = await fetch(`${backendUrl}/api/auth/me`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: await request.text(),
  })

  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status })
}
