import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"

describe("api client (same-origin BFF paths)", () => {
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

  it("calls same-origin API paths (BFF proxies to the backend)", async () => {
    mockFetch(200, { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true })
    await api.listUsers()
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/users") // relative, same-origin
  })

  it("logs in through the BFF auth route", async () => {
    mockFetch(200, { token: "t", expiresAtEpochSeconds: 1, user: { id: 1 } })
    await api.login("a@b.c", "pw")
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/auth/login")
    expect(init?.method).toBe("POST")
    expect(init?.body).toBe(JSON.stringify({ email: "a@b.c", password: "pw" }))
  })

  it("splits owner/name into two encoded path segments on GitHub sync", async () => {
    mockFetch(200, { imported: 3, skipped: 1, tasks: [] })
    await api.syncRepo("octo cat/hello world", "ghp_test")
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/github/sync/octo%20cat/hello%20world")
    expect(init?.method).toBe("POST")
    expect((init?.headers as Record<string, string>)["X-GitHub-Token"]).toBe("ghp_test")
  })

  it("sends the bearer token on GitHub sync", async () => {
    mockFetch(200, { imported: 3, skipped: 1, tasks: [] })
    await api.syncRepo("octocat/hello-world", "ghp_test")
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/github/sync/octocat/hello-world")
    expect(init?.method).toBe("POST")
    expect((init?.headers as Record<string, string>)["X-GitHub-Token"]).toBe("ghp_test")
  })

  it("updates sprints via PUT", async () => {
    mockFetch(200, { id: 1, name: "Renamed", startDate: null, endDate: null, totalEstimatedHours: 0, taskCount: 0 })
    const updated = await api.updateSprint(1, { name: "Renamed" })
    expect(updated.name).toBe("Renamed")
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/sprints/1")
    expect(init?.method).toBe("PUT")
    expect(init?.body).toBe(JSON.stringify({ name: "Renamed" }))
  })

  it("surfaces structured JSON error messages with field errors", async () => {
    mockFetch(400, {
      timestamp: "2026-09-03T00:00:00Z",
      status: 400,
      error: "Bad Request",
      message: "Validation failed",
      fieldErrors: { estimatedHours: "must be zero or more" },
    })
    await expect(api.createTask({ title: "x", estimatedHours: -1 })).rejects.toThrow(
      "Validation failed (estimatedHours: must be zero or more)",
    )
  })

  it("surfaces the message field of plain JSON errors", async () => {
    mockFetch(409, {
      timestamp: "2026-09-03T00:00:00Z",
      status: 409,
      error: "Conflict",
      message: "Duplicate value: username or email already exists",
    })
    await expect(
      api.createUser({ username: "dup", email: "d@x.co", role: "admin", password: "longpass-1" }),
    ).rejects.toThrow("Duplicate value")
  })

  it("lists users via GET /api/users as a PageDto", async () => {
    const page = {
      content: [{ id: 1, username: "alice" }],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      last: true,
    }
    mockFetch(200, page)
    const users = await api.listUsers()
    expect(users).toEqual(page)
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/users")
  })

  it("appends page and size query parameters", async () => {
    mockFetch(200, { content: [], page: 2, size: 5, totalElements: 0, totalPages: 0, last: true })
    await api.listTasks({ page: 2, size: 5 })
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/tasks?page=2&size=5")
  })

  it("allUsers walks every page until last", async () => {
    let call = 0
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        call++
        const body =
          call === 1
            ? { content: [{ id: 1 }], page: 0, size: 2, totalElements: 3, totalPages: 2, last: false }
            : { content: [{ id: 2 }, { id: 3 }], page: 1, size: 2, totalElements: 3, totalPages: 2, last: true }
        return Promise.resolve(
          new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }),
        )
      }),
    )
    const all = await api.allUsers()
    expect(all).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("getWorkload returns the server-computed envelope with percentages", async () => {
    const envelope = {
      sprintDays: 9,
      sprintName: "Sprint 1",
      sprintActive: true,
      workingHoursPerDay: 8,
      team: [
        {
          userId: 1,
          username: "alice",
          role: "admin",
          dailyCapacityHours: 8,
          allocatedHours: 72,
          usedHours: 36,
          usedPercent: 50,
          allocatedPercent: 100,
        },
      ],
    }
    mockFetch(200, envelope)
    const workload = await api.getWorkload()
    expect(workload).toEqual(envelope)
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/capacity/workload")
  })

  it("creates users via POST", async () => {
    mockFetch(201, { id: 2, username: "bob" })
    const created = await api.createUser({
      username: "bob",
      email: "bob@example.com",
      role: "developer",
      password: "longpass-1",
    })
    expect(created).toEqual({ id: 2, username: "bob" })
    expect(fetch).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "bob",
          email: "bob@example.com",
          role: "developer",
          password: "longpass-1",
        }),
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
    await expect(
      api.createUser({ username: "x", email: "x@x.co", role: "hacker" as never, password: "longpass-1" }),
    ).rejects.toThrow("role must be one of")
  })

  it("throws with status text when the body is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    )
    await expect(api.getUser(999)).rejects.toThrow("404")
  })

  it("omits the token header when none is given", async () => {
    mockFetch(200, { imported: 0, skipped: 0, tasks: [] })
    await api.syncRepo("octocat/hello-world")
    expect(fetch).toHaveBeenCalledWith(
      "/api/github/sync/octocat/hello-world",
      expect.objectContaining({
        headers: expect.not.objectContaining({ "X-GitHub-Token": expect.any(String) }),
      }),
    )
  })

  // ---- Phase 11: dashboard stats, profile, password, synced repos ----

  it("fetches the aggregated dashboard stats envelope", async () => {
    const stats = {
      teamCapacityPercent: 62,
      sprintActive: true,
      activeSprints: 1,
      teamMembers: 3,
      overallocated: 1,
      burndown: {
        sprintId: 1,
        sprintName: "Sprint 1",
        startDate: "2026-09-01",
        endDate: "2026-09-14",
        history: [{ date: "2026-09-01", remainingHours: 40, idealHours: 40 }],
        totalHours: 40,
        remainingHours: 40,
      },
      githubTasks: { total: 5, open: 2, inProgress: 1, done: 2, stale: 0 },
      activity: [{ actor: "alice", action: "created task", target: "Fix bug", entityId: "T-1", occurredAt: "2026-09-01T10:00:00Z" }],
      syncedRepos: [{ id: 1, owner: "octocat", repo: "hello-world", lastSyncedAt: null, lastResult: null, lastStatus: "SUCCESS" }],
    }
    mockFetch(200, stats)
    const result = await api.getDashboardStats()
    expect(result).toEqual(stats)
    expect(result.githubTasks.total).toBe(5)
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/dashboard/stats")
  })

  it("updates the profile via PUT /api/auth/me", async () => {
    mockFetch(200, { id: 1, username: "newname", email: "a@b.c", role: "developer", githubUsername: "octo", dailyCapacityHours: 6 })
    const updated = await api.updateProfile({ username: "newname", githubUsername: "octo", dailyCapacityHours: 6 })
    expect(updated.username).toBe("newname")
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/auth/me")
    expect(init?.method).toBe("PUT")
    expect(init?.body).toBe(
      JSON.stringify({ username: "newname", githubUsername: "octo", dailyCapacityHours: 6 }),
    )
  })

  it("changes the password via POST /api/auth/password", async () => {
    mockFetch(204, undefined)
    await api.changePassword({ currentPassword: "old-pass-1", newPassword: "new-pass-1" })
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/auth/password")
    expect(init?.method).toBe("POST")
    expect(init?.body).toBe(
      JSON.stringify({ currentPassword: "old-pass-1", newPassword: "new-pass-1" }),
    )
  })

  it("lists synced repos via GET /api/github/repos", async () => {
    mockFetch(200, [
      { id: 1, owner: "octocat", repo: "hello-world", lastSyncedAt: null, lastResult: null, lastStatus: "SUCCESS" },
    ])
    const repos = await api.listSyncedRepos()
    expect(repos).toHaveLength(1)
    expect(repos[0].repo).toBe("hello-world")
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/github/repos")
  })

  it("removes a synced repo via DELETE /api/github/repos/:id", async () => {
    mockFetch(204, undefined)
    await api.removeSyncedRepo(7)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/github/repos/7")
    expect(init?.method).toBe("DELETE")
  })
})
