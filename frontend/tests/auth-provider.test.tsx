import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { api } from "@/lib/api"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/login",
}))

vi.mock("@/lib/api", () => ({
  api: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}))

void push

function Probe() {
  const { user, login, logout, isLoading, refreshUser } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user ? `${user.email}:${user.role}` : "none"}</span>
      <button onClick={() => login("admin@example.com", "password").catch(() => {})}>
        login-admin
      </button>
      <button onClick={() => login("admin@example.com", "wrong").catch(() => {})}>
        login-bad-password
      </button>
      <button onClick={logout}>logout</button>
      <button onClick={() => void refreshUser()}>refresh</button>
    </div>
  )
}

describe("AuthProvider (real BFF auth)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.me).mockRejectedValue(new Error("401"))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("starts unauthenticated when the session is gone", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"))
    expect(screen.getByTestId("user").textContent).toBe("none")
    expect(api.me).toHaveBeenCalled()
  })

  it("restores the session from the cookie via /api/auth/me", async () => {
    vi.mocked(api.me).mockResolvedValue({
      id: 1,
      username: "admin",
      email: "admin@example.com",
      role: "admin",
    })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("admin@example.com:admin"),
    )
  })

  it("rejects invalid credentials and stays logged out", async () => {
    vi.mocked(api.login).mockRejectedValue(new Error("Invalid email or password"))
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"))

    await user.click(screen.getByText("login-bad-password"))
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("none"))
    expect(window.localStorage.getItem("user")).toBeNull() // no token/user persisted client-side
  })

  it("logs in via the BFF and navigates to the dashboard", async () => {
    vi.mocked(api.login).mockResolvedValue({
      token: "server-side-only",
      expiresAtEpochSeconds: 1,
      user: { id: 1, username: "admin", email: "admin@example.com", role: "admin" },
    })
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"))

    await user.click(screen.getByText("login-admin"))
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("admin@example.com:admin"),
    )
    expect(push).toHaveBeenCalledWith("/dashboard")
  })

  it("clears the session cookie on logout via the BFF", async () => {
    vi.mocked(api.me).mockResolvedValue({
      id: 1,
      username: "admin",
      email: "admin@example.com",
      role: "admin",
    })
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("admin@example.com:admin"),
    )

    await user.click(screen.getByText("logout"))
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("none"))
    expect(api.logout).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith("/login")
  })

  it("refreshUser re-fetches the session and updates the displayed user (Phase 11)", async () => {
    vi.mocked(api.me).mockResolvedValue({
      id: 1,
      username: "admin",
      email: "admin@example.com",
      role: "admin",
    })
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("admin@example.com:admin"),
    )

    vi.mocked(api.me).mockResolvedValue({
      id: 1,
      username: "renamed",
      email: "renamed@example.com",
      role: "admin",
    })
    await user.click(screen.getByText("refresh"))
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("renamed@example.com:admin"),
    )
  })

  it("keeps the current user when refreshUser fails transiently", async () => {
    vi.mocked(api.me).mockResolvedValue({
      id: 1,
      username: "admin",
      email: "admin@example.com",
      role: "admin",
    })
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("admin@example.com:admin"),
    )

    vi.mocked(api.me).mockRejectedValue(new Error("network down"))
    await user.click(screen.getByText("refresh"))
    await waitFor(() => expect(api.me).toHaveBeenCalledTimes(2))
    expect(screen.getByTestId("user").textContent).toBe("admin@example.com:admin")
  })

  it("no longer references /register (registration is admin-created only)", () => {
    const source = require("node:fs").readFileSync(
      require("node:path").join("components", "auth-provider.tsx"),
      "utf-8",
    )
    expect(source).not.toContain("/register")
  })
})
