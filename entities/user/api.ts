import { supabase } from "@/shared/api/supabase"
import type { Database } from "@/types/supabase"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

// Fetch user profile
export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error) throw error
  return data
}

// Update user profile
export async function updateUserProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single()

  if (error) throw error
  return data
}

// Add a function to ensure the user profile exists
export async function ensureUserProfile(userId: string, username: string) {
  try {
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "row not found"
      throw checkError
    }

    // If profile doesn't exist, create it
    if (!existingProfile) {
      const { error: createError } = await supabase.from("profiles").insert({
        id: userId,
        username: username || "User",
        role: "user", // Default role
        created_at: new Date().toISOString(),
      })

      if (createError) throw createError
    }

    return true
  } catch (error) {
    console.error("Error ensuring user profile:", error)
    return false
  }
}

// Get user role
export async function getUserRole(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single()

    if (error) throw error
    return data?.role || "user"
  } catch (error) {
    console.error("Error getting user role:", error)
    return "user"
  }
}

// Check if user is admin
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const role = await getUserRole(userId)
    return role === "admin"
  } catch (error) {
    console.error("Error checking if user is admin:", error)
    return false
  }
}

// Set user role
export async function setUserRole(userId: string, role: string) {
  try {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error("Error setting user role:", error)
    return false
  }
}

