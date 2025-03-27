import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ExpenseForm } from "@/components/expense-form"
import { useState } from "react"
import type { Expense } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

interface ExpenseEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense
}

export function ExpenseEditDialog({ open, onOpenChange, expense }: ExpenseEditDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (updatedExpense: Expense) => {
    setLoading(true)
    
    try {
      // Get current expenses from localStorage
      const savedExpenses = localStorage.getItem("expenses")
      if (!savedExpenses) throw new Error("No expenses found")
      
      const expenses = JSON.parse(savedExpenses) as Expense[]
      
      // Find the expense and preserve its alternatives
      const existingExpense = expenses.find(e => e.id === updatedExpense.id)
      const alternatives = existingExpense?.alternatives || []
      const selectedAlternative = existingExpense?.selectedAlternative
      
      // Update the expense while preserving alternatives
      const updatedExpenses = expenses.map(e => {
        if (e.id === updatedExpense.id) {
          return {
            ...updatedExpense,
            alternatives,
            selectedAlternative
          }
        }
        return e
      })
      
      // Save to localStorage
      localStorage.setItem("expenses", JSON.stringify(updatedExpenses))
      
      // Trigger refresh
      window.dispatchEvent(new Event('expensesUpdated'))
      
      // Show success toast
      toast({
        title: "Expense Updated",
        description: `${updatedExpense.name} has been updated.`,
      })
      
      // Close the dialog
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating expense:", error)
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update expense",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px]">
        <DialogTitle>Edit Expense</DialogTitle>
        <ExpenseForm 
          initialData={expense}
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  )
} 