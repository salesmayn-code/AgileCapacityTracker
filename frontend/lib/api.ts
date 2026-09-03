export type Role = "admin" | "team_lead" | "developer"

export interface AuthUser {
  id: number
  username: string
  email: string
  role: Role
}

export interface LoginResponse {
  token: string
  expiresAtEpochSeconds: number
  user: UserDto
}

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
  /** Server-computed (Phase 9): used / (sprintDays × workingHoursPerDay) × 100 */
  usedPercent: number
  /** Server-computed (Phase 9): allocated / (sprintDays × workingHoursPerDay) × 100 */
  allocatedPercent: number
}

/** Workload v2 envelope (Phase 9): all capacity math computed server-side. */
export interface WorkloadResponseDto {
  /** Weekdays (Mon-Fri) of the active sprint, or 10 when none covers today */
  sprintDays: number
  sprintName: string | null
  sprintActive: boolean
  workingHoursPerDay: number
  team: WorkloadDto[]
}

export interface TeamSettingsDto {
  workingHoursPerDay: number
}

export interface SyncResultDto {
  imported: number
  skipped: number
  tasks: TaskDto[]
}

export interface PageDto<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

function toQuery(opts?: { page?: number; size?: number }): string {
  if (!opts) return ""
  const params = new URLSearchParams()
  if (opts.page !== undefined) params.set("page", String(opts.page))
  if (opts.size !== undefined) params.set("size", String(opts.size))
  const query = params.toString()
  return query ? `?${query}` : ""
}

/**
 * All API calls are same-origin: the Next.js BFF (app/api/**) proxies them to the
 * Spring backend and attaches the session JWT from its httpOnly cookie. The
 * backend URL lives server-side only (BACKEND_URL env) - never exposed to the browser.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
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
      if (body) {
        // Backend returns JSON errors: { timestamp, status, error, message, fieldErrors? }
        try {
          const parsed = JSON.parse(body)
          if (parsed && typeof parsed === "object") {
            const fieldErrors = parsed.fieldErrors
            const fieldSummary =
              fieldErrors && typeof fieldErrors === "object"
                ? " (" +
                  Object.entries(fieldErrors)
                    .map(([field, msg]) => `${field}: ${msg}`)
                    .join("; ") +
                  ")"
                : ""
            message = `${parsed.message ?? parsed.error ?? message}${fieldSummary}`
          } else {
            message = body
          }
        } catch {
          message = body
        }
      }
    } catch {
      // keep status text
    }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  // Auth (BFF routes manage the httpOnly cookie)
  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<AuthUser>("/api/auth/me"),

  // Users
  listUsers: (opts?: { page?: number; size?: number }) => {
    const query = toQuery(opts)
    return request<PageDto<UserDto>>(`/api/users${query}`)
  },
  /** Convenience: every user, walking all pages (small datasets). */
  allUsers: async (): Promise<UserDto[]> => {
    const all: UserDto[] = []
    let page = 0
    for (;;) {
      const result = await api.listUsers({ page })
      all.push(...result.content)
      if (result.last || result.page >= result.totalPages - 1) break
      page++
    }
    return all
  },
  getUser: (id: number) => request<UserDto>(`/api/users/${id}`),
  createUser: (body: { username: string; email: string; role: Role; password: string; githubUsername?: string; dailyCapacityHours?: number }) =>
    request<UserDto>("/api/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id: number, body: { username: string; email?: string; role?: Role; password?: string; githubUsername?: string; dailyCapacityHours?: number }) =>
    request<UserDto>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteUser: (id: number) => request<void>(`/api/users/${id}`, { method: "DELETE" }),

  // Sprints
  listSprints: (opts?: { page?: number; size?: number }) => {
    const query = toQuery(opts)
    return request<PageDto<SprintDto>>(`/api/sprints${query}`)
  },
  /** Convenience: every sprint, walking all pages (small datasets). */
  allSprints: async (): Promise<SprintDto[]> => {
    const all: SprintDto[] = []
    let page = 0
    for (;;) {
      const result = await api.listSprints({ page })
      all.push(...result.content)
      if (result.last || result.page >= result.totalPages - 1) break
      page++
    }
    return all
  },
  createSprint: (body: { name: string; startDate?: string; endDate?: string }) =>
    request<SprintDto>("/api/sprints", { method: "POST", body: JSON.stringify(body) }),
  updateSprint: (id: number, body: { name: string; startDate?: string; endDate?: string }) =>
    request<SprintDto>(`/api/sprints/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSprint: (id: number) => request<void>(`/api/sprints/${id}`, { method: "DELETE" }),

  // Tasks
  listTasks: (opts?: { page?: number; size?: number }) => {
    const query = toQuery(opts)
    return request<PageDto<TaskDto>>(`/api/tasks${query}`)
  },
  /** Convenience: every task, walking all pages (small datasets). */
  allTasks: async (): Promise<TaskDto[]> => {
    const all: TaskDto[] = []
    let page = 0
    for (;;) {
      const result = await api.listTasks({ page })
      all.push(...result.content)
      if (result.last || result.page >= result.totalPages - 1) break
      page++
    }
    return all
  },
  createTask: (body: { title: string; estimatedHours?: number; status?: string; assignedUserId?: number; sprintId?: number }) =>
    request<TaskDto>("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
  updateTask: (id: string, body: { title: string; estimatedHours?: number; status?: string; assignedUserId?: number; sprintId?: number }) =>
    request<TaskDto>(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteTask: (id: string) => request<void>(`/api/tasks/${id}`, { method: "DELETE" }),

  // Capacity
  getWorkload: () => request<WorkloadResponseDto>("/api/capacity/workload"),

  // Team settings (shared, server-side; admin-only write)
  getTeamSettings: () => request<TeamSettingsDto>("/api/settings"),
  updateTeamSettings: (settings: TeamSettingsDto) =>
    request<TeamSettingsDto>("/api/settings", { method: "PUT", body: JSON.stringify(settings) }),

  // GitHub (PAT flows via X-GitHub-Token; Authorization is reserved for the session JWT,
  // which the BFF attaches automatically)
  syncRepo: (ownerAndRepo: string, token?: string) => {
    const [owner, repo] = ownerAndRepo.split("/").map((part) => encodeURIComponent(part.trim()))
    return request<SyncResultDto>(`/api/github/sync/${owner}/${repo}`, {
      method: "POST",
      headers: token ? { "X-GitHub-Token": token } : {},
    })
  },
}

// ---- settings ----
// Working hours/day is a shared server-side team setting since Phase 9
// (GET/PUT /api/settings); only the GitHub PAT remains browser-localStorage.

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
