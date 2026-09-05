"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-provider"
import { api, getStoredGitHubToken, setStoredGitHubToken } from "@/lib/api"

export default function SettingsPage() {
  const { user, refreshUser } = useAuth() as { user: import("@/lib/api").AuthUser | null; refreshUser?: () => void }
  const { toast } = useToast()
  const isAdmin = user?.role === "admin"

  // Account tab
  const [name, setName] = useState("")
  const [githubUsername, setGithubUsername] = useState("")
  const [dailyCapacity, setDailyCapacity] = useState("8")
  const [savingProfile, setSavingProfile] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  // GitHub tab
  const [gitHubToken, setGitHubToken] = useState("")

  // Capacity tab
  const [workingHours, setWorkingHours] = useState("8")
  const [syncFrequency, setSyncFrequency] = useState<"manual" | "hourly" | "daily">("manual")
  const [capacityAlerts, setCapacityAlerts] = useState(true)
  const [underallocationAlerts, setUnderallocationAlerts] = useState(true)
  const [savingCapacity, setSavingCapacity] = useState(false)

  useEffect(() => {
    setGitHubToken(getStoredGitHubToken())
    let cancelled = false
    api
      .getTeamSettings()
      .then((s) => {
        if (cancelled) return
        setWorkingHours(String(s.workingHoursPerDay))
        setSyncFrequency(s.syncFrequency)
        setCapacityAlerts(s.capacityAlertsEnabled)
        setUnderallocationAlerts(s.underallocationAlertsEnabled)
      })
      .catch(() => {
        // keep defaults if the server is unreachable
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (user) {
      setName(user.username)
      setDailyCapacity(String((user as unknown as { dailyCapacityHours?: number }).dailyCapacityHours ?? 8))
    }
  }, [user])

  const handleSaveProfile = async () => {
    const hours = Number.parseInt(dailyCapacity, 10)
    if (!name.trim()) {
      toast({ title: "Invalid name", description: "Name cannot be empty.", variant: "destructive" })
      return
    }
    if (!Number.isFinite(hours) || hours < 0) {
      toast({ title: "Invalid value", description: "Daily capacity hours must be zero or more.", variant: "destructive" })
      return
    }
    setSavingProfile(true)
    try {
      await api.updateProfile({
        username: name.trim(),
        githubUsername: githubUsername.trim() || undefined,
        dailyCapacityHours: hours,
      })
      await refreshUser?.()
      toast({ title: "Profile saved", description: "Your account details were updated." })
    } catch (error) {
      toast({
        title: "Failed to save profile",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "New password and confirmation must match.", variant: "destructive" })
      return
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "New password must be at least 8 characters.", variant: "destructive" })
      return
    }
    setSavingPassword(true)
    try {
      await api.changePassword({ currentPassword, newPassword })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast({ title: "Password updated", description: "Use your new password next time you sign in." })
    } catch (error) {
      toast({
        title: "Failed to change password",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSaveGitHub = () => {
    setStoredGitHubToken(gitHubToken.trim())
    toast({
      title: "GitHub settings saved",
      description: gitHubToken.trim()
        ? "Your token is stored locally in this browser."
        : "No token set; the server's configured token will be used.",
    })
  }

  const handleSaveCapacity = async () => {
    if (!isAdmin) {
      toast({
        title: "Read-only",
        description: "Only administrators can change team settings.",
        variant: "destructive",
      })
      return
    }
    const hours = Number.parseInt(workingHours, 10)
    if (!Number.isFinite(hours) || hours < 1 || hours > 24) {
      toast({
        title: "Invalid value",
        description: "Working hours per day must be between 1 and 24.",
        variant: "destructive",
      })
      return
    }
    setSavingCapacity(true)
    try {
      const saved = await api.updateTeamSettings({
        workingHoursPerDay: hours,
        syncFrequency,
        capacityAlertsEnabled: capacityAlerts,
        underallocationAlertsEnabled: underallocationAlerts,
      })
      setWorkingHours(String(saved.workingHoursPerDay))
      setSyncFrequency(saved.syncFrequency)
      setCapacityAlerts(saved.capacityAlertsEnabled)
      setUnderallocationAlerts(saved.underallocationAlertsEnabled)
      toast({
        title: "Settings saved",
        description: `Team capacity now assumes ${saved.workingHoursPerDay} working hours per day.`,
      })
    } catch (error) {
      toast({
        title: "Failed to save settings",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSavingCapacity(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your account and application settings</p>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="github">GitHub Integration</TabsTrigger>
          <TabsTrigger value="capacity">Capacity Tracking</TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your profile; email and role are managed by an administrator</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-username">GitHub Username</Label>
                <Input
                  id="github-username"
                  placeholder="octocat"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-capacity">Daily Capacity Hours</Label>
                <Input
                  id="daily-capacity"
                  type="number"
                  min="0"
                  value={dailyCapacity}
                  onChange={(e) => setDailyCapacity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={user?.role.replace("_", " ")} disabled />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleChangePassword} disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}>
                {savingPassword ? "Updating…" : "Update Password"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="github" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>Configure your GitHub integration settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-token">GitHub Personal Access Token</Label>
                <Input
                  id="github-token"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={gitHubToken}
                  onChange={(e) => setGitHubToken(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Create a token with <code>repo</code> scope in your GitHub settings.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveGitHub}>Save GitHub Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="capacity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Capacity Tracking</CardTitle>
              <CardDescription>
                Shared team setting stored on the server — sprint length is derived from sprint dates
                (weekdays only), so only working hours per day is configured here
                {isAdmin ? "" : " (admin-only)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="working-hours">Working Hours Per Day (team-wide)</Label>
                <Input
                  id="working-hours"
                  type="number"
                  min="1"
                  max="24"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sync-frequency">GitHub Sync Frequency</Label>
                <Select value={syncFrequency} onValueChange={(v) => setSyncFrequency(v as "manual" | "hourly" | "daily")} disabled={!isAdmin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual only</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  When not manual, the server re-syncs every remembered repository automatically using its own
                  configured token.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="overallocation"
                  checked={capacityAlerts}
                  onCheckedChange={setCapacityAlerts}
                  disabled={!isAdmin}
                />
                <Label htmlFor="overallocation">Alert on team member overallocation</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="underutilization"
                  checked={underallocationAlerts}
                  onCheckedChange={setUnderallocationAlerts}
                  disabled={!isAdmin}
                />
                <Label htmlFor="underutilization">Alert on team member underutilization</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveCapacity} disabled={!isAdmin || savingCapacity}>
                {savingCapacity ? "Saving…" : "Save Capacity Settings"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
