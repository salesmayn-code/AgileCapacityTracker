"use client"

import { useEffect, useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Progress } from "@/components/ui/progress"

// Mock data for the chart
const mockData = [
  {
    day: "Day 1",
    remaining: 100,
    ideal: 95,
  },
  {
    day: "Day 2",
    remaining: 92,
    ideal: 90,
  },
  {
    day: "Day 3",
    remaining: 85,
    ideal: 85,
  },
  {
    day: "Day 4",
    remaining: 80,
    ideal: 80,
  },
  {
    day: "Day 5",
    remaining: 75,
    ideal: 75,
  },
  {
    day: "Day 6",
    remaining: 68,
    ideal: 70,
  },
  {
    day: "Day 7",
    remaining: 65,
    ideal: 65,
  },
  {
    day: "Day 8",
    remaining: 60,
    ideal: 60,
  },
  {
    day: "Day 9",
    remaining: 55,
    ideal: 55,
  },
  {
    day: "Day 10",
    remaining: 50,
    ideal: 50,
  },
]

export function SprintProgress() {
  const [data, setData] = useState(mockData)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const progress = 50 // 50% complete

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Sprint Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="ideal" stroke="#8884d8" fill="#8884d8" fillOpacity={0.1} />
          <Area type="monotone" dataKey="remaining" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
