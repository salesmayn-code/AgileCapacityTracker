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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Download, Plus } from "lucide-react"
import { TeamCapacityChart } from "@/components/dashboard/team-capacity-chart"

// Mock team members data
const teamMembers = [
  {
    id: "1",
    name: "John Doe",
    role: "Developer",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "JD",
    allocatedCapacity: 80,
    usedCapacity: 65,
    status: "Normal",
  },
  {
    id: "2",
    name: "Sarah Smith",
    role: "Team Lead",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "SS",
    allocatedCapacity: 70,
    usedCapacity: 68,
    status: "Normal",
  },
  {
    id: "3",
    name: "Mike Johnson",
    role: "Developer",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "MJ",
    allocatedCapacity: 90,
    usedCapacity: 95,
    status: "Overallocated",
  },
  {
    id: "4",
    name: "Lisa Brown",
    role: "Developer",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "LB",
    allocatedCapacity: 60,
    usedCapacity: 48,
    status: "Underutilized",
  },
  {
    id: "5",
    name: "David Wilson",
    role: "Developer",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "DW",
    allocatedCapacity: 75,
    usedCapacity: 72,
    status: "Normal",
  },
]

export default function CapacityPage() {
  const [isAddCapacityOpen, setIsAddCapacityOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState("")
  const [capacityValue, setCapacityValue] = useState(80)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Capacity Management</h2>
          <p className="text-muted-foreground">Track and manage your team's capacity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Dialog open={isAddCapacityOpen} onOpenChange={setIsAddCapacityOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Update Capacity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Team Member Capacity</DialogTitle>
                <DialogDescription>Adjust the capacity allocation for a team member.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="member" className="text-right">
                    Team Member
                  </Label>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="capacity" className="text-right">
                    Capacity (%)
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="0"
                    max="100"
                    value={capacityValue}
                    onChange={(e) => setCapacityValue(Number.parseInt(e.target.value))}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddCapacityOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsAddCapacityOpen(false)}>Update Capacity</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Capacity Overview</CardTitle>
          <CardDescription>Current capacity allocation and utilization for your team</CardDescription>
        </CardHeader>
        <CardContent>
          <TeamCapacityChart />
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Allocated Capacity</TableHead>
              <TableHead>Used Capacity</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                      <AvatarFallback>{member.initials}</AvatarFallback>
                    </Avatar>
                    <span>{member.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{member.role}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700"
                      role="progressbar"
                      aria-valuenow={member.allocatedCapacity}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${member.allocatedCapacity}%` }}
                      />
                    </div>
                    <span className="text-sm">{member.allocatedCapacity}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700"
                      role="progressbar"
                      aria-valuenow={member.usedCapacity}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`h-full rounded-full ${
                          member.usedCapacity > member.allocatedCapacity
                            ? "bg-red-500"
                            : member.usedCapacity < member.allocatedCapacity * 0.7
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                        style={{ width: `${member.usedCapacity}%` }}
                      />
                    </div>
                    <span className="text-sm">{member.usedCapacity}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      member.status === "Overallocated"
                        ? "border-red-500 text-red-500"
                        : member.status === "Underutilized"
                          ? "border-yellow-500 text-yellow-500"
                          : "border-green-500 text-green-500"
                    }
                  >
                    {member.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
