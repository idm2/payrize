import { Award, TrendingUp } from "lucide-react"
import { formatCurrency, getProgressGradient } from "@/lib/utils"

interface AnnualProgressProps {
  totalSaved: number
  totalGoal: number
}

export function AnnualProgress({ totalSaved, totalGoal }: AnnualProgressProps) {
  const completionPercentage = Math.round((totalSaved / totalGoal) * 100) || 0

  const getAwardLevel = () => {
    if (completionPercentage >= 90) return { level: "Gold", color: "text-yellow-500" }
    if (completionPercentage >= 75) return { level: "Silver", color: "text-gray-400" }
    if (completionPercentage >= 50) return { level: "Bronze", color: "text-orange-600" }
    return { level: "Keep Going", color: "text-blue-500" }
  }

  const { level, color } = getAwardLevel()

  return (
    <div className="mt-4 p-4 border rounded-lg bg-card">
      <h3 className="font-semibold mb-2">Annual Progress</h3>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">Overall Completion</span>
        <span className="text-sm font-medium">{completionPercentage}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted mb-4">
        <div
          className={`h-2 rounded-full ${getProgressGradient(completionPercentage)}`}
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Total Saved: {formatCurrency(totalSaved)}</span>
        <span>Annual Goal: {formatCurrency(totalGoal)}</span>
      </div>
      <div className={`flex items-center mt-4 ${color}`}>
        <Award className="mr-2 h-5 w-5" />
        <span className="font-medium">{level} Progress</span>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        <TrendingUp className="inline mr-1 h-4 w-4" />
        Keep up the great work to reach your annual savings goal!
      </p>
    </div>
  )
}

