"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { formatCurrency, getCategoryColors } from "@/lib/utils"

interface ExpenseCategoriesChartProps {
  data: {
    name: string
    value: number
  }[]
}

// Define the type for the label props
interface LabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  name: string
}

export function ExpenseCategoriesChart({ data }: ExpenseCategoriesChartProps) {
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})
  
  // Load category colors from localStorage
  useEffect(() => {
    setCategoryColors(getCategoryColors())
  }, [])
  
  const totalValue = data.reduce((sum, item) => sum + item.value, 0)

  // Get color for a category, use stored color or fallback to percentage-based color
  const getCategoryColor = (category: string, percentage: number) => {
    // If we have a stored color for this category, use it
    if (categoryColors[category]) {
      return categoryColors[category]
    }
    
    // Otherwise, fall back to percentage-based coloring
    if (percentage <= 33) return "#9333EA" // Purple for low percentage
    if (percentage <= 66) return "#FF8B6B" // Peach for medium percentage
    return "#10B981" // Green for high percentage
  }

  const RADIAN = Math.PI / 180
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: LabelProps) => {
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
        className="font-medium text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 30, right: 20, bottom: 40, left: 20 }}>
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
          {data.map((entry) => {
            const percentage = (entry.value / totalValue) * 100
            return (
              <Cell 
                key={entry.name} 
                fill={getCategoryColor(entry.name, percentage)} 
                stroke="none" 
              />
            )
          })}
        </Pie>
        <Tooltip
          formatter={(value) => formatCurrency(value as number)}
          contentStyle={{ 
            backgroundColor: "var(--background)", 
            borderColor: "var(--border)",
            borderRadius: "0.375rem",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            padding: "0.75rem",
            fontWeight: 500
          }}
          itemStyle={{ color: "var(--foreground)" }}
          wrapperStyle={{ outline: "none" }}
        />
        <Legend
          formatter={(value, entry: any) => {
            const item = data.find((d) => d.name === value)
            const percentage = item ? (item.value / totalValue) * 100 : 0
            return <span style={{ color: getCategoryColor(value as string, percentage) }}>{value}</span>
          }}
          verticalAlign="bottom"
          height={36}
          wrapperStyle={{ paddingTop: "25px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

