"use client"

import { useCallback, useEffect, useState } from "react"
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
import { useI18n } from "@/contexts/i18n-context"

type AdminUser = {
  id: string
  email: string
  username: string
  role: "admin" | "user" | "premium"
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  lastSignInAt: string | null
}

async function readJson(res: Response) {
  return res.json().catch(() => null)
}

export default function AdminUsersPage() {
  const { user, userRole, isLoading: isAuthLoading } = useAuth()
  const { t } = useI18n()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<keyof AdminUser>("username")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    username: "",
    role: "user" as AdminUser["role"],
  })

  const fetchUsers = useCallback(async () => {
    if (isAuthLoading) return
    if (userRole !== "admin") {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/users", { credentials: "include" })
      const data = await readJson(res)
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load users")
      }

      setUsers(Array.isArray(data?.users) ? data.users : [])
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to load users" })
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [isAuthLoading, userRole])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  if (!isAuthLoading && userRole !== "admin") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{t("admin.accessDenied")}</h2>
          <p className="text-muted-foreground">{t("admin.accessDeniedDescription")}</p>
        </div>
      </div>
    )
  }

  const handleSort = (column: keyof AdminUser) => {
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

    return sortDirection === "asc" ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue)
  })

  const filteredUsers = sortedUsers.filter(
    (row) =>
      row.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.role.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.username) {
      setMessage({ type: "error", text: t("admin.requiredFields") })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })
      const data = await readJson(res)
      if (!res.ok) {
        throw new Error(data?.error || t("admin.userCreateFailed"))
      }

      setUsers((current) => [data.user, ...current])
      setNewUser({ email: "", password: "", username: "", role: "user" })
      setIsAddUserOpen(false)
      setMessage({ type: "success", text: t("admin.userCreated") })
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || t("admin.userCreateFailed") })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateUserRole = async (userId: string, role: AdminUser["role"]) => {
    setUpdatingUserId(userId)
    setMessage(null)

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      const data = await readJson(res)
      if (!res.ok) {
        throw new Error(data?.error || t("admin.roleUpdateFailed"))
      }

      setUsers((current) => current.map((row) => (row.id === userId ? data.user : row)))
      setMessage({ type: "success", text: t("admin.roleUpdated") })
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || t("admin.roleUpdateFailed") })
      fetchUsers()
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      setMessage({ type: "error", text: "You cannot delete your own admin account" })
      return
    }

    if (!confirm(t("admin.confirmDeleteUser"))) {
      return
    }

    setUpdatingUserId(userId)
    setMessage(null)

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await readJson(res)
      if (!res.ok) {
        throw new Error(data?.error || t("admin.userDeleteFailed"))
      }

      setUsers((current) => current.filter((row) => row.id !== userId))
      setMessage({ type: "success", text: t("admin.userDeleted") })
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || t("admin.userDeleteFailed") })
    } finally {
      setUpdatingUserId(null)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("admin.usersTitle")} text={t("admin.usersDescription")}>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              {t("admin.addUser")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.addUserTitle")}</DialogTitle>
              <DialogDescription>{t("admin.addUserDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  {t("common.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  {t("auth.username")}
                </Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(event) => setNewUser({ ...newUser, username: event.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  {t("auth.password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  {t("common.type")}
                </Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value as AdminUser["role"] })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("common.type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t("role.user")}</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="admin">{t("role.admin")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAddUser} disabled={isSubmitting}>
                {isSubmitting ? t("admin.creatingUser") : t("admin.createUser")}
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
                placeholder={t("admin.searchUsers")}
                className="pl-8"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
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
                        {t("auth.username")}
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
                        {t("common.type")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("createdAt")}>
                        {t("common.createdAt")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <span className="font-medium">{t("admin.lastSignIn")}</span>
                    </TableHead>
                    <TableHead className="w-[150px]">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        {searchQuery ? t("admin.noUsersBySearch") : t("admin.noUsers")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.username}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>
                          <Select
                            value={row.role}
                            disabled={updatingUserId === row.id}
                            onValueChange={(value) => handleUpdateUserRole(row.id, value as AdminUser["role"])}
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue placeholder={t("common.type")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">{t("role.user")}</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="admin">{t("role.admin")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {row.lastSignInAt ? new Date(row.lastSignInAt).toLocaleDateString() : t("admin.never")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(row.id)}
                            disabled={updatingUserId === row.id || row.id === user?.id}
                            className="h-8 px-2"
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            {t("common.delete")}
                          </Button>
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
