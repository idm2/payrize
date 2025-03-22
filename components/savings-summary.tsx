import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Coins } from "lucide-react"
import type { Expense } from "@/lib/utils"

export function SavingsSummary() {
  const [monthlySavings, setMonthlySavings] = useState(0)
  const [annualSavings, setAnnualSavings] = useState(0)

  useEffect(() => {
    // Function to calculate total savings
    const calculateTotalSavings = () => {
      try {
        const savedExpenses = localStorage.getItem("expenses")
        if (!savedExpenses) return 0

        const expenses = JSON.parse(savedExpenses) as Expense[]
        
        // Calculate total savings from all expenses with either selectedAlternative or targetAmount
        const totalMonthlySavings = expenses.reduce((total, expense) => {
          // If there's a selected alternative, use its savings
          if (expense.selectedAlternative) {
            return total + expense.selectedAlternative.savings
          } 
          // If there's a target amount that's less than the original amount
          else if (expense.targetAmount !== undefined && expense.targetAmount < expense.amount) {
            return total + (expense.amount - expense.targetAmount)
          }
          return total
        }, 0)

        setMonthlySavings(totalMonthlySavings)
        setAnnualSavings(totalMonthlySavings * 12)
      } catch (error) {
        console.error("Error calculating savings:", error)
      }
    }

    // Calculate initial savings
    calculateTotalSavings()

    // Listen for updates to expenses
    const handleExpensesUpdated = () => {
      calculateTotalSavings()
    }

    window.addEventListener('expensesUpdated', handleExpensesUpdated)
    
    return () => {
      window.removeEventListener('expensesUpdated', handleExpensesUpdated)
    }
  }, [])

  return (
    <Card className="bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/50">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
          <div className="flex items-center">
            <Coins className="h-8 w-8 text-green-600 dark:text-green-400 mr-3 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">Total Savings</h2>
              <p className="text-sm text-green-600 dark:text-green-400">Based on your current savings plan</p>
            </div>
          </div>
          <div className="text-left sm:text-right mt-2 sm:mt-0">
            <div className="flex flex-col sm:items-end">
              <div className="flex items-center">
                <span className="text-sm font-medium text-green-700 dark:text-green-300 mr-2">Monthly:</span>
                <span className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(monthlySavings)}</span>
              </div>
              <div className="flex items-center mt-1">
                <span className="text-sm font-medium text-green-700 dark:text-green-300 mr-2">Annually:</span>
                <span className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(annualSavings)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 