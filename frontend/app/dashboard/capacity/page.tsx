"use client"

import { useCallback, useEffect, useState } from "react"
import { api, getWorkingHoursPerDay, toCapacityPercent, type WorkloadDto } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const SPRINT_DAYS = 10

function statusFor(used: number, allocated: number): { label: string; className: string } {
  if (used > allocated) return { label: "Overallocated", className: "border-red-500 text-red-500" }
  if (used < allocated * 0.7) return { label: "Underutilized", className: "border-yellow-500 text-yellow-500" }
  return { label: "Normal", className: "border-green-500 text-green-500" }
}

export default function CapacityPage() {
  const { toast } = useToast()
  const [workload, setWorkload] = useState<WorkloadDto[]>([])
  const [loading, setLoading] = useState(true)
  const [workingHours, setWorkingHours] = useState(8)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setWorkload(await api.getWorkload())
    } catch (error) {
      toast({
        title: "Failed to load workload",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    setWorkingHours(getWorkingHoursPerDay())
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Capacity Management</h2>
          <p className="text-muted-foreground">
            Track and manage your team&apos;s capacity (100% = {SPRINT_DAYS} days × {workingHours}h/day)
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Allocated Capacity</TableHead>
              <TableHead>Used Capacity</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading workload…
                </TableCell>
              </TableRow>
            ) : workload.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No team members yet. Add members on the Team page.
                </TableCell>
              </TableRow>
            ) : (
              workload.map((entry) => {
                const allocated = toCapacityPercent(
                  { ...entry, usedHours: entry.allocatedHours },
                  SPRINT_DAYS,
                  workingHours
                )
                const used = toCapacityPercent(entry, SPRINT_DAYS, workingHours)
                const status = statusFor(entry.usedHours, entry.allocatedHours)
                return (
                  <TableRow key={entry.userId}>
                    <TableCell className="font-medium">{entry.username}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.role.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700"
                          role="progressbar"
                          aria-valuenow={allocated}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div className="h-full rounded-full bg-primary" style={{ width: `${allocated}%` }} />
                        </div>
                        <span className="text-sm">{allocated}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700"
                          role="progressbar"
                          aria-valuenow={used}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className={`h-full rounded-full ${
                              used > allocated ? "bg-red-500" : used < allocated * 0.7 ? "bg-yellow-500" : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(100, used)}%` }}
                          />
                        </div>
                        <span className="text-sm">{used}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.usedHours}h / {entry.allocatedHours}h
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
