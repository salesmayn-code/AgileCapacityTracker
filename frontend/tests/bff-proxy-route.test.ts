import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

// Route handlers run in the Node runtime (not jsdom)
// @vitest-environment node

const SESSION_COOKIE = "act_session"

function mockUpstream(status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue(
    new Response(body == null ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...extraHeaders },
    }),
  )
}

/**
 * Builds a NextRequest aimed at the catch-all proxy plus the ctx object the
 * route handlers receive (params arrive as a promise in Next 15).
 */
function proxyRequest(path: string, init?: RequestInit) {
  const segments = path.split("/").filter(Boolean)
  const request = new NextRequest(`http://localhost:3000/api/${path}`, init)
  const ctx = { params: Promise.resolve({ path: segments }) }
  return { request, ctx }
}

describe("BFF catch-all proxy (/api/[...path])", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("forwards GET requests to the backend with the session JWT", async () => {
    const fetchMock = mockUpstream(200, { content: [], page: 0, totalElements: 0 })
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("../app/api/[...path]/route")
    const { request, ctx } = proxyRequest("sprints", {
      headers: { cookie: `${SESSION_COOKIE}=the-jwt` },
    })
    const response = await GET(request, ctx)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ content: [], page: 0, totalElements: 0 })

    const [target, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(target).toBe("http://localhost:8080/api/sprints")
    expect(options.method).toBe("GET")
    expect((options.headers as Headers).get("Authorization")).toBe("Bearer the-jwt")
  })

  it("joins nested path segments and forwards the query string", async () => {
    const fetchMock = mockUpstream(200, { content: [] })
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("../app/api/[...path]/route")
    const { request, ctx } = proxyRequest("sprints/7/tasks", {
      headers: { cookie: `${SESSION_COOKIE}=the-jwt` },
    })
    request.nextUrl.search = "?page=2&size=25"
    await GET(request, ctx)

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/sprints/7/tasks?page=2&size=25",
      expect.objectContaining({ method: "GET" }),
    )
  })

  it("omits the Authorization header when no session cookie is present", async () => {
    const fetchMock = mockUpstream(401, { status: 401, message: "Unauthorized" })
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("../app/api/[...path]/route")
    const { request, ctx } = proxyRequest("users")
    const response = await GET(request, ctx)

    expect(response.status).toBe(401)
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((options.headers as Headers).get("Authorization")).toBeNull()
  })

  it("strips hop-by-hop and client headers (cookie, host, content-length)", async () => {
    const fetchMock = mockUpstream(200, { ok: true })
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("../app/api/[...path]/route")
    const { request, ctx } = proxyRequest("settings", {
      headers: {
        cookie: `${SESSION_COOKIE}=the-jwt`,
        host: "evil.example.com",
        "content-length": "999",
        "x-github-token": "ghp_browser_pat",
      },
    })
    await GET(request, ctx)

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = options.headers as Headers
    expect(headers.get("cookie")).toBeNull()
    expect(headers.get("host")).toBeNull()
    expect(headers.get("content-length")).toBeNull()
    // caller-supplied custom headers still pass through (X-GitHub-Token contract)
    expect(headers.get("x-github-token")).toBe("ghp_browser_pat")
  })

  it("proxies POST with a streaming body and echoes the upstream status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "T-abc12345" }), { status: 201 }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const { POST } = await import("../app/api/[...path]/route")
    const { request, ctx } = proxyRequest("tasks", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE}=the-jwt`, "content-type": "application/json" },
      body: JSON.stringify({ title: "New task", estimatedHours: 4 }),
    })
    const response = await POST(request, ctx)

    expect(response.status).toBe(201)
    const [target, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(target).toBe("http://localhost:8080/api/tasks")
    expect(options.method).toBe("POST")
    expect((options.headers as Headers).get("Authorization")).toBe("Bearer the-jwt")
  })

  it("copies upstream response headers minus transfer/content-encoding", async () => {
    const fetchMock = mockUpstream(
      200,
      { ok: true },
      {
        "X-Request-Id": "abc12345",
        "Transfer-Encoding": "chunked",
        "Content-Encoding": "gzip",
      },
    )
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("../app/api/[...path]/route")
    const { request, ctx } = proxyRequest("dashboard/stats", {
      headers: { cookie: `${SESSION_COOKIE}=the-jwt` },
    })
    const response = await GET(request, ctx)

    expect(response.headers.get("x-request-id")).toBe("abc12345")
    expect(response.headers.get("transfer-encoding")).toBeNull()
    expect(response.headers.get("content-encoding")).toBeNull()
  })

  it.each(["PUT", "PATCH", "DELETE"] as const)(
    "exposes %s through the same proxy",
    async (method) => {
      const fetchMock = mockUpstream(204, null)
      vi.stubGlobal("fetch", fetchMock)

      const mod = await import("../app/api/[...path]/route")
      const handler = mod[method]
      const { request, ctx } = proxyRequest("tasks/T-abc12345", {
        method,
        headers: { cookie: `${SESSION_COOKIE}=the-jwt`, "content-type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify({ status: "done" }),
      })
      const response = await handler(request, ctx)

      expect(response.status).toBe(204)
      const [target, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(target).toBe(`http://localhost:8080/api/tasks/T-abc12345`)
      expect(options.method).toBe(method)
      expect((options.headers as Headers).get("Authorization")).toBe("Bearer the-jwt")
    },
  )

  it("honors BACKEND_URL from the environment", async () => {
    const previous = process.env.BACKEND_URL
    process.env.BACKEND_URL = "http://backend.internal:9000"
    try {
      const fetchMock = mockUpstream(200, { ok: true })
      vi.stubGlobal("fetch", fetchMock)

      const { GET } = await import("../app/api/[...path]/route")
      const { request, ctx } = proxyRequest("sprints", {
        headers: { cookie: `${SESSION_COOKIE}=the-jwt` },
      })
      await GET(request, ctx)

      const [target] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(target).toBe("http://backend.internal:9000/api/sprints")
    } finally {
      if (previous === undefined) delete process.env.BACKEND_URL
      else process.env.BACKEND_URL = previous
    }
  })
})
