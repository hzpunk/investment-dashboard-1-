import { apiFetch } from "@/lib/api-client"

export type Goal = {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  createdAt: string
}

export type GoalInsert = Omit<Goal, "id" | "createdAt"> & { createdAt?: string }

export async function fetchGoals(userId: string) {
  void userId
  const data = await apiFetch<{ goals: Goal[] }>("/api/data/goals")
  return data?.goals || []
}

export async function fetchGoalById(id: string): Promise<Goal | null> {
  const data = await apiFetch<{ goal: Goal }>(`/api/data/goals/${encodeURIComponent(id)}`)
  return data?.goal || null
}

export async function createGoal(goal: GoalInsert) {
  const data = await apiFetch<{ goal: Goal }>("/api/data/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
    }),
  })
  return data?.goal || null
}

export async function updateGoal(id: string, updates: Partial<Goal>) {
  const data = await apiFetch<{ goal: Goal }>(`/api/data/goals/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  return data?.goal || null
}

export async function deleteGoal(id: string) {
  const data = await apiFetch<{ success: boolean }>(`/api/data/goals/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  return data?.success || false
}

