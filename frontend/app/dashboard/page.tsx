"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowRight, BarChart3, Github, Users } from "lucide-react"
import { TeamCapacityChart } from "@/components/dashboard/team-capacity-chart"
import { SprintProgress } from "@/components/dashboard/sprint-progress"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { GitHubStats } from "@/components/dashboard/github-stats"

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your team's capacity and GitHub activity</p>
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
          <AlertDescription>Connect your GitHub account to track your contributions and capacity.</AlertDescription>
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
                <div className="text-2xl font-bold">78%</div>
                <p className="text-xs text-muted-foreground">+2% from last sprint</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sprints</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                <p className="text-xs text-muted-foreground">1 ending in 5 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pull Requests</CardTitle>
                <Github className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">5 awaiting review</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">2 overallocated</p>
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
              <CardDescription>Manage and track your team's capacity across sprints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Detailed capacity management content will appear here.</p>
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
              <p>GitHub integration settings and data will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
