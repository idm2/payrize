"use client"

import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { formatCurrency, getProgressGradient, Expense } from "@/lib/utils"
import { TrackerMonthTabs } from "@/components/tracker-month-tabs"
import { SavingsAwards } from "@/components/savings-awards"
import { AnnualProgress } from "@/components/annual-progress"
import { cn } from "@/lib/utils"

interface SavingsGoal {
  id: string
  name: string
  amount: number
  originalAmount: number
  savings: number
}

interface MonthlyProgress {
  [key: string]: Set<string> // Store completed goal IDs for each month
}

export default function TrackerPage() {
  // Initialize with current date, ensuring we're using the current month
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date()
    // Explicitly create a new date with the current year and month
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Force update to current month on mount
  useEffect(() => {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    setSelectedMonth(currentMonth)
  }, [])

  const [monthlyProgress, setMonthlyProgress] = useState<MonthlyProgress>({})
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])

  // Load expenses from localStorage and filter for those with savings
  useEffect(() => {
    try {
      const savedExpenses = localStorage.getItem("expenses")
      if (savedExpenses) {
        const parsedExpenses: Expense[] = JSON.parse(savedExpenses)
        
        // Filter expenses that have either:
        // 1. A selected alternative, or
        // 2. A target amount that's less than the original amount
        const expensesWithSavings = parsedExpenses.filter(expense => 
          expense.selectedAlternative || 
          (expense.targetAmount !== undefined && expense.targetAmount < expense.amount)
        )
        
        // Convert to SavingsGoal format
        const goals = expensesWithSavings.map(expense => ({
          id: expense.id,
          name: expense.name,
          amount: expense.selectedAlternative ? 
            expense.selectedAlternative.price : 
            (expense.targetAmount !== undefined ? expense.targetAmount : expense.amount),
          originalAmount: expense.amount,
          savings: expense.selectedAlternative ? 
            expense.selectedAlternative.savings : 
            (expense.targetAmount !== undefined ? expense.amount - expense.targetAmount : 0)
        }))
        
        setSavingsGoals(goals)
        
        // Load saved progress from localStorage
        const savedProgress = localStorage.getItem("monthlyProgress")
        if (savedProgress) {
          // Convert the saved progress (which has arrays) to Sets
          const parsedProgress = JSON.parse(savedProgress)
          const progressWithSets: MonthlyProgress = {}
          
          Object.keys(parsedProgress).forEach(key => {
            progressWithSets[key] = new Set(parsedProgress[key])
          })
          
          setMonthlyProgress(progressWithSets)
        }
      }
    } catch (error) {
      console.error("Error loading expenses:", error)
    }
  }, [])

  const getMonthKey = (date: Date) => {
    return date.toISOString().slice(0, 7) // Format: "YYYY-MM"
  }

  const isGoalCompleted = (goalId: string) => {
    const monthKey = getMonthKey(selectedMonth)
    return monthlyProgress[monthKey]?.has(goalId) || false
  }

  const toggleGoalCompletion = (goalId: string) => {
    const monthKey = getMonthKey(selectedMonth)
    setMonthlyProgress((prev) => {
      const currentMonth = new Set(prev[monthKey] || [])
      if (currentMonth.has(goalId)) {
        currentMonth.delete(goalId)
      } else {
        currentMonth.add(goalId)
      }
      
      const updatedProgress = {
        ...prev,
        [monthKey]: currentMonth,
      }
      
      // Save to localStorage, but convert Sets to arrays first
      const progressForStorage: Record<string, string[]> = {}
      Object.keys(updatedProgress).forEach(key => {
        progressForStorage[key] = Array.from(updatedProgress[key])
      })
      
      localStorage.setItem("monthlyProgress", JSON.stringify(progressForStorage))
      
      return updatedProgress
    })
  }

  // Calculate totals for the selected month
  const monthKey = getMonthKey(selectedMonth)
  const completedGoals = monthlyProgress[monthKey] || new Set()
  const totalSavingsGoal = savingsGoals.reduce((sum, goal) => sum + goal.savings, 0)
  const totalSaved = savingsGoals
    .filter((goal) => completedGoals.has(goal.id))
    .reduce((sum, goal) => sum + goal.savings, 0)
  const savingsPercentage = totalSavingsGoal > 0 ? 
    Math.round((totalSaved / totalSavingsGoal) * 100) : 0

  // Calculate annual totals
  const calculateAnnualProgress = () => {
    const currentYear = selectedMonth.getFullYear()
    let annualSaved = 0
    let annualGoal = 0

    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(currentYear, month, 1)
      const monthKey = getMonthKey(monthDate)
      const completedGoals = monthlyProgress[monthKey] || new Set()

      annualGoal += totalSavingsGoal // Add monthly goal to annual goal

      savingsGoals.forEach((goal) => {
        if (completedGoals.has(goal.id)) {
          annualSaved += goal.savings
        }
      })
    }

    return { annualSaved, annualGoal }
  }

  const { annualSaved, annualGoal } = calculateAnnualProgress()

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  return (
    <DashboardShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Savings Tracker</h1>
          <p className="text-muted-foreground">Track your monthly savings progress</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Month</CardTitle>
            <CardDescription>Choose a month to track your savings</CardDescription>
          </CardHeader>
          <CardContent>
            <TrackerMonthTabs selectedDate={selectedMonth} onChange={setSelectedMonth} />
            <AnnualProgress totalSaved={annualSaved} totalGoal={annualGoal} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Savings Progress</CardTitle>
            <CardDescription>Track your savings for {formatMonth(selectedMonth)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm font-medium">{savingsPercentage}%</span>
                </div>
                <div className="progress-container">
                  <div
                    className={cn("progress-fill", getProgressGradient(savingsPercentage))}
                    style={{ width: `${savingsPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Saved: {formatCurrency(totalSaved)}</span>
                  <span>Goal: {formatCurrency(totalSavingsGoal)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Savings Goals</h3>
                {savingsGoals.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No savings goals yet</p>
                    <p className="text-sm">Add expenses and select alternatives to track your savings</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savingsGoals.map((goal) => (
                      <div key={goal.id} className="flex items-center justify-between space-x-2">
                        <div className="checkbox-item">
                          <Checkbox
                            id={`goal-${goal.id}`}
                            checked={isGoalCompleted(goal.id)}
                            onCheckedChange={() => toggleGoalCompletion(goal.id)}
                          />
                          <Label
                            htmlFor={`goal-${goal.id}`}
                            className={cn(
                              "checkbox-label ml-2",
                              isGoalCompleted(goal.id) && "line-through text-muted-foreground"
                            )}
                          >
                            {goal.name}
                          </Label>
                        </div>
                        <span className={cn(
                          "text-sm font-medium",
                          isGoalCompleted(goal.id) && "text-green-500"
                        )}>
                          {formatCurrency(goal.savings)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <SavingsAwards completionPercentage={savingsPercentage} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

