"use client"

import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import { TrackerMonthTabs } from "@/components/tracker-month-tabs"
import { SavingsAwards } from "@/components/savings-awards"

interface SavingsGoal {
  id: number
  name: string
  amount: number
  completed: boolean
}

interface MonthlyGoals {
  [key: string]: SavingsGoal[]
}

export default function TrackerPage() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoals>({})

  // Sample savings goals template
  const defaultGoals = [
    { id: 1, name: "Netflix Subscription", amount: 15.99, completed: false },
    { id: 2, name: "Web Hosting", amount: 29.99, completed: false },
    { id: 3, name: "Grocery Shopping", amount: 80.0, completed: false },
    { id: 4, name: "Dining Out", amount: 50.0, completed: false },
    { id: 5, name: "Coffee Shops", amount: 25.0, completed: false },
  ]

  // Initialize goals for a new month
  const initializeMonthGoals = (date: Date) => {
    const monthKey = date.toISOString().slice(0, 7) // YYYY-MM format
    if (!monthlyGoals[monthKey]) {
      setMonthlyGoals((prev) => ({
        ...prev,
        [monthKey]: defaultGoals.map((goal) => ({ ...goal, completed: false })),
      }))
    }
  }

  useEffect(() => {
    initializeMonthGoals(selectedMonth)
  }, [selectedMonth]) // Removed monthlyGoals from dependencies

  const toggleGoalCompletion = (id: number) => {
    const monthKey = selectedMonth.toISOString().slice(0, 7)
    setMonthlyGoals((prev) => ({
      ...prev,
      [monthKey]: prev[monthKey].map((goal) => (goal.id === id ? { ...goal, completed: !goal.completed } : goal)),
    }))
  }

  const currentMonthKey = selectedMonth.toISOString().slice(0, 7)
  const currentGoals = monthlyGoals[currentMonthKey] || []
  const totalSavingsGoal = currentGoals.reduce((sum, goal) => sum + goal.amount, 0)
  const totalSaved = currentGoals.filter((goal) => goal.completed).reduce((sum, goal) => sum + goal.amount, 0)
  const savingsPercentage = Math.round((totalSaved / totalSavingsGoal) * 100) || 0

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
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-green-500"
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
                {currentGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`goal-${goal.id}`}
                        checked={goal.completed}
                        onCheckedChange={() => toggleGoalCompletion(goal.id)}
                      />
                      <Label
                        htmlFor={`goal-${goal.id}`}
                        className={goal.completed ? "line-through text-muted-foreground" : ""}
                      >
                        {goal.name}
                      </Label>
                    </div>
                    <span className={`text-sm font-medium ${goal.completed ? "text-green-500" : ""}`}>
                      {formatCurrency(goal.amount)}
                    </span>
                  </div>
                ))}
              </div>

              <SavingsAwards completionPercentage={savingsPercentage} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

