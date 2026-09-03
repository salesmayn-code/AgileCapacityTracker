import { NextResponse } from "next/server"

const SESSION_COOKIE = "act_session"

/** Cookie secure flag: see login/route.ts — COOKIE_SECURE=false for local parity. */
function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "false") return false
  return process.env.NODE_ENV === "production"
}

/** POST /api/auth/logout — clears the session cookie. */
export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  })
  return response
}
