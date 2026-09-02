import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  getStoredGitHubToken,
  getWorkingHoursPerDay,
  setStoredGitHubToken,
  setWorkingHoursPerDay,
  toCapacityPercent,
} from "@/lib/api"

describe("settings helpers (localStorage)", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it("defaults working hours to 8 when unset", () => {
    expect(getWorkingHoursPerDay()).toBe(8)
  })

  it("persists working hours", () => {
    setWorkingHoursPerDay(6)
    expect(getWorkingHoursPerDay()).toBe(6)
    expect(window.localStorage.getItem("act.workingHoursPerDay")).toBe("6")
  })

  it("falls back to 8 on garbage values", () => {
    window.localStorage.setItem("act.workingHoursPerDay", "not-a-number")
    expect(getWorkingHoursPerDay()).toBe(8)
  })

  it("falls back to 8 on zero or negative values", () => {
    window.localStorage.setItem("act.workingHoursPerDay", "0")
    expect(getWorkingHoursPerDay()).toBe(8)
    window.localStorage.setItem("act.workingHoursPerDay", "-4")
    expect(getWorkingHoursPerDay()).toBe(8)
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
})

describe("toCapacityPercent", () => {
  const workload = {
    userId: 1,
    username: "alice",
    role: "admin" as const,
    dailyCapacityHours: 8,
    allocatedHours: 80,
    usedHours: 20,
  }

  it("derives percent from used hours over sprint days x working hours", () => {
    // 20 used / (10 days * 8 hours) = 25%
    expect(toCapacityPercent(workload, 10, 8)).toBe(25)
  })

  it("scales with configured working hours", () => {
    // 20 used / (10 days * 4 hours) = 50%
    expect(toCapacityPercent(workload, 10, 4)).toBe(50)
  })

  it("never divides by zero", () => {
    expect(toCapacityPercent(workload, 0, 0)).toBe(2000)
  })

  it("rounds to whole numbers", () => {
    const odd = { ...workload, usedHours: 7 }
    // 7 / 80 = 8.75 -> 9
    expect(toCapacityPercent(odd, 10, 8)).toBe(9)
  })
})
