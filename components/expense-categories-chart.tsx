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
  
  // Fallback colors if no category color is defined
  const DISTINCT_COLORS = [
    "#9333EA", // Purple
    "#FF8B6B", // Peach
    "#10B981", // Green
    "#3B82F6", // Blue
    "#F59E0B", // Amber
    "#EC4899", // Pink
    "#6366F1", // Indigo
    "#14B8A6", // Teal
    "#8B5CF6", // Violet
    "#EF4444", // Red
    "#06B6D4", // Cyan
    "#84CC16", // Lime
    "#F97316", // Orange
    "#A855F7", // Purple-500
    "#D946EF", // Fuchsia
  ]

  // Get color for a category, use stored color or fallback to distinct colors
  const getCategoryColor = (category: string, index: number) => {
    return categoryColors[category] || DISTINCT_COLORS[index % DISTINCT_COLORS.length]
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
    <ResponsiveContainer width="100%" height={400}>
      <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={150}
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
          formatter={(value, entry: any) => (
            <span style={{ color: getCategoryColor(value as string, entry.index) }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

