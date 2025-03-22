"use client"

import { useEffect, useState, useMemo } from "react"
import { ArrowUp, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, type Expense } from "@/lib/utils"

export function SavingsCalculator() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  
  // Load expenses from localStorage
  useEffect(() => {
    const savedExpenses = localStorage.getItem("expenses")
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses))
    }
  }, [])
  
  // Calculate potential savings (20% of total expenses)
  const totalExpenses = useMemo(() => 
    expenses.reduce((sum, expense) => sum + expense.amount, 0), 
    [expenses]
  )
  
  const potentialSavings = useMemo(() => Math.round(totalExpenses * 0.2), [totalExpenses])
  const targetPayRise = 500
  const percentageToTarget = Math.min(100, Math.round((potentialSavings / targetPayRise) * 100))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings Calculator</CardTitle>
        <CardDescription>Your potential savings and pay rise target</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Potential Monthly Savings</h3>
              <span className="flex items-center text-sm text-green-500">
                <ArrowUp className="mr-1 h-3 w-3" />
                12% from last month
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{formatCurrency(potentialSavings)}</span>
              <span className="text-sm text-muted-foreground">per month</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Target Pay Rise</h3>
              <span className="flex items-center text-sm text-primary">
                <TrendingUp className="mr-1 h-3 w-3" />
                {percentageToTarget}% achieved
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-green-500 to-purple-500"
                style={{ width: `${percentageToTarget}%` }}
              />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Current</span>
              <span className="text-sm font-medium">{formatCurrency(targetPayRise)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

