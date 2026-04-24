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

// Fetch all goals for a user
export async function fetchGoals(userId: string) {
  void userId
  try {
    const res = await fetch("/api/data/goals", { method: "GET" })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("fetchGoals failed:", data?.error)
      return []
    }
    return (data?.goals as Goal[]) || []
  } catch (e) {
    console.warn("fetchGoals error:", e)
    return []
  }
}

// Fetch a single goal by ID
export async function fetchGoalById(id: string): Promise<Goal | null> {
  console.warn(`Not implemented: fetchGoalById(${id})`)
  try {
    const res = await fetch(`/api/data/goals/${id}`, { method: "GET" })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("fetchGoalById failed:", data?.error)
      return null
    }
    return data?.goal as Goal || null
  } catch (e) {
    console.warn("fetchGoalById error:", e)
    return null
  }
}

// Create a new goal
export async function createGoal(goal: GoalInsert) {
  console.warn(`Not implemented: createGoal(${goal.name})`)
  return null
}

// Update a goal
export async function updateGoal(id: string, updates: Partial<Goal>) {
  console.warn(`Not implemented: updateGoal(${id})`)
  return null
}

// Delete a goal
export async function deleteGoal(id: string) {
  console.warn(`Not implemented: deleteGoal(${id})`)
  return null
}

