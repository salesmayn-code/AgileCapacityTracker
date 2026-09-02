import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api, API_BASE_URL } from "@/lib/api"

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockFetch(status: number, body: unknown) {
    const response = body === undefined
      ? new Response(null, { status })
      : new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response))
  }

  it("targets the backend base URL by default", () => {
    expect(API_BASE_URL).toBe("http://localhost:8080")
  })

  it("lists users via GET /api/users", async () => {
    mockFetch(200, [{ id: 1, username: "alice" }])
    const users = await api.listUsers()
    expect(users).toEqual([{ id: 1, username: "alice" }])
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("http://localhost:8080/api/users")
    expect(init?.method ?? "GET").toBe("GET")
  })

  it("creates users via POST", async () => {
    mockFetch(201, { id: 2, username: "bob" })
    const created = await api.createUser({ username: "bob", role: "developer" })
    expect(created).toEqual({ id: 2, username: "bob" })
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/users",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "bob", role: "developer" }),
      }),
    )
  })

  it("returns undefined for 204 responses", async () => {
    mockFetch(204, undefined)
    const result = await api.deleteUser(1)
    expect(result).toBeUndefined()
  })

  it("throws with server error body for non-2xx responses", async () => {
    mockFetch(400, "role must be one of [admin, team_lead, developer]")
    await expect(api.createUser({ username: "x", role: "hacker" })).rejects.toThrow(
      "role must be one of",
    )
  })

  it("throws with status text when the body is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    )
    await expect(api.getUser(999)).rejects.toThrow("404")
  })

  it("sends the bearer token on GitHub sync", async () => {
    mockFetch(200, { imported: 3, skipped: 1, tasks: [] })
    await api.syncRepo("octocat/hello-world", "ghp_test")
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("http://localhost:8080/api/github/sync/octocat/hello-world")
    expect(init?.method).toBe("POST")
    expect((init?.headers as Record<string, string>)["Authorization"]).toBe("Bearer ghp_test")
  })

  it("omits the auth header when no token is given", async () => {
    mockFetch(200, { imported: 0, skipped: 0, tasks: [] })
    await api.syncRepo("octocat/hello-world")
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/github/sync/octocat/hello-world",
      expect.objectContaining({
        headers: expect.not.objectContaining({ Authorization: expect.any(String) }),
      }),
    )
  })
})
