"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface SavingsChartProps {
  data: {
    month: string
    amount: number
  }[]
}

export function SavingsChart({ data }: SavingsChartProps) {
  const maxAmount = Math.max(...data.map((d) => d.amount))

  const getBarColor = (amount: number) => {
    const percentage = (amount / maxAmount) * 100
    if (percentage <= 33) return "#9333EA" // Purple for low percentage
    if (percentage <= 66) return "#FF8B6B" // Peach for medium percentage
    return "#10B981" // Green for high percentage
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => formatCurrency(value)} />
        <Tooltip
          formatter={(value) => formatCurrency(value as number)}
          contentStyle={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
          itemStyle={{ color: "var(--foreground)" }}
        />
        <Bar
          dataKey="amount"
          name="Savings"
          radius={[4, 4, 0, 0]}
          fill="#8884d8"
          shape={(props: any) => {
            const { x, y, width, height, value } = props
            const fill = getBarColor(value)
            return <path d={`M${x},${y + height} h${width} v${-height} h${-width} z`} fill={fill} />
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

