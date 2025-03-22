"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { formatCurrency, getCategoryColors, type Expense } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/90 backdrop-blur-sm p-3 rounded-md shadow-sm border border-border">
        <p className="font-medium">{payload[0].name}</p>
        <p style={{ color: payload[0].color }}>
          Annual Savings: {formatCurrency(payload[0].value * 12)}
        </p>
        <p style={{ color: payload[0].color }}>
          Monthly Savings: {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

export function SavingsPieChart() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [data, setData] = useState<any[]>([])
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})

  // Load expenses and listen for updates
  useEffect(() => {
    // Load category colors
    setCategoryColors(getCategoryColors())
    
    const loadExpenses = () => {
      try {
        const savedExpenses = localStorage.getItem("expenses")
        if (savedExpenses) {
          const parsedExpenses = JSON.parse(savedExpenses)
          console.log("Loaded expenses in SavingsPieChart:", parsedExpenses)
          setExpenses(parsedExpenses)
          
          // Process expenses with savings plans
          const expensesWithSavings = parsedExpenses.filter((expense: Expense) => 
            expense.selectedAlternative || 
            (expense.targetAmount !== undefined && expense.targetAmount < expense.amount)
          )
          
          // Group by category and calculate savings
          const savingsByCategory: Record<string, number> = {}
          
          expensesWithSavings.forEach((expense: Expense) => {
            const category = expense.category || "Uncategorized"
            const currentAmount = expense.amount
            const targetAmount = expense.selectedAlternative 
              ? expense.selectedAlternative.price 
              : (expense.targetAmount !== undefined ? expense.targetAmount : expense.amount)
            
            const savings = currentAmount - targetAmount
            
            if (savings > 0) {
              if (!savingsByCategory[category]) {
                savingsByCategory[category] = 0
              }
              savingsByCategory[category] += savings
            }
          })
          
          // Transform data for the chart
          const chartData = Object.entries(savingsByCategory).map(([category, value]) => ({
            name: category,
            value: value
          }))
          
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
        console.log("Storage event triggered for expenses in SavingsPieChart")
        loadExpenses()
      }
    }
    
    const handleCustomStorageChange = () => {
      console.log("Custom expensesUpdated event triggered in SavingsPieChart")
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

  // Get color for a category, use stored color or fallback
  const getCategoryColor = (category: string, index: number): string => {
    const FALLBACK_COLORS = [
      "#9333EA", // Purple
      "#FF8B6B", // Peach
      "#10B981", // Green
      "#3B82F6", // Blue
      "#F59E0B", // Amber
      "#EC4899", // Pink
      "#6366F1", // Indigo
    ]
    
    return categoryColors[category] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  }

  // Custom label renderer to show values on pie slices
  const RADIAN = Math.PI / 180
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, value } = props
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-medium text-xs"
      >
        {formatCurrency(value)}
      </text>
    )
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle>Savings by Category</CardTitle>
        <CardDescription>Annual savings breakdown by expense category</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        {data.length > 0 ? (
          <div className="h-[300px] sm:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getCategoryColor(entry.name, index)} 
                      stroke="none" 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] sm:h-[400px] text-muted-foreground p-4 text-center">
            <p>No savings plans added yet. Add alternatives or reduce expenses to see savings breakdown.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 