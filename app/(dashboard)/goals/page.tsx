"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Pencil, Trash2, Target } from "lucide-react"
import type { Database } from "@/types/supabase"
import { useI18n } from "@/contexts/i18n-context"

type Goal = Database["public"]["Tables"]["goals"]["Row"]

export default function GoalsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    current_amount: 0,
  })

  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .order("target_date", { ascending: true })

        if (error) throw error

        setGoals(data || [])
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    fetchGoals()
  }, [user])

  const handleAddGoal = async () => {
    if (!user || !newGoal.name || !newGoal.target_amount) {
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        name: newGoal.name,
        target_amount: newGoal.target_amount,
        current_amount: newGoal.current_amount || 0,
        target_date: newGoal.target_date,
      })

      if (error) throw error

      // Refresh the page to show the new goal
      window.location.reload()
    } catch (error) {
    } finally {
      setIsSubmitting(false)
      setIsAddGoalOpen(false)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    if (!confirm(t("goals.confirmDelete"))) {
      return
    }

    try {
      const { error } = await supabase.from("goals").delete().eq("id", id)

      if (error) throw error

      // Update the goals list
      setGoals(goals.filter((goal) => goal.id !== id))
    } catch (error) {
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("goals.title")} text={t("goals.description")}>
        <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("actions.addGoal")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("goals.addDialogTitle")}</DialogTitle>
              <DialogDescription>{t("goals.addDialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="goal-name" className="text-right">
                  {t("common.name")}
                </Label>
                <Input
                  id="goal-name"
                  value={newGoal.name || ""}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="goal-target" className="text-right">
                  {t("goals.targetAmount")}
                </Label>
                <Input
                  id="goal-target"
                  type="number"
                  value={newGoal.target_amount || ""}
                  onChange={(e) => setNewGoal({ ...newGoal, target_amount: Number.parseFloat(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="goal-current" className="text-right">
                  {t("goals.currentAmount")}
                </Label>
                <Input
                  id="goal-current"
                  type="number"
                  value={newGoal.current_amount || ""}
                  onChange={(e) => setNewGoal({ ...newGoal, current_amount: Number.parseFloat(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="goal-date" className="text-right">
                  {t("goals.targetDate")}
                </Label>
                <Input
                  id="goal-date"
                  type="date"
                  value={newGoal.target_date || ""}
                  onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddGoalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAddGoal} disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : t("actions.addGoal")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardHeader>

      {isLoading ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-2 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {goals.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-3">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">{t("empty.goals")}</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {t("goals.noGoals")}
                </p>
                <Button className="mt-4" onClick={() => setIsAddGoalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("actions.addGoal")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            goals.map((goal) => {
              const currentAmount = goal.current_amount || 0
              const targetAmount = goal.target_amount || 1
              const progress = Math.min(100, Math.round((currentAmount / targetAmount) * 100))
              const daysLeft = goal.target_date
                ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : null

              return (
                <Card key={goal.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{goal.name}</CardTitle>
                    <CardDescription>
                      {daysLeft !== null
                        ? daysLeft > 0
                          ? `${daysLeft} ${t("goals.daysLeft")}`
                          : t("goals.targetDatePassed")
                        : t("goals.noTargetDate")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{t("goals.progress")}</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{t("goals.current")}</p>
                          <p className="text-lg sm:text-xl font-bold">${(goal.current_amount || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{t("goals.target")}</p>
                          <p className="text-lg sm:text-xl font-bold">${(goal.target_amount || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      {goal.target_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">{t("goals.targetDate")}</p>
                          <p className="text-base font-medium">{new Date(goal.target_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col sm:flex-row gap-2 justify-between mt-auto">
                    <Button variant="outline" asChild className="w-full sm:w-auto">
                      <a href={`/goals/${goal.id}`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t("common.edit")}
                      </a>
                    </Button>
                    <Button variant="outline" onClick={() => handleDeleteGoal(goal.id)} className="w-full sm:w-auto">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("common.delete")}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

