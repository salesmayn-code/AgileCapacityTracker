"use client"

import { useCallback, useEffect, useState } from "react"
import { api, type SprintDto } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"

function sprintStatus(sprint: SprintDto): "Completed" | "In Progress" | "Planned" {
  if (!sprint.startDate || !sprint.endDate) return "Planned"
  const today = new Date()
  const start = new Date(sprint.startDate)
  const end = new Date(sprint.endDate)
  if (today > end) return "Completed"
  if (today >= start) return "In Progress"
  return "Planned"
}

function daysRemaining(sprint: SprintDto): number | null {
  if (!sprint.endDate) return null
  const diff = new Date(sprint.endDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
}

export default function SprintsPage() {
  const { toast } = useToast()
  const [sprints, setSprints] = useState<SprintDto[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddSprintOpen, setIsAddSprintOpen] = useState(false)
  const [newSprint, setNewSprint] = useState({
    name: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSprints(await api.listSprints())
    } catch (error) {
      toast({
        title: "Failed to load sprints",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async () => {
    try {
      await api.createSprint({
        name: newSprint.name,
        startDate: format(newSprint.startDate, "yyyy-MM-dd"),
        endDate: format(newSprint.endDate, "yyyy-MM-dd"),
      })
      toast({ title: "Sprint created", description: `${newSprint.name} has been created.` })
      setIsAddSprintOpen(false)
      setNewSprint({ name: "", startDate: new Date(), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) })
      await load()
    } catch (error) {
      toast({
        title: "Failed to create sprint",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.deleteSprint(id)
      toast({ title: "Sprint deleted" })
      await load()
    } catch (error) {
      toast({
        title: "Failed to delete sprint",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const current = sprints.find((s) => sprintStatus(s) === "In Progress")
  const currentDaysLeft = current ? daysRemaining(current) : null

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sprint Planning</h2>
          <p className="text-muted-foreground">Manage your sprints and track progress</p>
        </div>
        <Dialog open={isAddSprintOpen} onOpenChange={setIsAddSprintOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Sprint
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Sprint</DialogTitle>
              <DialogDescription>Set up a new sprint for your team.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Sprint Name
                </Label>
                <Input
                  id="name"
                  value={newSprint.name}
                  onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={format(newSprint.startDate, "yyyy-MM-dd")}
                  onChange={(e) => setNewSprint({ ...newSprint, startDate: new Date(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={format(newSprint.endDate, "yyyy-MM-dd")}
                  onChange={(e) => setNewSprint({ ...newSprint, endDate: new Date(e.target.value) })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddSprintOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newSprint.name.trim()}>
                Create Sprint
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Sprint</CardTitle>
          <CardDescription>
            {current
              ? `${current.name} (${current.startDate} — ${current.endDate})`
              : "No sprint currently in progress"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Estimated Hours</div>
                <div className="text-2xl font-bold">{current ? current.totalEstimatedHours : 0}h</div>
                <div className="text-sm text-muted-foreground">
                  {current ? `${current.taskCount} tasks` : "Create a sprint to begin"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Sprints Planned</div>
                <div className="text-2xl font-bold">{sprints.length}</div>
                <div className="text-sm text-muted-foreground">
                  {sprints.filter((s) => sprintStatus(s) === "Planned").length} upcoming
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Days Remaining</div>
                <div className="text-2xl font-bold">{currentDaysLeft ?? "—"}</div>
                <div className="text-sm text-muted-foreground">
                  {current && current.endDate ? `Sprint ends on ${current.endDate}` : "No active sprint"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sprint</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Estimated Hours</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading sprints…
                </TableCell>
              </TableRow>
            ) : sprints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No sprints yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              sprints.map((sprint) => (
                <TableRow key={sprint.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {sprint.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {sprint.startDate ?? "—"} to {sprint.endDate ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        sprintStatus(sprint) === "Completed"
                          ? "default"
                          : sprintStatus(sprint) === "In Progress"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {sprintStatus(sprint)}
                    </Badge>
                  </TableCell>
                  <TableCell>{sprint.taskCount}</TableCell>
                  <TableCell>{sprint.totalEstimatedHours}h</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(sprint.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <span className="sr-only">Delete sprint</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
