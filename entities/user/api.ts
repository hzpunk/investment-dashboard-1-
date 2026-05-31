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

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error || "Request failed")
  }

  return data as T
}

async function assertCurrentUser(userId: string) {
  const { user } = await apiFetch<CurrentUserResponse>("/api/auth/me")
  if (!user || user.id !== userId) {
    throw new Error("Profile access is limited to the current user")
  }
  return user
}

export async function fetchUserProfile(userId: string) {
  await assertCurrentUser(userId)
  return apiFetch<Profile>("/api/data/profiles")
}

export async function updateUserProfile(userId: string, updates: Partial<Profile>) {
  await assertCurrentUser(userId)
  return apiFetch<Profile>("/api/data/profiles", {
    method: "PUT",
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
      body: JSON.stringify({ role }),
    })
    return true
  } catch (error) {
    console.error("Error setting user role:", error)
    return false
  }
}
