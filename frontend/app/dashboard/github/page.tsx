"use client"

import { useCallback, useEffect, useState } from "react"
import { api, getStoredGitHubToken, setStoredGitHubToken, type TaskDto } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Github, RefreshCw, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function GitHubPage() {
  const { toast } = useToast()
  const [token, setToken] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [repoInput, setRepoInput] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [tasks, setTasks] = useState<TaskDto[]>([])

  useEffect(() => {
    const stored = getStoredGitHubToken()
    if (stored) {
      setToken(stored)
      setIsConnected(true)
    }
  }, [])

  const loadTasks = useCallback(async () => {
    try {
      setTasks(await api.allTasks())
    } catch {
      // Task list is non-critical; leave previous data
    }
  }, [])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const handleConnect = () => {
    if (token.trim()) {
      setStoredGitHubToken(token.trim())
      setIsConnected(true)
      toast({ title: "GitHub connected", description: "Your token is stored locally in this browser." })
    }
  }

  const handleDisconnect = () => {
    setStoredGitHubToken("")
    setToken("")
    setIsConnected(false)
  }

  const handleSync = async () => {
    const repo = repoInput.trim()
    if (!repo || !repo.includes("/")) {
      toast({
        title: "Invalid repository",
        description: "Enter a repository as owner/name, e.g. octocat/hello-world.",
        variant: "destructive",
      })
      return
    }
    setSyncing(true)
    try {
      const result = await api.syncRepo(repo, getStoredGitHubToken() || undefined)
      toast({
        title: "Sync complete",
        description: `${result.imported} issue(s) imported, ${result.skipped} pull request(s) skipped.`,
      })
      await loadTasks()
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const githubTasks = tasks.filter((t) => t.id.startsWith("GH-"))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">GitHub Integration</h2>
        <p className="text-muted-foreground">Sync repository issues into your task list</p>
      </div>

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect to GitHub</CardTitle>
            <CardDescription>
              Provide a personal access token; it is sent per request to the backend and stored only in this browser.
            </CardDescription>
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
                Create a token with <code>repo</code> scope in your GitHub settings.
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
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync a Repository</CardTitle>
              <CardDescription>
                Open issues will be imported as tasks (id <code>GH-&lt;number&gt;</code>). Existing tasks are updated
                in place.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="owner/repository"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                />
                <Button onClick={handleSync} disabled={syncing || !repoInput.trim()}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing…" : "Sync Issues"}
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={handleDisconnect} className="text-red-500">
                Disconnect
              </Button>
            </CardFooter>
          </Card>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estimated Hours</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {githubTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No GitHub tasks yet. Sync a repository above to import issues.
                    </TableCell>
                  </TableRow>
                ) : (
                  githubTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Github className="mr-2 h-4 w-4" />
                          {task.id}
                        </div>
                      </TableCell>
                      <TableCell>{task.title}</TableCell>
                      <TableCell>
                        <Badge variant={task.status === "done" ? "default" : "outline"}>{task.status ?? "—"}</Badge>
                      </TableCell>
                      <TableCell>{task.estimatedHours || 0}h</TableCell>
                      <TableCell>{task.assignedUsername ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            try {
                              await api.deleteTask(task.id)
                              await loadTasks()
                            } catch (error) {
                              toast({
                                title: "Failed to delete task",
                                description: error instanceof Error ? error.message : "Unknown error",
                                variant: "destructive",
                              })
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <span className="sr-only">Delete task</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
