"use client"

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useEffect, useState } from "react"
import { api, type WorkloadDto } from "@/lib/api"

interface ChartEntry {
  name: string
  allocated: number
  used: number
}

export function TeamCapacityChart({ data }: { data?: ChartEntry[] }) {
  const [entries, setEntries] = useState<ChartEntry[]>(data ?? [])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (data) return
    let cancelled = false
    api
      .getWorkload()
      .then((workload) => {
        if (cancelled) return
        // Percentages are computed server-side (Phase 9); the chart is a pure renderer
        setEntries(
          workload.team.map((entry: WorkloadDto) => ({
            name: entry.username,
            allocated: entry.allocatedPercent,
            used: entry.usedPercent,
          }))
        )
      })
      .catch(() => {
        // Chart is non-critical; show empty state
      })
    return () => {
      cancelled = true
    }
  }, [data])

  if (!mounted) return null

  if (entries.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
        No team capacity data yet.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={entries}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="allocated" name="Allocated Capacity (%)" fill="#6366f1" />
        <Bar dataKey="used" name="Used Capacity (%)" fill="#22c55e" />
      </BarChart>
    </ResponsiveContainer>
  )
}
