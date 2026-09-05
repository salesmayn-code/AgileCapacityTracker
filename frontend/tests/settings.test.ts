import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api, getStoredGitHubToken, setStoredGitHubToken } from "@/lib/api"

describe("GitHub token helper (localStorage)", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it("stores and clears the GitHub token", () => {
    setStoredGitHubToken("ghp_test")
    expect(getStoredGitHubToken()).toBe("ghp_test")
    expect(window.localStorage.getItem("act.githubToken")).toBe("ghp_test")

    setStoredGitHubToken("")
    expect(getStoredGitHubToken()).toBe("")
    expect(window.localStorage.getItem("act.githubToken")).toBeNull()
  })

  it("returns empty token when unset", () => {
    expect(getStoredGitHubToken()).toBe("")
  })

  it("no longer persists working hours locally (server-side team setting since Phase 9)", () => {
    expect(window.localStorage.getItem("act.workingHoursPerDay")).toBeNull()
  })
})

describe("team settings API", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockFetch(status: number, body: unknown) {
    const response =
      body === undefined
        ? new Response(null, { status })
        : new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
          })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response))
  }

  it("reads shared team settings via GET /api/settings (full Phase 11 shape)", async () => {
    mockFetch(200, {
      workingHoursPerDay: 6,
      syncFrequency: "hourly",
      capacityAlertsEnabled: false,
      underallocationAlertsEnabled: true,
    })
    const settings = await api.getTeamSettings()
    expect(settings).toEqual({
      workingHoursPerDay: 6,
      syncFrequency: "hourly",
      capacityAlertsEnabled: false,
      underallocationAlertsEnabled: true,
    })
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/settings")
  })

  it("updates team settings via PUT /api/settings", async () => {
    mockFetch(200, { workingHoursPerDay: 7 })
    const saved = await api.updateTeamSettings({ workingHoursPerDay: 7 })
    expect(saved).toEqual({ workingHoursPerDay: 7 })
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("/api/settings")
    expect(init?.method).toBe("PUT")
    expect(init?.body).toBe(JSON.stringify({ workingHoursPerDay: 7 }))
  })

  it("sends sync frequency and alert toggles with the settings update", async () => {
    mockFetch(200, {
      workingHoursPerDay: 8,
      syncFrequency: "daily",
      capacityAlertsEnabled: false,
      underallocationAlertsEnabled: false,
    })
    await api.updateTeamSettings({
      workingHoursPerDay: 8,
      syncFrequency: "daily",
      capacityAlertsEnabled: false,
      underallocationAlertsEnabled: false,
    })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.body).toBe(
      JSON.stringify({
        workingHoursPerDay: 8,
        syncFrequency: "daily",
        capacityAlertsEnabled: false,
        underallocationAlertsEnabled: false,
      }),
    )
  })

  it("surfaces validation errors from the settings endpoint", async () => {
    mockFetch(400, {
      timestamp: "2026-09-03T00:00:00Z",
      status: 400,
      error: "Bad Request",
      message: "Validation failed",
      fieldErrors: { workingHoursPerDay: "must be between 1 and 24" },
    })
    await expect(api.updateTeamSettings({ workingHoursPerDay: 0 })).rejects.toThrow(
      "Validation failed (workingHoursPerDay: must be between 1 and 24)",
    )
  })
})
