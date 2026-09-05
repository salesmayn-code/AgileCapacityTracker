"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type GithubTaskStatsDto, type SyncedRepoStatusDto } from "@/lib/api"

type RepoRow = {
  label: string
  count: number
  total: number
}

function rows(stats: GithubTaskStatsDto): RepoRow[] {
  return [
    { label: "Open", count: stats.open, total: stats.total },
    { label: "In Progress", count: stats.inProgress, total: stats.total },
    { label: "Done", count: stats.done, total: stats.total },
    { label: "Stale (closed >30d)", count: stats.stale, total: stats.total },
  ]
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return "never"
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return "never"
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

/** Real synced-task counts + per-repo last-sync status (Phase 11). */
export function GitHubStats() {
  const [state, setState] = useState<{ stats: GithubTaskStatsDto; repos: SyncedRepoStatusDto[] } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .getDashboardStats()
      .then((stats) => {
        if (!cancelled) setState({ stats: stats.githubTasks, repos: stats.syncedRepos })
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p className="text-sm text-muted-foreground">Failed to load GitHub stats.</p>
  }

  if (!state) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    )
  }

  const { stats, repos } = state

  return (
    <div className="space-y-4">
      {stats.total === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No GitHub tasks yet. Sync a repository on the GitHub page.
        </p>
      ) : (
        rows(stats).map((row) => (
          <div key={row.label} className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">{row.label}</span>
              <span className="text-sm font-medium">{row.count}</span>
            </div>
            <Progress value={row.total > 0 ? (row.count / row.total) * 100 : 0} className="h-2" />
          </div>
        ))
      )}
      {repos.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">Synced repositories</p>
          {repos.map((repo) => (
            <div key={repo.id} className="flex items-center justify-between text-sm">
              <span className="truncate">
                {repo.owner}/{repo.repo}
              </span>
              <span
                className={
                  repo.lastStatus === "SUCCESS"
                    ? "text-xs text-green-500"
                    : "text-xs text-red-500"
                }
              >
                {repo.lastStatus === "SUCCESS" ? "synced" : "failed"} · {formatSyncTime(repo.lastSyncedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
