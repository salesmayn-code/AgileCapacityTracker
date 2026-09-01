"use client"

import { useState } from "react"
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
import { Calendar, CalendarIcon, Plus } from "lucide-react"
import { SprintProgress } from "@/components/dashboard/sprint-progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"

// Mock sprints data
const sprints = [
  {
    id: "1",
    name: "Sprint 1",
    startDate: "2024-04-01",
    endDate: "2024-04-14",
    status: "Completed",
    progress: 100,
    capacity: 85,
    storyPoints: 45,
    completed: 45,
  },
  {
    id: "2",
    name: "Sprint 2",
    startDate: "2024-04-15",
    endDate: "2024-04-28",
    status: "In Progress",
    progress: 65,
    capacity: 80,
    storyPoints: 50,
    completed: 32,
  },
  {
    id: "3",
    name: "Sprint 3",
    startDate: "2024-04-29",
    endDate: "2024-05-12",
    status: "Planned",
    progress: 0,
    capacity: 75,
    storyPoints: 48,
    completed: 0,
  },
]

export default function SprintsPage() {
  const [isAddSprintOpen, setIsAddSprintOpen] = useState(false)
  const [newSprint, setNewSprint] = useState({
    name: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    storyPoints: 45,
  })

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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="col-span-3 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(newSprint.startDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={newSprint.startDate}
                      onSelect={(date) => setNewSprint({ ...newSprint, startDate: date || new Date() })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">
                  End Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="col-span-3 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(newSprint.endDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={newSprint.endDate}
                      onSelect={(date) => setNewSprint({ ...newSprint, endDate: date || new Date() })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="storyPoints" className="text-right">
                  Story Points
                </Label>
                <Input
                  id="storyPoints"
                  type="number"
                  min="1"
                  value={newSprint.storyPoints}
                  onChange={(e) =>
                    setNewSprint({
                      ...newSprint,
                      storyPoints: Number.parseInt(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddSprintOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddSprintOpen(false)}>Create Sprint</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Sprint</CardTitle>
          <CardDescription>Sprint 2 (April 15 - April 28, 2024)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Story Points</div>
                <div className="text-2xl font-bold">32 / 50</div>
                <div className="text-sm text-muted-foreground">64% completed</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Team Capacity</div>
                <div className="text-2xl font-bold">80%</div>
                <div className="text-sm text-muted-foreground">5% higher than last sprint</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Days Remaining</div>
                <div className="text-2xl font-bold">8</div>
                <div className="text-sm text-muted-foreground">Sprint ends on April 28</div>
              </div>
            </div>
            <SprintProgress />
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
              <TableHead>Progress</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Story Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sprints.map((sprint) => (
              <TableRow key={sprint.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {sprint.name}
                  </div>
                </TableCell>
                <TableCell>
                  {sprint.startDate} to {sprint.endDate}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      sprint.status === "Completed"
                        ? "default"
                        : sprint.status === "In Progress"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {sprint.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700"
                      role="progressbar"
                      aria-valuenow={sprint.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="h-full rounded-full bg-primary" style={{ width: `${sprint.progress}%` }} />
                    </div>
                    <span className="text-sm">{sprint.progress}%</span>
                  </div>
                </TableCell>
                <TableCell>{sprint.capacity}%</TableCell>
                <TableCell>
                  {sprint.completed} / {sprint.storyPoints}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
