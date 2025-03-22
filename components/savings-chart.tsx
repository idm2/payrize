"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { formatCurrency, getCategoryColors } from "@/lib/utils"

interface SavingsChartProps {
  data: {
    name: string;
    value: number;
  }[]
}

export function SavingsChart({ data }: SavingsChartProps) {
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})
  
  // Default colors as fallback with proper typing
  const FALLBACK_COLORS: Record<string, string> = {
    Entertainment: "#9333EA", // Purple
    Business: "#FF8B6B", // Dark Peach
    Food: "#05C3B6", // Turquoise
    Essentials: "#3B82F6", // Blue
    Insurance: "#F97316", // Orange
    Uncategorized: "#6B7280", // Gray
  }
  
  // Load category colors from localStorage
  useEffect(() => {
    setCategoryColors(getCategoryColors())
  }, [])
  
  // Get color for a category, use stored color or fallback
  const getCategoryColor = (category: string): string => {
    return categoryColors[category] || FALLBACK_COLORS[category] || "#8884d8"
  }

  // Custom label renderer
  const RADIAN = Math.PI / 180
  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, name, percent } = props
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
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="h-[300px] w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={renderCustomLabel}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={getCategoryColor(entry.name)} />
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
          <Legend verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

