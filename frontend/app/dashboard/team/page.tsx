"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Edit, MoreHorizontal, Trash2, UserPlus } from "lucide-react"

// Mock team members data
const initialTeamMembers = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "Developer",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "JD",
    capacity: 85,
    github: "johndoe",
  },
  {
    id: "2",
    name: "Sarah Smith",
    email: "sarah@example.com",
    role: "Team Lead",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "SS",
    capacity: 70,
    github: "sarahsmith",
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike@example.com",
    role: "Developer",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "MJ",
    capacity: 90,
    github: "mikej",
  },
  {
    id: "4",
    name: "Lisa Brown",
    email: "lisa@example.com",
    role: "Developer",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "LB",
    capacity: 60,
    github: "lisab",
  },
  {
    id: "5",
    name: "David Wilson",
    email: "david@example.com",
    role: "Developer",
    avatar: "/placeholder.svg?height=40&width=40",
    initials: "DW",
    capacity: 75,
    github: "davidw",
  },
]

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState(initialTeamMembers)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "Developer",
    capacity: 80,
    github: "",
  })

  const handleAddMember = () => {
    const id = (teamMembers.length + 1).toString()
    const initials = newMember.name
      .split(" ")
      .map((n) => n[0])
      .join("")

    setTeamMembers([
      ...teamMembers,
      {
        id,
        ...newMember,
        avatar: "/placeholder.svg?height=40&width=40",
        initials,
      },
    ])

    setNewMember({
      name: "",
      email: "",
      role: "Developer",
      capacity: 80,
      github: "",
    })

    setIsAddDialogOpen(false)
  }

  const handleDeleteMember = (id: string) => {
    setTeamMembers(teamMembers.filter((member) => member.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">Manage your team members and their capacities</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Add a new member to your team. They will receive an invitation email.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select value={newMember.role} onValueChange={(value) => setNewMember({ ...newMember, role: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Developer">Developer</SelectItem>
                    <SelectItem value="Team Lead">Team Lead</SelectItem>
                    <SelectItem value="Product Owner">Product Owner</SelectItem>
                    <SelectItem value="Scrum Master">Scrum Master</SelectItem>
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
                  value={newMember.capacity}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      capacity: Number.parseInt(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="github" className="text-right">
                  GitHub Username
                </Label>
                <Input
                  id="github"
                  value={newMember.github}
                  onChange={(e) => setNewMember({ ...newMember, github: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember}>Add Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>GitHub</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                    <div>
                      <div>{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    </div>
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
                      aria-valuenow={member.capacity}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="h-full rounded-full bg-primary" style={{ width: `${member.capacity}%` }} />
                    </div>
                    <span className="text-sm">{member.capacity}%</span>
                  </div>
                </TableCell>
                <TableCell>{member.github}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteMember(member.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
