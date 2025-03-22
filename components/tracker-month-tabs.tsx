"use client"

import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface MonthTabsProps {
  selectedDate: Date
  onChange: (date: Date) => void
}

export function TrackerMonthTabs({ selectedDate, onChange }: MonthTabsProps) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  // Get the current date for comparison
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Get the selected month and year
  const selectedYear = selectedDate.getFullYear()
  const selectedMonth = selectedDate.getMonth()

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(selectedYear, monthIndex, 1)
    onChange(newDate)
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {months.map((month, index) => {
        // A month is selected if it matches both the month index and the year
        const isSelected = index === selectedMonth && selectedYear === currentYear

        return (
          <button
            key={month}
            onClick={() => handleMonthSelect(index)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-lg border transition-all",
              "hover:border-accent hover:bg-accent/50",
              isSelected
                ? "bg-accent border-accent"
                : "bg-card border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Calendar className={cn("h-5 w-5 mb-2", isSelected ? "text-accent-foreground" : "text-muted-foreground")} />
            <span className="text-sm font-medium">{month}</span>
          </button>
        )
      })}
    </div>
  )
}

