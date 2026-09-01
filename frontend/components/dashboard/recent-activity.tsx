"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const activities = [
  {
    id: 1,
    user: {
      name: "John Doe",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "JD",
    },
    action: "created a pull request",
    target: "Feature: User Authentication",
    time: "2 hours ago",
    type: "pull-request",
  },
  {
    id: 2,
    user: {
      name: "Sarah Smith",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "SS",
    },
    action: "commented on",
    target: "Issue #42: Dashboard Layout",
    time: "3 hours ago",
    type: "comment",
  },
  {
    id: 3,
    user: {
      name: "Mike Johnson",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "MJ",
    },
    action: "merged",
    target: "Fix: API Response Handling",
    time: "5 hours ago",
    type: "merge",
  },
  {
    id: 4,
    user: {
      name: "Lisa Brown",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "LB",
    },
    action: "closed",
    target: "Issue #38: Mobile Responsiveness",
    time: "yesterday",
    type: "close",
  },
  {
    id: 5,
    user: {
      name: "David Wilson",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "DW",
    },
    action: "opened",
    target: "Issue #45: Performance Optimization",
    time: "yesterday",
    type: "issue",
  },
]

export function RecentActivity() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-4 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={activity.user.avatar || "/placeholder.svg"} alt={activity.user.name} />
            <AvatarFallback>{activity.user.initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="text-sm">
              <span className="font-medium">{activity.user.name}</span> {activity.action}{" "}
              <span className="font-medium">{activity.target}</span>
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {activity.type}
              </Badge>
              <span className="text-xs text-muted-foreground">{activity.time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
