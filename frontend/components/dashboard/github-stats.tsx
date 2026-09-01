"use client"
import { Progress } from "@/components/ui/progress"

const stats = [
  {
    name: "Commits",
    count: 127,
    increase: 12,
    progress: 80,
  },
  {
    name: "Pull Requests",
    count: 24,
    increase: 3,
    progress: 65,
  },
  {
    name: "Issues Closed",
    count: 32,
    increase: 8,
    progress: 75,
  },
  {
    name: "Code Reviews",
    count: 18,
    increase: 5,
    progress: 60,
  },
]

export function GitHubStats() {
  return (
    <div className="space-y-4">
      {stats.map((stat) => (
        <div key={stat.name} className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">{stat.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{stat.count}</span>
              <span className="text-xs text-green-500">+{stat.increase}</span>
            </div>
          </div>
          <Progress value={stat.progress} className="h-2" />
        </div>
      ))}
    </div>
  )
}
