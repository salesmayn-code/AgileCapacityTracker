"use client"

import { useCallback, useEffect, useState } from "react"
import { api, type Role, type UserDto } from "@/lib/api"
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
import { useToast } from "@/components/ui/use-toast"

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  team_lead: "Team Lead",
  developer: "Developer",
}

interface MemberForm {
  username: string
  email: string
  role: Role
  githubUsername: string
  dailyCapacityHours: number
}

const EMPTY_FORM: MemberForm = {
  username: "",
  email: "",
  role: "developer",
  githubUsername: "",
  dailyCapacityHours: 8,
}

export default function TeamPage() {
  const { toast } = useToast()
  const [members, setMembers] = useState<UserDto[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UserDto | null>(null)
  const [form, setForm] = useState<MemberForm>(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setMembers(await api.allUsers())
    } catch (error) {
      toast({
        title: "Failed to load team",
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

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setIsAddDialogOpen(true)
  }

  const openEdit = (member: UserDto) => {
    setEditing(member)
    setForm({
      username: member.username,
      email: member.email ?? "",
      role: member.role,
      githubUsername: member.githubUsername ?? "",
      dailyCapacityHours: member.dailyCapacityHours,
    })
    setIsAddDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const body = {
        username: form.username,
        email: form.email || undefined,
        role: form.role,
        githubUsername: form.githubUsername || undefined,
        dailyCapacityHours: form.dailyCapacityHours,
      }
      if (editing) {
        await api.updateUser(editing.id, body)
        toast({ title: "Team member updated", description: `${form.username} has been updated.` })
      } else {
        await api.createUser(body)
        toast({ title: "Team member added", description: `${form.username} has been added to the team.` })
      }
      setIsAddDialogOpen(false)
      await load()
    } catch (error) {
      toast({
        title: "Failed to save team member",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.deleteUser(id)
      toast({ title: "Team member removed" })
      await load()
    } catch (error) {
      toast({
        title: "Failed to delete team member",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const initials = (username: string) =>
    username
      .split(/[\s_-]+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">Manage your team members and their capacities</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the details of this team member."
                  : "Add a new member to your team."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
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
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value as Role })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="team_lead">Team Lead</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hours" className="text-right">
                  Daily Capacity (hours)
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="1"
                  max="24"
                  value={form.dailyCapacityHours}
                  onChange={(e) =>
                    setForm({ ...form, dailyCapacityHours: Number.parseInt(e.target.value) || 0 })
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
                  value={form.githubUsername}
                  onChange={(e) => setForm({ ...form, githubUsername: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!form.username.trim()}>
                {editing ? "Save Changes" : "Add Member"}
              </Button>
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
              <TableHead>Daily Capacity</TableHead>
              <TableHead>GitHub</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading team members…
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No team members yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/placeholder.svg" alt={member.username} />
                        <AvatarFallback>{initials(member.username)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div>{member.username}</div>
                        <div className="text-xs text-muted-foreground">{member.email ?? "—"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABELS[member.role] ?? member.role}</Badge>
                  </TableCell>
                  <TableCell>{member.dailyCapacityHours}h / day</TableCell>
                  <TableCell>{member.githubUsername ?? "—"}</TableCell>
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
                        <DropdownMenuItem onClick={() => openEdit(member)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(member.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
