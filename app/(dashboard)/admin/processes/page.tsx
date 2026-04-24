"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Pause, RefreshCw } from "lucide-react"
import { updateAssetPrices } from "@/entities/asset/api"
import { useI18n } from "@/contexts/i18n-context"
import { getStatusLabel } from "@/lib/i18n-display"

export default function AdminProcessesPage() {
  const { userRole } = useAuth()
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [processes, setProcesses] = useState([
    {
      id: "1",
      name: "Asset Price Update",
      status: "running",
      lastRun: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      nextRun: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      schedule: "0 0 * * *", // Daily at midnight
      description: "Updates asset prices from external APIs",
    },
    {
      id: "2",
      name: "Database Backup",
      status: "scheduled",
      lastRun: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      nextRun: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      schedule: "0 0 * * *", // Daily at midnight
      description: "Creates a backup of the database",
    },
    {
      id: "3",
      name: "User Data Cleanup",
      status: "paused",
      lastRun: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
      nextRun: null,
      schedule: "0 0 * * 0", // Weekly on Sunday
      description: "Removes temporary user data",
    },
    {
      id: "4",
      name: "Market Data Sync",
      status: "failed",
      lastRun: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
      nextRun: new Date(Date.now() + 43200000).toISOString(), // 12 hours from now
      schedule: "0 */12 * * *", // Every 12 hours
      description: "Synchronizes market data from external sources",
    },
  ])
  const [logs, setLogs] = useState([
    {
      id: "1",
      process: "Asset Price Update",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      level: "info",
      message: "Successfully updated prices for 120 assets",
    },
    {
      id: "2",
      process: "Database Backup",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      level: "info",
      message: "Database backup completed successfully",
    },
    {
      id: "3",
      process: "Market Data Sync",
      timestamp: new Date(Date.now() - 43200000).toISOString(),
      level: "error",
      message: "Failed to connect to external API: Connection timeout",
    },
    {
      id: "4",
      process: "User Data Cleanup",
      timestamp: new Date(Date.now() - 604800000).toISOString(),
      level: "info",
      message: "Removed 250 temporary records",
    },
    {
      id: "5",
      process: "Asset Price Update",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      level: "warning",
      message: "Some assets failed to update: API rate limit exceeded",
    },
  ])
  const [runningProcess, setRunningProcess] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      if (userRole !== "admin") {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // In a real app, you would fetch processes and logs from your database
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        setMessage({ type: "error", text: t("errors.unavailable") })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userRole])

  // Check if user is admin
  if (userRole !== "admin") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{t("admin.accessDenied")}</h2>
          <p className="text-muted-foreground">{t("admin.accessDeniedDescription")}</p>
        </div>
      </div>
    )
  }

  const handleRunProcess = async (processId: string) => {
    setRunningProcess(processId)
    setProgress(0)
    setMessage(null)

    try {
      // Find the process
      const process = processes.find((p) => p.id === processId)
      if (!process) throw new Error(t("errors.unavailable"))

      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 10
        })
      }, 300)

      // Run the actual process based on the name
      if (process.name === "Asset Price Update") {
        await updateAssetPrices()
      } else {
        // Simulate other processes
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }

      // Update process status
      setProcesses(
        processes.map((p) =>
          p.id === processId
            ? {
                ...p,
                status: "running",
                lastRun: new Date().toISOString(),
                nextRun: new Date(Date.now() + 3600000).toISOString(),
              }
            : p,
        ),
      )

      // Add a log entry
      const newLog = {
        id: Date.now().toString(),
        process: process.name,
        timestamp: new Date().toISOString(),
        level: "info",
        message: `Process ${process.name} executed successfully`,
      }
      setLogs([newLog, ...logs])

      setMessage({ type: "success", text: t("status.success") })
    } catch (error: any) {

      // Add an error log entry
      const process = processes.find((p) => p.id === processId)
      if (process) {
        const errorLog = {
          id: Date.now().toString(),
          process: process.name,
          timestamp: new Date().toISOString(),
          level: "error",
          message: `Error: ${error.message || "Unknown error"}`,
        }
        setLogs([errorLog, ...logs])
      }

      setMessage({ type: "error", text: t("status.error") })
    } finally {
      setRunningProcess(null)
      setProgress(0)
    }
  }

  const handleToggleProcess = (processId: string) => {
    setProcesses(
      processes.map((p) =>
        p.id === processId
          ? {
              ...p,
              status: p.status === "paused" ? "scheduled" : "paused",
              nextRun: p.status === "paused" ? new Date(Date.now() + 3600000).toISOString() : null,
            }
          : p,
      ),
    )

    // Add a log entry
    const process = processes.find((p) => p.id === processId)
    if (process) {
      const newStatus = process.status === "paused" ? "scheduled" : "paused"
      const newLog = {
        id: Date.now().toString(),
        process: process.name,
        timestamp: new Date().toISOString(),
        level: "info",
        message: `Process ${process.name} ${newStatus === "paused" ? "paused" : "scheduled"}`,
      }
      setLogs([newLog, ...logs])
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("admin.processesTitle")} text={t("admin.processesDescription")} />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <Tabs defaultValue="processes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="processes">{t("admin.processesTitle")}</TabsTrigger>
            <TabsTrigger value="logs">{t("admin.processLogs")}</TabsTrigger>
          </TabsList>

          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-4">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="processes">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.processesTitle")}</CardTitle>
                <CardDescription>{t("admin.processesDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Process Name</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>{t("common.lastUpdated")}</TableHead>
                        <TableHead>{t("common.nextRun")}</TableHead>
                        <TableHead className="w-[150px]">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processes.map((process) => (
                        <TableRow key={process.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{process.name}</div>
                              <div className="text-sm text-muted-foreground">{process.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                process.status === "running"
                                  ? "default"
                                  : process.status === "scheduled"
                                    ? "outline"
                                    : process.status === "paused"
                                      ? "secondary"
                                      : "destructive"
                              }
                            >
                              {getStatusLabel(process.status, t)}
                            </Badge>
                          </TableCell>
                          <TableCell>{process.schedule}</TableCell>
                          <TableCell>
                            {process.lastRun ? new Date(process.lastRun).toLocaleString() : t("admin.never")}
                          </TableCell>
                          <TableCell>
                            {process.nextRun ? new Date(process.nextRun).toLocaleString() : t("status.scheduled")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRunProcess(process.id)}
                                disabled={runningProcess === process.id}
                              >
                                <RefreshCw
                                  className={`h-4 w-4 ${runningProcess === process.id ? "animate-spin" : ""}`}
                                />
                                <span className="sr-only">{t("admin.run")}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleProcess(process.id)}
                                disabled={process.status === "running" || runningProcess === process.id}
                              >
                                {process.status === "paused" ? (
                                  <Play className="h-4 w-4" />
                                ) : (
                                  <Pause className="h-4 w-4" />
                                )}
                                <span className="sr-only">{process.status === "paused" ? t("admin.resume") : t("admin.pause")}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {runningProcess && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {t("admin.running")}: {processes.find((p) => p.id === runningProcess)?.name}
                      </span>
                      <span className="text-sm">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.processLogs")}</CardTitle>
                <CardDescription>{t("admin.processesDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Process</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                          <TableCell>{log.process}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                log.level === "info" ? "outline" : log.level === "warning" ? "secondary" : "destructive"
                              }
                            >
                              {log.level}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

