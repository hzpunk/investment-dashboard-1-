"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import { fetchGoalById, updateGoal, deleteGoal } from "@/entities/goal/api"
import type { Database } from "@/types/supabase"
import { useI18n } from "@/contexts/i18n-context"

type Goal = Database["public"]["Tables"]["goals"]["Row"]

export default function GoalDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState<number>(0)
  const [currentAmount, setCurrentAmount] = useState<number>(0)
  const [targetDate, setTargetDate] = useState<string>("")

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        // Fetch goal details
        const goalData = await fetchGoalById(params.id)
        setGoal(goalData)

        // Set form values
        setName(goalData.name)
        setTargetAmount(goalData.target_amount)
        setCurrentAmount(goalData.current_amount)
        setTargetDate(goalData.target_date || "")
      } catch (error) {
        console.error("Error fetching goal data:", error)
        setMessage({ type: "error", text: t("errors.unavailable") })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, params.id])

  const handleUpdateGoal = async () => {
    if (!goal) return

    setIsSaving(true)
    setMessage(null)

    try {
      const updatedGoal = await updateGoal(goal.id, {
        name,
        target_amount: targetAmount,
        current_amount: currentAmount,
        target_date: targetDate || null,
      })

      setGoal(updatedGoal)
      setMessage({ type: "success", text: t("actions.saveChanges") })
    } catch (error) {
      console.error("Error updating goal:", error)
      setMessage({ type: "error", text: t("settings.profileUpdateFailed") })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteGoal = async () => {
    if (!goal) return

    if (!confirm(t("goals.confirmDelete"))) {
      return
    }

    try {
      await deleteGoal(goal.id)
      router.push("/goals")
    } catch (error) {
      console.error("Error deleting goal:", error)
      setMessage({ type: "error", text: t("settings.profileUpdateFailed") })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-2">{t("goals.notFound")}</h2>
        <p className="text-muted-foreground mb-4">
          {t("goals.notFoundDescription")}
        </p>
        <Button asChild variant="outline">
          <a href="/goals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("actions.backToGoals")}
          </a>
        </Button>
      </div>
    )
  }

  const progress = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
  const daysLeft = goal.target_date
    ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6">
      <DashboardHeader heading={goal.name} text={t("goals.trackAndUpdate")}>
        <Button variant="outline" asChild>
          <a href="/goals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </a>
        </Button>
      </DashboardHeader>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("goals.progressTitle")}</CardTitle>
            <CardDescription>
              {daysLeft !== null
                ? daysLeft > 0
                  ? `${daysLeft} ${t("goals.daysLeft")}`
                  : t("goals.targetDatePassed")
                : t("goals.noTargetDate")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t("goals.progress")}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t("goals.currentAmount")}</p>
                <p className="text-2xl font-bold">${goal.current_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("goals.targetAmount")}</p>
                <p className="text-2xl font-bold">${goal.target_amount.toLocaleString()}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("goals.amountRemaining")}</p>
              <p className="text-xl font-medium">${(goal.target_amount - goal.current_amount).toLocaleString()}</p>
            </div>
            {goal.target_date && (
              <div>
                <p className="text-sm text-muted-foreground">{t("goals.targetDate")}</p>
                <p className="text-xl font-medium">{new Date(goal.target_date).toLocaleDateString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("goals.detailsTitle")}</CardTitle>
            <CardDescription>{t("goals.detailsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <Alert variant={message.type === "error" ? "destructive" : "default"}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">{t("common.name")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-amount">{t("goals.targetAmount")}</Label>
              <Input
                id="target-amount"
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(Number.parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-amount">{t("goals.currentAmount")}</Label>
              <Input
                id="current-amount"
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(Number.parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-date">{t("goals.targetDate")}</Label>
              <Input id="target-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="destructive" onClick={handleDeleteGoal}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t("actions.deleteGoal")}
            </Button>
            <Button onClick={handleUpdateGoal} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? t("common.loading") : t("actions.saveChanges")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

