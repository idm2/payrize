"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MonthPickerProps {
  selectedDate: Date
  onChange: (date: Date) => void
}

export function TrackerMonthPicker({ selectedDate, onChange }: MonthPickerProps) {
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const previousMonth = () => {
    const prev = new Date(selectedDate)
    prev.setMonth(prev.getMonth() - 1)
    onChange(prev)
  }

  const nextMonth = () => {
    const next = new Date(selectedDate)
    next.setMonth(next.getMonth() + 1)
    onChange(next)
  }

  return (
    <div className="flex items-center justify-between p-4">
      <Button variant="outline" size="icon" onClick={previousMonth}>
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous month</span>
      </Button>
      <h2 className="text-lg font-medium">{formatMonth(selectedDate)}</h2>
      <Button variant="outline" size="icon" onClick={nextMonth}>
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next month</span>
      </Button>
    </div>
  )
}

