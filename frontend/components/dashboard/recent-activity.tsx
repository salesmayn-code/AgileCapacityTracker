"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type ActivityDto } from "@/lib/api"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ""
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

/** Derived from audit timestamps: "<actor> <action> <target>". */
export function RecentActivity() {
  const [items, setItems] = useState<ActivityDto[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .getDashboardStats()
      .then((stats) => {
        if (!cancelled) setItems(stats.activity)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p className="text-sm text-muted-foreground">Failed to load recent activity.</p>
  }

  if (!items) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
  }

  return (
    <div className="space-y-4">
      {items.map((activity) => (
        <div key={`${activity.action}-${activity.entityId ?? activity.target}-${activity.occurredAt}`} className="flex items-start gap-4 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{activity.actor === "—" ? "•" : initials(activity.actor)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="text-sm">
              <span className="font-medium">{activity.actor}</span> {activity.action}{" "}
              <span className="font-medium">{activity.target}</span>
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {activity.entityId?.startsWith("T-") || activity.entityId?.startsWith("GH-")
                  ? "task"
                  : activity.entityId != null && /^\d+$/.test(activity.entityId)
                    ? "sprint"
                    : "team"}
              </Badge>
              <span className="text-xs text-muted-foreground">{relativeTime(activity.occurredAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
