import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

// Route handlers run in the Node runtime (not jsdom)
// @vitest-environment node

const SESSION_COOKIE = "act_session"

function mockUpstream(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  )
}

async function importRoute(path: string) {
  const mod = await import(path)
  return mod
}

describe("BFF auth routes", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("POST /api/auth/login", () => {
    it("proxies login, sets the httpOnly cookie, and never leaks the token to the client", async () => {
      const fetchMock = mockUpstream(200, {
        token: "jwt-secret-value",
        expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 43200,
        user: { id: 1, username: "admin", role: "admin" },
      })
      vi.stubGlobal("fetch", fetchMock)

      const { POST } = await importRoute("../app/api/auth/login/route")
      const request = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "admin@test.local", password: "pw" }),
      })
      const response = await POST(request as never)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.token).toBeUndefined() // token stays server-side
      expect(json.user.role).toBe("admin")
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/auth/login",
        expect.objectContaining({ method: "POST" }),
      )
      const setCookie = response.headers.get("set-cookie") ?? ""
      expect(setCookie).toContain("act_session=jwt-secret-value")
      expect(setCookie).toContain("HttpOnly")
      expect(setCookie.toLowerCase()).toContain("samesite=strict")
    })

    it("passes upstream 401s through without a cookie", async () => {
      vi.stubGlobal("fetch", mockUpstream(401, { status: 401, message: "Invalid email or password" }))
      const { POST } = await importRoute("../app/api/auth/login/route")
      const request = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "x@x.x", password: "bad" }),
      })
      const response = await POST(request as never)
      expect(response.status).toBe(401)
      expect(response.headers.get("set-cookie") ?? "").not.toContain("act_session=jwt")
    })
  })

  describe("POST /api/auth/logout", () => {
    it("clears the session cookie", async () => {
      const { POST } = await importRoute("../app/api/auth/logout/route")
      const response = await POST()
      expect(response.status).toBe(200)
      const setCookie = response.headers.get("set-cookie") ?? ""
      expect(setCookie).toContain("act_session=")
      expect(setCookie).toContain("Max-Age=0")
    })
  })

  describe("GET /api/auth/me", () => {
    it("returns 401 when no cookie is present", async () => {
      const { GET } = await importRoute("../app/api/auth/me/route")
      const request = new NextRequest("http://localhost:3000/api/auth/me")
      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it("forwards the cookie JWT as a Bearer header", async () => {
      const fetchMock = mockUpstream(200, { id: 1, username: "admin", role: "admin" })
      vi.stubGlobal("fetch", fetchMock)
      const { GET } = await importRoute("../app/api/auth/me/route")
      const request = new NextRequest("http://localhost:3000/api/auth/me", {
        headers: { cookie: `${SESSION_COOKIE}=the-jwt` },
      })
      const response = await GET(request)
      expect(response.status).toBe(200)
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/auth/me",
        expect.objectContaining({
          headers: { Authorization: "Bearer the-jwt" },
        }),
      )
    })
  })

  describe("PUT /api/auth/me (Phase 11 profile update)", () => {
    it("proxies the profile update with the session JWT and body", async () => {
      const fetchMock = mockUpstream(200, { id: 1, username: "renamed" })
      vi.stubGlobal("fetch", fetchMock)
      const { PUT } = await importRoute("../app/api/auth/me/route")
      const request = new NextRequest("http://localhost:3000/api/auth/me", {
        method: "PUT",
        headers: { cookie: `${SESSION_COOKIE}=the-jwt`, "content-type": "application/json" },
        body: JSON.stringify({ username: "renamed" }),
      })
      const response = await PUT(request)
      expect(response.status).toBe(200)
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/auth/me",
        expect.objectContaining({
          method: "PUT",
          headers: { Authorization: "Bearer the-jwt", "Content-Type": "application/json" },
          body: JSON.stringify({ username: "renamed" }),
        }),
      )
    })

    it("returns 401 without a cookie", async () => {
      const { PUT } = await importRoute("../app/api/auth/me/route")
      const request = new NextRequest("http://localhost:3000/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({ username: "x" }),
      })
      const response = await PUT(request)
      expect(response.status).toBe(401)
    })
  })

  describe("POST /api/auth/password (Phase 11 password change)", () => {
    it("proxies the password change and maps success to 204", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
      vi.stubGlobal("fetch", fetchMock)
      const { POST } = await importRoute("../app/api/auth/password/route")
      const request = new NextRequest("http://localhost:3000/api/auth/password", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE}=the-jwt`, "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: "old", newPassword: "new-pass-1" }),
      })
      const response = await POST(request)
      expect(response.status).toBe(204)
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/auth/password",
        expect.objectContaining({
          method: "POST",
          headers: { Authorization: "Bearer the-jwt", "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword: "old", newPassword: "new-pass-1" }),
        }),
      )
    })

    it("passes upstream 401s (wrong current password) through", async () => {
      vi.stubGlobal("fetch", mockUpstream(401, { status: 401, message: "Current password is incorrect" }))
      const { POST } = await importRoute("../app/api/auth/password/route")
      const request = new NextRequest("http://localhost:3000/api/auth/password", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE}=the-jwt` },
        body: JSON.stringify({ currentPassword: "bad", newPassword: "new-pass-1" }),
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it("returns 401 without a cookie", async () => {
      const { POST } = await importRoute("../app/api/auth/password/route")
      const request = new NextRequest("http://localhost:3000/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: "x", newPassword: "y" }),
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })
})
