"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, Expense } from "@/lib/utils"

// Define the type for trend data
interface TrendDataPoint {
  month: string
  expenses: number
  savings: number
  projected?: boolean
}

// Generate data based on actual expenses and projected savings
const generateTrendData = (expenses: Expense[], savingsGoals: any[]): TrendDataPoint[] => {
  if (!expenses.length) return []

  // Get the last 6 months of data
  const today = new Date()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(today.getMonth() - 5)
  
  // Create a map of months
  const monthsMap: Record<string, { expenses: number, savings: number }> = {}
  
  // Initialize the months map with the last 6 months
  for (let i = 0; i < 6; i++) {
    const date = new Date(sixMonthsAgo)
    date.setMonth(sixMonthsAgo.getMonth() + i)
    const monthKey = date.toISOString().substring(0, 7) // YYYY-MM format
    monthsMap[monthKey] = { expenses: 0, savings: 0 }
  }
  
  // Sum expenses by month
  expenses.forEach(expense => {
    // Extract date from expense - assuming it's stored in a format that can be parsed
    // If expense doesn't have a date field, we'll use the current date
    let expenseDate: Date
    try {
      // Try to use the id as a timestamp if date is not available
      expenseDate = new Date(parseInt(expense.id))
      // If the date is invalid, use current date
      if (isNaN(expenseDate.getTime())) {
        expenseDate = new Date()
      }
    } catch {
      expenseDate = new Date()
    }
    
    const monthKey = expenseDate.toISOString().substring(0, 7)
    
    if (monthsMap[monthKey]) {
      monthsMap[monthKey].expenses += expense.amount
    }
  })
  
  // Calculate savings based on goals
  let totalSavingsGoal = 0
  if (savingsGoals && savingsGoals.length) {
    totalSavingsGoal = savingsGoals.reduce((sum, goal) => sum + (goal.amount || 0), 0)
  }
  
  // Convert to array and add projected data for future months
  const data: TrendDataPoint[] = Object.entries(monthsMap).map(([monthKey, values]) => {
    const date = new Date(monthKey + "-01")
    return {
      month: date.toLocaleString("default", { month: "short" }),
      expenses: values.expenses,
      savings: totalSavingsGoal / 6, // Distribute savings goal evenly across 6 months
    }
  })
  
  // Add 6 more months of projected data
  const lastMonthExpenses = data[data.length - 1]?.expenses || 0
  const monthlyReduction = 0.03 // Assume 3% monthly reduction in expenses
  
  for (let i = 0; i < 6; i++) {
    const date = new Date(today)
    date.setMonth(today.getMonth() + i + 1)
    const projectedExpenses = lastMonthExpenses * Math.pow(1 - monthlyReduction, i + 1)
    
    data.push({
      month: date.toLocaleString("default", { month: "short" }),
      expenses: projectedExpenses,
      savings: totalSavingsGoal / 6,
      projected: true
    })
  }
  
  return data
}

export function ExpenseTrendGraph() {
  const [data, setData] = useState<TrendDataPoint[]>([])
  
  useEffect(() => {
    // Load expenses from localStorage
    const savedExpenses = localStorage.getItem("expenses")
    const expenses = savedExpenses ? JSON.parse(savedExpenses) as Expense[] : []
    
    // Load savings goals from localStorage
    const savedGoals = localStorage.getItem("savingsGoals")
    const savingsGoals = savedGoals ? JSON.parse(savedGoals) : []
    
    // Generate trend data
    const trendData = generateTrendData(expenses, savingsGoals)
    setData(trendData)
  }, [])

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Expense Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value) => formatCurrency(value as number)} 
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#8884d8" 
                name="Expenses" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="savings" 
                stroke="#82ca9d" 
                name="Savings Goal" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

