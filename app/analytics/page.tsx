"use client"

import { useEffect, useState, useMemo } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency, type Expense, getCategoryColors, safeLocalStorage } from "@/lib/utils"
import { ExpenseCategoriesChart } from "@/components/analytics/expense-categories-chart"
import { Progress } from "@/components/ui/progress"

// Updated color scheme with more accent colors
const CHART_COLORS = {
  primary: "#9333ea", // Purple
  accent: "#05c3b6", // Aqua
  tertiary: "#ff6b35", // Orange
  quaternary: "#3b82f6", // Blue
  quinary: "#f59e0b", // Amber
}

// Array of colors for bars
const BAR_COLORS = [
  "#9333ea", // Purple
  "#05c3b6", // Aqua
  "#ff6b35", // Orange
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#10b981", // Green
]

export default function AnalyticsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})
  
  useEffect(() => {
    // Load expenses from localStorage safely
    const savedExpenses = safeLocalStorage.getItem("expenses")
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses))
    }
    
    // Load category colors
    setCategoryColors(getCategoryColors())
  }, [])

  // Group expenses by category for pie chart
  const expenseCategories = useMemo(() => {
    const categories: Record<string, number> = {}
    
    expenses.forEach(expense => {
      if (!expense.category) return
      
      if (categories[expense.category]) {
        categories[expense.category] += expense.amount
      } else {
        categories[expense.category] = expense.amount
      }
    })
    
    return Object.entries(categories).map(([name, value]) => ({ name, value }))
  }, [expenses])

  // Generate monthly data (last 6 months)
  const generateMonthlyData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    const currentMonth = new Date().getMonth()
    
    // Create last 6 months in order
    const orderedMonths = []
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12
      orderedMonths.push(months[monthIndex])
    }
    
    // Generate random but consistent data for each month
    // In a real app, this would come from historical data
    const totalExpenseAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const baseAmount = totalExpenseAmount || 1000 // Use actual expenses or default to 1000
    
    return orderedMonths.map((month, index) => {
      // Create somewhat realistic variations
      const variationFactor = 0.8 + (index / 5) * 0.4 // Gradually increases
      const amount = Math.round(baseAmount * variationFactor)
      
      // Calculate savings as a percentage of expenses
      const savingsRate = 0.1 + (index / 20) // Gradually increases from 10% to 35%
      const savingsAmount = Math.round(amount * savingsRate)
      
      return { month, amount, savings: savingsAmount }
    })
  }
  
  const monthlyData = useMemo(generateMonthlyData, [expenses])
  
  // Extract monthly expenses and savings from the generated data
  const monthlyExpenses = monthlyData.map(({ month, amount }) => ({ month, amount }))
  const monthlySavings = monthlyData.map(({ month, savings }) => ({ month, amount: savings }))

  // Get color for savings bar based on value
  const getSavingsBarColor = (value: number, index: number) => {
    const maxSavings = Math.max(...monthlySavings.map(item => item.amount))
    const percentage = (value / maxSavings) * 100
    
    if (percentage > 80) return "#10b981" // Green for high savings
    if (percentage > 50) return "#3b82f6" // Blue for medium savings
    return "#9333ea" // Purple for lower savings
  }

  return (
    <DashboardShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Visualize your financial data</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Tabs defaultValue="expenses">
          <TabsList className="grid w-full grid-cols-4 md:w-auto">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="tracker">Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Expenses</CardTitle>
                  <CardDescription>Your expense trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyExpenses}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke={CHART_COLORS.primary}
                          strokeWidth={2}
                          name="Expenses"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expense Categories</CardTitle>
                  <CardDescription>Breakdown of your expenses by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    {expenseCategories.length > 0 ? (
                      <ExpenseCategoriesChart data={expenseCategories} />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">Add expenses to see category breakdown</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="savings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Savings</CardTitle>
                <CardDescription>Your savings trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySavings}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="amount" name="Savings">
                        {monthlySavings.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={getSavingsBarColor(entry.amount, index)} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="income" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Income Analysis</CardTitle>
                <CardDescription>Breakdown of your income sources</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">Income analytics coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracker" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense Tracking Performance</CardTitle>
                <CardDescription>Compare your actual expenses with projected savings</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <div className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyData}
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
                        name="Current Expenses"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="projectedExpenses"
                        stroke="#82ca9d"
                        name="Projected Expenses"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Savings Goal Progress</CardTitle>
                <CardDescription>Track your progress towards savings goals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {useMemo(() => {
                    // Load savings goals from localStorage
                    const savedGoals = safeLocalStorage.getItem("savingsGoals")
                    const savingsGoals = savedGoals ? JSON.parse(savedGoals) : []
                    
                    if (!savingsGoals.length) {
                      return (
                        <div className="flex items-center justify-center h-[200px]">
                          <p className="text-muted-foreground">No savings goals found</p>
                        </div>
                      )
                    }
                    
                    // Calculate total potential savings
                    const totalPotentialSavings = expenses.reduce((total, expense) => {
                      let savingAmount = 0
                      
                      if (expense.willingness === "Very Willing") {
                        savingAmount = expense.amount * 0.8
                      } else if (expense.willingness === "Possible") {
                        savingAmount = expense.amount * 0.4
                      } else if (expense.willingness === "Not Willing") {
                        savingAmount = expense.amount * 0.1
                      }
                      
                      if (expense.selectedAlternative) {
                        savingAmount = expense.selectedAlternative.savings
                      }
                      
                      return total + savingAmount
                    }, 0)
                    
                    return savingsGoals.map((goal: any, index: number) => {
                      const progress = Math.min(100, (totalPotentialSavings / goal.amount) * 100)
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{goal.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(totalPotentialSavings)} of {formatCurrency(goal.amount)}
                              </p>
                            </div>
                            <p className="text-sm font-medium">{progress.toFixed(0)}%</p>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )
                    })
                  }, [expenses])}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}

