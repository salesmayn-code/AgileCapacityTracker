"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, type DashboardStatsDto } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowRight, BarChart3, Github, Users } from "lucide-react"
import { TeamCapacityChart } from "@/components/dashboard/team-capacity-chart"
import { SprintProgress } from "@/components/dashboard/sprint-progress"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { GitHubStats } from "@/components/dashboard/github-stats"
import { NewSprintDialog } from "@/components/new-sprint-dialog"
import { useAuth } from "@/components/auth-provider"

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStatsDto | null>(null)
  const [error, setError] = useState(false)
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const [s, settings] = await Promise.all([api.getDashboardStats(), api.getTeamSettings()])
      setStats(s)
      setAlertsEnabled(settings.capacityAlertsEnabled)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const githubTasksTotal = stats?.githubTasks.total ?? null
  const showOverallocated = alertsEnabled && (stats?.overallocated ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your team&apos;s capacity and GitHub activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/github")}>
            <Github className="mr-2 h-4 w-4" />
            Connect GitHub
          </Button>
          <Button onClick={() => setSprintDialogOpen(true)}>
            New Sprint <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <NewSprintDialog open={sprintDialogOpen} onOpenChange={setSprintDialogOpen} onCreated={load} />

      {!user?.role.includes("admin") && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>GitHub Not Connected</AlertTitle>
          <AlertDescription>Connect your GitHub account on the GitHub page to sync repository issues.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load dashboard</AlertTitle>
          <AlertDescription>The server is unreachable or returned an error. Retry to reload the data.</AlertDescription>
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
                {stats ? (
                  <>
                    <div className="text-2xl font-bold">{stats.teamCapacityPercent}%</div>
                    <p className="text-xs text-muted-foreground">average used capacity</p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-16" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sprints</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stats ? (
                  <>
                    <div className="text-2xl font-bold">{stats.activeSprints}</div>
                    <p className="text-xs text-muted-foreground">currently running</p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-16" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">GitHub Tasks</CardTitle>
                <Github className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stats ? (
                  <>
                    <div className="text-2xl font-bold">{githubTasksTotal}</div>
                    <p className="text-xs text-muted-foreground">synced from repositories</p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-16" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stats ? (
                  <>
                    <div className="text-2xl font-bold">{stats.teamMembers}</div>
                    <p className="text-xs text-muted-foreground">
                      {showOverallocated ? `${stats.overallocated} overallocated` : "capacity healthy"}
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-16" />
                )}
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
              <Button variant="outline" onClick={() => router.push("/dashboard/github")}>
                <Github className="mr-2 h-4 w-4" />
                Go to GitHub Integration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
