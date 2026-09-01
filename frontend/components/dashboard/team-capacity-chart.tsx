"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

// Mock data for the chart
const mockData = [
  {
    name: "John",
    allocated: 80,
    used: 65,
  },
  {
    name: "Sarah",
    allocated: 70,
    used: 68,
  },
  {
    name: "Mike",
    allocated: 90,
    used: 95,
  },
  {
    name: "Lisa",
    allocated: 60,
    used: 48,
  },
  {
    name: "David",
    allocated: 75,
    used: 72,
  },
  {
    name: "Emma",
    allocated: 85,
    used: 80,
  },
]

export function TeamCapacityChart() {
  const [data, setData] = useState(mockData)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={data}
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
