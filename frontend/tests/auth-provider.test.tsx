import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AuthProvider, useAuth } from "@/components/auth-provider"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/login",
}))

void push

function Probe() {
  const { user, login, logout, isLoading } = useAuth()
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
      <button onClick={() => login("ghost@example.com", "password").catch(() => {})}>
        login-unknown
      </button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

describe("AuthProvider (mock auth)", () => {
  beforeEach(() => {
    window.localStorage.clear()
    push.mockClear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it("rejects invalid credentials without logging in", async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await user.click(screen.getByText("login-unknown"))
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("none"))
    expect(window.localStorage.getItem("user")).toBeNull()
  })

  it("rejects the wrong password for a known user", async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await user.click(screen.getByText("login-bad-password"))
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("none"))
    expect(window.localStorage.getItem("user")).toBeNull()
  })

  it("logs in a known user and persists the session", async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await user.click(screen.getByText("login-admin"))
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("admin@example.com:admin"),
    )
    expect(JSON.parse(window.localStorage.getItem("user") || "{}")).toMatchObject({
      email: "admin@example.com",
      role: "admin",
    })
    expect(JSON.parse(window.localStorage.getItem("user") || "{}")).not.toHaveProperty(
      "password",
    )
  })

  it("restores a persisted session on mount", async () => {
    window.localStorage.setItem(
      "user",
      JSON.stringify({ id: "1", name: "Admin User", email: "admin@example.com", role: "admin" }),
    )
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("admin@example.com:admin"),
    )
  })

  it("clears the session on logout", async () => {
    window.localStorage.setItem(
      "user",
      JSON.stringify({ id: "1", name: "Admin User", email: "admin@example.com", role: "admin" }),
    )
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await user.click(screen.getByText("logout"))
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("none"))
    expect(window.localStorage.getItem("user")).toBeNull()
    expect(push).toHaveBeenCalledWith("/login")
  })
})
