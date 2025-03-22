"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from "recharts"
import { formatCurrency, type Expense } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean
  payload?: any[]
  label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-md shadow-sm border border-gray-100">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function ExpenseLineGraph() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [data, setData] = useState<any[]>([])

  // Load expenses and listen for updates
  useEffect(() => {
    const loadExpenses = () => {
      try {
        const savedExpenses = localStorage.getItem("expenses")
        if (savedExpenses) {
          const parsedExpenses = JSON.parse(savedExpenses)
          console.log("Loaded expenses in ExpenseLineGraph:", parsedExpenses)
          setExpenses(parsedExpenses)
          
          // Transform data for the chart
          const chartData = parsedExpenses.map((expense: Expense) => {
            return {
              name: expense.name,
              "Current Expense": expense.amount,
            }
          })
          
          setData(chartData)
        }
      } catch (error) {
        console.error("Error loading expenses:", error)
      }
    }

    // Load initial data
    loadExpenses()
    
    // Set up event listeners for updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "expenses") {
        console.log("Storage event triggered for expenses in ExpenseLineGraph")
        loadExpenses()
      }
    }
    
    const handleCustomStorageChange = () => {
      console.log("Custom expensesUpdated event triggered in ExpenseLineGraph")
      loadExpenses()
    }
    
    // Listen for storage changes
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("expensesUpdated", handleCustomStorageChange)
    
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("expensesUpdated", handleCustomStorageChange)
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>View your expenses by category</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={70} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Current Expense" fill="#9333EA" name="Current Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <p>No expenses added yet. Add expenses to see the breakdown.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 