"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Github, GitBranch, GitPullRequest, RefreshCw } from "lucide-react"

// Mock repositories data
const repositories = [
  {
    id: 1,
    name: "frontend-app",
    description: "React frontend application",
    stars: 24,
    forks: 8,
    issues: 5,
    pullRequests: 3,
    lastUpdated: "2 days ago",
  },
  {
    id: 2,
    name: "backend-api",
    description: "Node.js backend API",
    stars: 18,
    forks: 5,
    issues: 2,
    pullRequests: 1,
    lastUpdated: "1 day ago",
  },
  {
    id: 3,
    name: "mobile-app",
    description: "React Native mobile application",
    stars: 12,
    forks: 3,
    issues: 8,
    pullRequests: 2,
    lastUpdated: "3 days ago",
  },
]

// Mock pull requests data
const pullRequests = [
  {
    id: 1,
    title: "Add user authentication",
    repository: "frontend-app",
    author: {
      name: "John Doe",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "JD",
    },
    status: "Open",
    created: "1 day ago",
    comments: 3,
  },
  {
    id: 2,
    title: "Fix API response handling",
    repository: "backend-api",
    author: {
      name: "Sarah Smith",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "SS",
    },
    status: "Open",
    created: "2 days ago",
    comments: 5,
  },
  {
    id: 3,
    title: "Implement dark mode",
    repository: "frontend-app",
    author: {
      name: "Mike Johnson",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "MJ",
    },
    status: "Merged",
    created: "3 days ago",
    comments: 2,
  },
  {
    id: 4,
    title: "Add push notifications",
    repository: "mobile-app",
    author: {
      name: "Lisa Brown",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "LB",
    },
    status: "Open",
    created: "1 day ago",
    comments: 1,
  },
]

// Mock issues data
const issues = [
  {
    id: 1,
    title: "Login page not responsive on mobile",
    repository: "frontend-app",
    assignee: {
      name: "John Doe",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "JD",
    },
    status: "Open",
    priority: "High",
    created: "2 days ago",
  },
  {
    id: 2,
    title: "API rate limiting not working",
    repository: "backend-api",
    assignee: {
      name: "Sarah Smith",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "SS",
    },
    status: "Open",
    priority: "Medium",
    created: "3 days ago",
  },
  {
    id: 3,
    title: "Dark mode toggle not saving preference",
    repository: "frontend-app",
    assignee: {
      name: "Mike Johnson",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "MJ",
    },
    status: "Closed",
    priority: "Low",
    created: "5 days ago",
  },
  {
    id: 4,
    title: "Push notifications not working on iOS",
    repository: "mobile-app",
    assignee: {
      name: "Lisa Brown",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "LB",
    },
    status: "Open",
    priority: "High",
    created: "1 day ago",
  },
]

export default function GitHubPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [token, setToken] = useState("")

  const handleConnect = () => {
    if (token.trim()) {
      setIsConnected(true)
    }
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setToken("")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">GitHub Integration</h2>
        <p className="text-muted-foreground">Connect and manage your GitHub repositories</p>
      </div>

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect to GitHub</CardTitle>
            <CardDescription>Connect your GitHub account to track contributions and capacity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">GitHub Personal Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Create a token with <code>repo</code> and <code>user</code> scopes in your GitHub settings.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleConnect} disabled={!token.trim()}>
              <Github className="mr-2 h-4 w-4" />
              Connect GitHub Account
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Tabs defaultValue="repositories" className="space-y-4">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="repositories">Repositories</TabsTrigger>
              <TabsTrigger value="pull-requests">Pull Requests</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
              <Button variant="outline" size="sm" onClick={handleDisconnect} className="text-red-500">
                Disconnect
              </Button>
            </div>
          </div>

          <TabsContent value="repositories" className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Repository</TableHead>
                    <TableHead>Stars</TableHead>
                    <TableHead>Forks</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Pull Requests</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repositories.map((repo) => (
                    <TableRow key={repo.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold flex items-center">
                            <GitBranch className="mr-2 h-4 w-4" />
                            {repo.name}
                          </div>
                          <div className="text-sm text-muted-foreground">{repo.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>{repo.stars}</TableCell>
                      <TableCell>{repo.forks}</TableCell>
                      <TableCell>{repo.issues}</TableCell>
                      <TableCell>{repo.pullRequests}</TableCell>
                      <TableCell>{repo.lastUpdated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="pull-requests" className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pullRequests.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <GitPullRequest className="mr-2 h-4 w-4" />
                          {pr.title}
                        </div>
                      </TableCell>
                      <TableCell>{pr.repository}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={pr.author.avatar || "/placeholder.svg"} alt={pr.author.name} />
                            <AvatarFallback>{pr.author.initials}</AvatarFallback>
                          </Avatar>
                          <span>{pr.author.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pr.status === "Merged" ? "default" : "outline"}>{pr.status}</Badge>
                      </TableCell>
                      <TableCell>{pr.created}</TableCell>
                      <TableCell>{pr.comments}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <span className="mr-2 h-2 w-2 rounded-full bg-red-500" />
                          {issue.title}
                        </div>
                      </TableCell>
                      <TableCell>{issue.repository}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={issue.assignee.avatar || "/placeholder.svg"} alt={issue.assignee.name} />
                            <AvatarFallback>{issue.assignee.initials}</AvatarFallback>
                          </Avatar>
                          <span>{issue.assignee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={issue.status === "Closed" ? "default" : "outline"}>{issue.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            issue.priority === "High"
                              ? "border-red-500 text-red-500"
                              : issue.priority === "Medium"
                                ? "border-yellow-500 text-yellow-500"
                                : "border-green-500 text-green-500"
                          }
                        >
                          {issue.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{issue.created}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
