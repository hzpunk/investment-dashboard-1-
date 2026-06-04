import { apiFetch, ApiClientError } from "@/lib/api-client"

export type Profile = {
  id: string
  username: string
  avatarUrl: string | null
  role: string | null
  createdAt: string
}

type CurrentUserResponse = {
  user: { id: string; role: string; username?: string | null } | null
}

async function assertCurrentUser(userId: string) {
  const { user } = await apiFetch<CurrentUserResponse>("/api/auth/me", { credentials: "include" })
  if (!user || user.id !== userId) {
    throw new ApiClientError("Forbidden", "FORBIDDEN", 403)
  }
  return user
}

export async function fetchUserProfile(userId: string) {
  await assertCurrentUser(userId)
  return apiFetch<Profile>("/api/data/profiles", { credentials: "include" })
}

export async function updateUserProfile(userId: string, updates: Partial<Profile>) {
  await assertCurrentUser(userId)
  return apiFetch<Profile>("/api/data/profiles", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
}

export async function ensureUserProfile(userId: string) {
  try {
    await fetchUserProfile(userId)
    return true
  } catch (error) {
    console.error("Error ensuring user profile:", error)
    return false
  }
}

export async function getUserRole(userId: string): Promise<string> {
  try {
    const user = await assertCurrentUser(userId)
    return user.role || "user"
  } catch (error) {
    console.error("Error getting user role:", error)
    return "user"
  }
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  return (await getUserRole(userId)) === "admin"
}

export async function setUserRole(userId: string, role: string) {
  try {
    await apiFetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    return true
  } catch (error) {
    console.error("Error setting user role:", error)
    return false
  }
}
