type Goal = {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  createdAt: string
}

type GoalInsert = Omit<Goal, "id" | "createdAt"> & { createdAt?: string }

// Fetch all goals for a user
export async function fetchGoals(userId: string) {
  void userId
  const res = await fetch("/api/data/goals", { method: "GET" })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || "Failed to fetch goals")
  return (data?.goals as Goal[]) || []
}

// Fetch a single goal by ID
export async function fetchGoalById(id: string) {
  throw new Error(`Not implemented: fetchGoalById(${id})`)
}

// Create a new goal
export async function createGoal(goal: GoalInsert) {
  throw new Error(`Not implemented: createGoal(${goal.name})`)
}

// Update a goal
export async function updateGoal(id: string, updates: Partial<Goal>) {
  throw new Error(`Not implemented: updateGoal(${id})`)
}

// Delete a goal
export async function deleteGoal(id: string) {
  throw new Error(`Not implemented: deleteGoal(${id})`)
}

