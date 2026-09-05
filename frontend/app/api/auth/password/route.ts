import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "act_session"

/** POST /api/auth/password — Phase 11 self-service password change (requires current). */
export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8080"
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const upstream = await fetch(`${backendUrl}/api/auth/password`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: await request.text(),
  })

  if (upstream.status === 204 || upstream.status === 200) {
    return new NextResponse(null, { status: 204 })
  }
  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status })
}
