import { supabase } from "@/shared/api/supabase"
import type { Database } from "@/types/supabase"

type AdminSetting = Database["public"]["Tables"]["admin_settings"]["Row"]
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"]
type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"]

// Admin Settings API
export async function fetchAdminSettings() {
  const { data, error } = await supabase.from("admin_settings").select("*").order("setting_key")

  if (error) throw error
  return data || []
}

export async function updateAdminSetting(id: string, value: string) {
  const { data, error } = await supabase
    .from("admin_settings")
    .update({
      setting_value: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createAdminSetting(setting: Omit<AdminSetting, "id" | "updated_at">) {
  const { data, error } = await supabase
    .from("admin_settings")
    .insert({
      ...setting,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// User Roles API
export async function fetchUserRoles() {
  const { data, error } = await supabase
    .from("user_roles")
    .select(`
      *,
      profiles(username, avatar_url)
    `)
    .order("assigned_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function assignUserRole(userId: string, role: "admin" | "user" | "premium") {
  // Check if user already has a role
  const { data: existingRole } = await supabase.from("user_roles").select("id").eq("user_id", userId).single()

  if (existingRole) {
    // Update existing role
    const { data, error } = await supabase
      .from("user_roles")
      .update({
        role,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", existingRole.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new role
    const { data, error } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role,
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export async function removeUserRole(id: string) {
  const { error } = await supabase.from("user_roles").delete().eq("id", id)

  if (error) throw error
  return true
}

// Audit Logs API
export async function fetchAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select(`
      *,
      profiles(username)
    `)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function createAuditLog(log: Omit<AuditLog, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      ...log,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Check if user is admin
export async function isUserAdmin(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .single()

  if (error && error.code !== "PGRST116") throw error
  return !!data
}

