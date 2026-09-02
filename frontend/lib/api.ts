export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

export type Role = "admin" | "team_lead" | "developer"

export interface UserDto {
  id: number
  username: string
  email: string | null
  role: Role
  githubUsername: string | null
  dailyCapacityHours: number
}

export interface SprintDto {
  id: number
  name: string
  startDate: string | null
  endDate: string | null
  totalEstimatedHours: number
  taskCount: number
}

export interface TaskDto {
  id: string
  title: string
  estimatedHours: number
  status: string | null
  assignedUserId: number | null
  assignedUsername: string | null
  sprintId: number | null
  sprintName: string | null
}

export interface WorkloadDto {
  userId: number
  username: string
  role: Role
  dailyCapacityHours: number
  allocatedHours: number
  usedHours: number
}

export interface SyncResultDto {
  imported: number
  skipped: number
  tasks: TaskDto[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const body = await response.text()
      if (body) message = body
    } catch {
      // keep status text
    }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  // Users
  listUsers: () => request<UserDto[]>("/api/users"),
  getUser: (id: number) => request<UserDto>(`/api/users/${id}`),
  createUser: (body: { username: string; email?: string; role: Role; githubUsername?: string; dailyCapacityHours?: number }) =>
    request<UserDto>("/api/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id: number, body: { username: string; email?: string; role: Role; githubUsername?: string; dailyCapacityHours?: number }) =>
    request<UserDto>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteUser: (id: number) => request<void>(`/api/users/${id}`, { method: "DELETE" }),

  // Sprints
  listSprints: () => request<SprintDto[]>("/api/sprints"),
  createSprint: (body: { name: string; startDate?: string; endDate?: string }) =>
    request<SprintDto>("/api/sprints", { method: "POST", body: JSON.stringify(body) }),
  deleteSprint: (id: number) => request<void>(`/api/sprints/${id}`, { method: "DELETE" }),

  // Tasks
  listTasks: () => request<TaskDto[]>("/api/tasks"),
  createTask: (body: { title: string; estimatedHours?: number; status?: string; assignedUserId?: number; sprintId?: number }) =>
    request<TaskDto>("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
  updateTask: (id: string, body: { title: string; estimatedHours?: number; status?: string; assignedUserId?: number; sprintId?: number }) =>
    request<TaskDto>(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteTask: (id: string) => request<void>(`/api/tasks/${id}`, { method: "DELETE" }),

  // Capacity
  getWorkload: () => request<WorkloadDto[]>("/api/capacity/workload"),

  // GitHub
  syncRepo: (ownerAndRepo: string, token?: string) =>
    request<SyncResultDto>(`/api/github/sync/${ownerAndRepo}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
}

// ---- settings (localStorage-backed; the Settings page drives these) ----

const WORKING_HOURS_KEY = "act.workingHoursPerDay"

export function getWorkingHoursPerDay(): number {
  if (typeof window === "undefined") return 8
  const raw = window.localStorage.getItem(WORKING_HOURS_KEY)
  const value = raw ? Number.parseInt(raw, 10) : 8
  return Number.isFinite(value) && value > 0 ? value : 8
}

export function setWorkingHoursPerDay(hours: number) {
  window.localStorage.setItem(WORKING_HOURS_KEY, String(hours))
}

const GITHUB_TOKEN_KEY = "act.githubToken"

export function getStoredGitHubToken(): string {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(GITHUB_TOKEN_KEY) ?? ""
}

export function setStoredGitHubToken(token: string) {
  if (token) {
    window.localStorage.setItem(GITHUB_TOKEN_KEY, token)
  } else {
    window.localStorage.removeItem(GITHUB_TOKEN_KEY)
  }
}

// ---- capacity derivation ----

/**
 * Derives a capacity percentage for a workload entry.
 * Sprint days (or 10 if no sprint bounds) × working hours/day defines 100%.
 */
export function toCapacityPercent(workload: WorkloadDto, sprintDays: number, workingHoursPerDay: number): number {
  const total = Math.max(1, sprintDays * workingHoursPerDay)
  return Math.round((workload.usedHours / total) * 100)
}
