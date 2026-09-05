"use client"

import { useEffect, useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type BurndownPointDto } from "@/lib/api"

type State = { progress: number; data: BurndownPointDto[]; noSprint: boolean } | null

export function SprintProgress() {
  const [state, setState] = useState<State>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .getDashboardStats()
      .then((stats) => {
        if (cancelled) return
        const b = stats.burndown
        const noSprint = b.sprintId == null
        const progress = b.totalHours > 0 ? Math.round(((b.totalHours - b.remainingHours) / b.totalHours) * 100) : 0
        setState({ progress, data: b.history, noSprint })
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p className="text-sm text-muted-foreground">Failed to load sprint progress.</p>
  }

  if (!state) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    )
  }

  if (state.noSprint) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No active sprint. Create one on the Sprints page to start tracking a burndown.
      </p>
    )
  }

  const hasHistory = state.data.some((p) => p.remainingHours != null)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Sprint Progress</span>
          <span>{state.progress}%</span>
        </div>
        <Progress value={state.progress} className="h-2" />
      </div>
      {hasHistory ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={state.data}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="idealHours" stroke="#8884d8" fill="#8884d8" fillOpacity={0.1} name="Ideal" />
            <Area
              type="monotone"
              dataKey="remainingHours"
              stroke="#82ca9d"
              fill="#82ca9d"
              fillOpacity={0.3}
              name="Remaining"
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No burndown history yet — daily snapshots accumulate while the sprint runs.
        </p>
      )}
    </div>
  )
}
