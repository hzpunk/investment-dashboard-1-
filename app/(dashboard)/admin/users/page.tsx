"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, UserPlus, UserX, ArrowUpDown } from "lucide-react"
import { supabase } from "@/shared/api/supabase"

interface User {
  id: string
  email: string
  username: string
  role: string
  created_at: string
  last_sign_in_at: string | null
}

export default function AdminUsersPage() {
  const { user, userRole } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sortColumn, setSortColumn] = useState<keyof User>("username")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    username: "",
    role: "user",
  })

  useEffect(() => {
    const fetchUsers = async () => {
      if (userRole !== "admin") {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // Get all users from auth
        const { data: authUsers, error: authError } = await supabase.from("profiles").select("*")

        if (authError) {
          console.error("Auth error:", authError)
          throw new Error("Failed to fetch users from profiles")
        }

        // Get auth data for emails
        const { data: authData, error: authDataError } = await supabase.auth.admin.listUsers()

        if (authDataError) {
          console.error("Auth data error:", authDataError)
          // Continue with profiles data only
        }

        // Map auth emails to profiles
        const usersWithEmail = authUsers.map((profile) => {
          const authUser = authData?.users?.find((u) => u.id === profile.id)

          return {
            id: profile.id,
            email: authUser?.email || "No email available",
            username: profile.username || "Unknown",
            role: profile.role || "user",
            created_at: profile.created_at || new Date().toISOString(),
            last_sign_in_at: authUser?.last_sign_in_at || null,
          }
        })

        setUsers(usersWithEmail)
      } catch (error: any) {
        console.error("Error fetching users:", error)
        setMessage({ type: "error", text: error.message || "Failed to load users" })

        // Provide fallback data
        setUsers([
          {
            id: "1",
            email: "admin@example.com",
            username: "Admin User",
            role: "admin",
            created_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
          },
          {
            id: "2",
            email: "user@example.com",
            username: "Regular User",
            role: "user",
            created_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [userRole])

  // Check if user is admin
  if (userRole !== "admin") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  const handleSort = (column: keyof User) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    return sortDirection === "asc" ? (aValue as any) - (bValue as any) : (bValue as any) - (aValue as any)
  })

  const filteredUsers = sortedUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.username) {
      setMessage({ type: "error", text: "Please fill in all required fields" })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
      })

      if (authError) throw authError

      // Create profile with role
      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          username: newUser.username,
          role: newUser.role,
          created_at: new Date().toISOString(),
        })

        if (profileError) throw profileError

        // Add to users list
        setUsers([
          ...users,
          {
            id: authData.user.id,
            email: authData.user.email || "",
            username: newUser.username,
            role: newUser.role,
            created_at: authData.user.created_at || new Date().toISOString(),
            last_sign_in_at: null,
          },
        ])

        // Reset form
        setNewUser({
          email: "",
          password: "",
          username: "",
          role: "user",
        })

        setIsAddUserOpen(false)
        setMessage({ type: "success", text: "User created successfully" })
      }
    } catch (error: any) {
      console.error("Error creating user:", error)
      setMessage({ type: "error", text: error.message || "Failed to create user" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId)

      if (error) throw error

      // Update local state
      setUsers(
        users.map((u) => {
          if (u.id === userId) {
            return { ...u, role: newRole }
          }
          return u
        }),
      )

      setMessage({ type: "success", text: "User role updated successfully" })
    } catch (error: any) {
      console.error("Error updating user role:", error)
      setMessage({ type: "error", text: error.message || "Failed to update user role" })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId)

      if (error) throw error

      // Update local state
      setUsers(users.filter((u) => u.id !== userId))
      setMessage({ type: "success", text: "User deleted successfully" })
    } catch (error: any) {
      console.error("Error deleting user:", error)
      setMessage({ type: "error", text: error.message || "Failed to delete user" })
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading="User Management" text="Manage user accounts and permissions.">
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>Create a new user account.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUser} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardHeader>

      <Card>
        <CardContent className="p-6">
          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-4">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
          <div className="flex items-center mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("username")}>
                        Username
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("email")}>
                        Email
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("role")}>
                        Role
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("created_at")}>
                        Created At
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <span className="font-medium">Last Sign In</span>
                    </TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        {searchQuery ? "No users found matching your search." : "No users found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select value={user.role} onValueChange={(value) => handleUpdateUserRole(user.id, value)}>
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="h-8 px-2"
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

