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
export async function ensureUserProfile(userId: string, username = "") {
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

