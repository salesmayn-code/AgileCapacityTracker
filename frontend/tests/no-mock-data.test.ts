import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * Phase 11 exit criterion: the dashboard renders 100% real data.
 * Regression guard: no dashboard component may declare a hardcoded mock
 * data array (the old SprintProgress/RecentActivity/GitHubStats pattern).
 */

const DASHBOARD_DIR = join(process.cwd(), "components", "dashboard")

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return tsFiles(full)
    return full.endsWith(".tsx") ? [full] : []
  })
}

describe("no mock data arrays in dashboard components (Phase 11)", () => {
  it("has no component declaring a local mock/const data array", () => {
    const offenders: string[] = []
    for (const file of tsFiles(DASHBOARD_DIR)) {
      const source = readFileSync(file, "utf-8")
      const bannedPatterns = [
        /const\s+mockData\s*=/,
        /const\s+activities\s*=\s*\[/, // the old RecentActivity array
        /const\s+stats\s*=\s*\[\s*\{\s*name:\s*"Commits"/, // the old GitHubStats array
      ]
      if (bannedPatterns.some((pattern) => pattern.test(source))) {
        offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })

  it("dashboard widgets fetch real data via the api client", () => {
    for (const file of ["sprint-progress.tsx", "recent-activity.tsx", "github-stats.tsx"]) {
      const source = readFileSync(join(DASHBOARD_DIR, file), "utf-8")
      expect(source, `${file} should import the api client`).toContain('from "@/lib/api"')
      expect(source, `${file} should fetch dashboard stats`).toContain("getDashboardStats")
    }
  })
})
