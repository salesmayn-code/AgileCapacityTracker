"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"

function blankSprint() {
  return {
    name: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  }
}

/**
 * Shared sprint-creation dialog (Phase 11): used by both the Sprints page and
 * the dashboard header. Owns its form state; notifies via onCreated.
 */
export function NewSprintDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}) {
  const { toast } = useToast()
  const [newSprint, setNewSprint] = useState(blankSprint)
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    try {
      await api.createSprint({
        name: newSprint.name,
        startDate: format(newSprint.startDate, "yyyy-MM-dd"),
        endDate: format(newSprint.endDate, "yyyy-MM-dd"),
      })
      toast({ title: "Sprint created", description: `${newSprint.name} has been created.` })
      onOpenChange(false)
      setNewSprint(blankSprint())
      onCreated?.()
    } catch (error) {
      toast({
        title: "Failed to create sprint",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!newSprint.name.trim() || creating}>
            {creating ? "Creating…" : "Create Sprint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
