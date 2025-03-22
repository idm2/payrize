"use client"

import { Medal, Award, Star } from "lucide-react"

interface SavingsAwardsProps {
  completionPercentage: number
}

export function SavingsAwards({ completionPercentage }: SavingsAwardsProps) {
  const getAward = () => {
    if (completionPercentage === 100) {
      return {
        icon: Star,
        title: "The Best!",
        description: "Congratulations! You've achieved all your savings goals.",
        color: "text-yellow-500",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        iconBg: "bg-gradient-to-r from-yellow-400 to-yellow-600",
      }
    } else if (completionPercentage >= 50) {
      return {
        icon: Medal,
        title: "Almost There!",
        description: "Great progress! You're more than halfway to your goals.",
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        iconBg: "bg-gradient-to-r from-gray-300 to-gray-500",
      }
    } else {
      return {
        icon: Award,
        title: "Keep Going!",
        description: "Every small step counts towards your savings goals.",
        color: "text-orange-700",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        iconBg: "bg-gradient-to-r from-orange-600 to-yellow-700",
      }
    }
  }

  const award = getAward()
  const Icon = award.icon

  return (
    <div className={`mt-6 p-4 border rounded-lg ${award.bgColor} ${award.borderColor}`}>
      <div className="flex items-center gap-3">
        <div className={`${award.iconBg} p-2 rounded-full text-white`}>
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <h4 className={`font-semibold ${award.color}`}>{award.title}</h4>
          <p className="text-sm text-muted-foreground">{award.description}</p>
        </div>
      </div>
    </div>
  )
}

