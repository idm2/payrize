"use client"

import { Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency, type Expense, getCategoryColor } from "@/lib/utils"

interface ExpenseListProps {
  expenses: Expense[]
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
}

export function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-muted-foreground">No expenses added yet</p>
        <p className="text-sm text-muted-foreground">Add your first expense to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => {
        // Get color from expense or from category colors
        const categoryColor = expense.color || getCategoryColor(expense.category)
        
        return (
          <div key={expense.id} className="flex items-center justify-between rounded-lg border p-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{expense.name}</h3>
                <span 
                  className="inline-flex rounded-full px-2 py-0.5 text-xs whitespace-nowrap"
                  style={{
                    backgroundColor: categoryColor ? `${categoryColor}20` : 'var(--muted)',
                    color: categoryColor || 'var(--muted-foreground)',
                    border: categoryColor ? `1px solid ${categoryColor}40` : undefined
                  }}
                >
                  {expense.category}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="whitespace-nowrap">{formatCurrency(expense.amount)}</span>
                <span>•</span>
                <span className="whitespace-nowrap">{expense.frequency}</span>
                <span>•</span>
                <span
                  className={`whitespace-nowrap
                  ${expense.willingness === "Not Willing" ? "text-red-500" : ""}
                  ${expense.willingness === "Possible" ? "text-amber-500" : ""}
                  ${expense.willingness === "Very Willing" ? "text-green-500" : ""}
                `}
                >
                  {expense.willingness}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button variant="ghost" size="icon" onClick={() => onEdit(expense)} className="h-8 w-8">
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(expense.id)} className="h-8 w-8">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

