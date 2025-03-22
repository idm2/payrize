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
      <div className="bg-card/90 backdrop-blur-sm p-3 rounded-md shadow-sm border border-border">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
        {payload.length > 1 && (
          <p className="text-green-500 font-medium mt-1">
            Savings: {formatCurrency(payload[0].value - payload[1].value)}
          </p>
        )}
      </div>
    )
  }
  return null
}

export function SavingsLineGraph() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [data, setData] = useState<any[]>([])

  // Load expenses and listen for updates
  useEffect(() => {
    const loadExpenses = () => {
      try {
        const savedExpenses = localStorage.getItem("expenses")
        if (savedExpenses) {
          const parsedExpenses = JSON.parse(savedExpenses)
          console.log("Loaded expenses in SavingsLineGraph:", parsedExpenses)
          setExpenses(parsedExpenses)
          
          // Process expenses with savings plans
          const expensesWithSavings = parsedExpenses.filter((expense: Expense) => 
            expense.selectedAlternative || 
            (expense.targetAmount !== undefined && expense.targetAmount < expense.amount)
          )
          
          // Transform data for the chart
          const chartData = expensesWithSavings.map((expense: Expense) => {
            const savedAmount = expense.selectedAlternative 
              ? expense.selectedAlternative.price 
              : (expense.targetAmount !== undefined ? expense.targetAmount : expense.amount)
            
            return {
              name: expense.name,
              "Current Expense": expense.amount,
              "Saved Expense": savedAmount,
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
        console.log("Storage event triggered for expenses in SavingsLineGraph")
        loadExpenses()
      }
    }
    
    const handleCustomStorageChange = () => {
      console.log("Custom expensesUpdated event triggered in SavingsLineGraph")
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
      <CardHeader className="p-4 sm:p-6">
        <CardTitle>Expense Savings Comparison</CardTitle>
        <CardDescription>Compare your current expenses with your savings plan</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        {data.length > 0 ? (
          <div className="h-[300px] sm:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                barSize={window?.innerWidth < 640 ? 15 : 20}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={70} 
                  tick={{ fontSize: 10 }}
                  interval={0}
                  tickMargin={10}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  width={80}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="Current Expense" fill="#9333EA" name="Current Expense" />
                <Bar dataKey="Saved Expense" fill="#10B981" name="Saved Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] sm:h-[400px] text-muted-foreground p-4 text-center">
            <p>No savings plans added yet. Add alternatives or reduce expenses to see comparison.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 