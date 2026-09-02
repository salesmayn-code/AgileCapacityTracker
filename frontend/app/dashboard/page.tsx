"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { api, getWorkingHoursPerDay, toCapacityPercent, type SprintDto, type UserDto, type WorkloadDto } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowRight, BarChart3, Github, Users } from "lucide-react"
import { TeamCapacityChart } from "@/components/dashboard/team-capacity-chart"
import { SprintProgress } from "@/components/dashboard/sprint-progress"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { GitHubStats } from "@/components/dashboard/github-stats"

const SPRINT_DAYS = 10

interface Overview {
  teamCapacityPercent: number | null
  activeSprints: number
  githubTasks: number
  teamMembers: number
  overallocated: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [overview, setOverview] = useState<Overview | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.getWorkload(), api.listSprints(), api.listUsers(), api.listTasks()])
      .then(([workload, sprints, users, tasks]: [WorkloadDto[], SprintDto[], UserDto[], import("@/lib/api").TaskDto[]]) => {
        if (cancelled) return
        const workingHours = getWorkingHoursPerDay()
        const activeSprints = sprints.filter((s) => {
          if (!s.startDate || !s.endDate) return false
          const today = new Date()
          return today >= new Date(s.startDate) && today <= new Date(s.endDate)
        }).length
        const percents = workload.map((w) => toCapacityPercent(w, SPRINT_DAYS, workingHours))
        const overallocated = workload.filter((w) => w.usedHours > w.allocatedHours).length
        setOverview({
          teamCapacityPercent: percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null,
          activeSprints,
          githubTasks: tasks.filter((t) => t.id.startsWith("GH-")).length,
          teamMembers: users.length,
          overallocated,
        })
      })
      .catch(() => {
        if (!cancelled) setOverview(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your team&apos;s capacity and GitHub activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Github className="mr-2 h-4 w-4" />
            Connect GitHub
          </Button>
          <Button>
            New Sprint <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {!user?.role.includes("admin") && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>GitHub Not Connected</AlertTitle>
          <AlertDescription>Connect your GitHub account on the GitHub page to sync repository issues.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Capacity</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.teamCapacityPercent ?? "—"}{overview?.teamCapacityPercent != null ? "%" : ""}</div>
                <p className="text-xs text-muted-foreground">average used capacity</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sprints</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.activeSprints ?? "—"}</div>
                <p className="text-xs text-muted-foreground">currently running</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">GitHub Tasks</CardTitle>
                <Github className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.githubTasks ?? "—"}</div>
                <p className="text-xs text-muted-foreground">synced from repositories</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.teamMembers ?? "—"}</div>
                <p className="text-xs text-muted-foreground">{overview ? `${overview.overallocated} overallocated` : ""}</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Team Capacity</CardTitle>
                <CardDescription>Capacity allocation for the current sprint</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <TeamCapacityChart />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Sprint Progress</CardTitle>
                <CardDescription>Current sprint progress and burndown</CardDescription>
              </CardHeader>
              <CardContent>
                <SprintProgress />
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest team activities and contributions</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>GitHub Stats</CardTitle>
                <CardDescription>Recent GitHub contributions and metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <GitHubStats />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="capacity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Capacity Management</CardTitle>
              <CardDescription>Manage and track your team&apos;s capacity across sprints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TeamCapacityChart />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="github" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>Connect and manage your GitHub repositories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Open the GitHub page to connect a token and sync repository issues.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
