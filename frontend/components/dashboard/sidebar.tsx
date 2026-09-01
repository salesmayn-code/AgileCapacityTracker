"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Calendar, Github, Home, LogOut, Settings, Users } from "lucide-react"

export function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      roles: ["admin", "team_lead", "developer"],
    },
    {
      name: "Team",
      href: "/dashboard/team",
      icon: Users,
      roles: ["admin", "team_lead"],
    },
    {
      name: "GitHub",
      href: "/dashboard/github",
      icon: Github,
      roles: ["admin", "team_lead", "developer"],
    },
    {
      name: "Capacity",
      href: "/dashboard/capacity",
      icon: BarChart3,
      roles: ["admin", "team_lead", "developer"],
    },
    {
      name: "Sprints",
      href: "/dashboard/sprints",
      icon: Calendar,
      roles: ["admin", "team_lead", "developer"],
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      roles: ["admin", "team_lead", "developer"],
    },
  ]

  return (
    <div className="flex flex-col w-64 bg-white dark:bg-gray-800 border-r">
      <div className="flex items-center h-16 px-4 border-b">
        <Link className="flex items-center" href="/dashboard">
          <BarChart3 className="h-6 w-6 mr-2 text-primary" />
          <span className="font-bold">Agile Tracker</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          {navItems
            .filter((item) => item.roles.includes(user?.role || ""))
            .map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive(item.href)
                    ? "bg-gray-100 dark:bg-gray-700 text-primary"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
        </nav>
      </div>
      <div className="p-4 border-t">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role.replace("_", " ")}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full flex items-center justify-center" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  )
}
