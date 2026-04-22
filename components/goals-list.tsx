"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Plus, Pencil, Trash2 } from "lucide-react"
import type { Database } from "@/types/supabase"

type Goal = Database["public"]["Tables"]["goals"]["Row"]

interface GoalsListProps {
  className?: string
  goals: Goal[]
}

export function GoalsList({ className, goals = [] }: GoalsListProps) {
  const { user } = useAuth()
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    current_amount: 0,
  })

  const handleAddGoal = async () => {
    if (!user || !newGoal.name || !newGoal.target_amount) {
      return
    }

    setIsLoading(true)

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
      console.error("Error adding goal:", error)
    } finally {
      setIsLoading(false)
      setIsAddGoalOpen(false)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) {
      return
    }

    try {
      const { error } = await supabase.from("goals").delete().eq("id", id)

      if (error) throw error

      // Refresh the page to update the goals list
      window.location.reload()
    } catch (error) {
      console.error("Error deleting goal:", error)
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Financial Goals</CardTitle>
          <CardDescription>Track your investment goals</CardDescription>
        </div>
        <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Goal</DialogTitle>
              <DialogDescription>Set a new financial goal to track your progress.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="goal-name" className="text-right">
                  Name
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
                  Target Amount
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
                  Current Amount
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
                  Target Date
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
                Cancel
              </Button>
              <Button onClick={handleAddGoal} disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Goal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No goals found. Add your first goal to get started.
            </div>
          ) : (
            goals.map((goal) => {
              const progress = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{goal.name}</h3>
                      {goal.target_date && (
                        <p className="text-xs text-muted-foreground">
                          Target: {new Date(goal.target_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/goals/${goal.id}`}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteGoal(goal.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-sm">
                    <span>${goal.current_amount.toLocaleString()}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                    <span>${goal.target_amount.toLocaleString()}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

