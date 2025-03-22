import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, Plus, Check } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useState, useEffect, useCallback } from "react"
import type { AlternativeProduct, Expense } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface AlternativesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: {
    id: string
    name: string
    currentAmount: number
  }
  alternatives: AlternativeProduct[]
}

export function AlternativesDialog({ open, onOpenChange, expense, alternatives }: AlternativesDialogProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string | null>(null)
  const [forceUpdate, setForceUpdate] = useState(0)

  // Load expenses from localStorage
  const loadExpenses = useCallback(() => {
    try {
      const savedExpenses = localStorage.getItem("expenses")
      if (savedExpenses) {
        const parsedExpenses = JSON.parse(savedExpenses)
        return parsedExpenses
      }
    } catch (error) {
      console.error("Error loading expenses:", error)
    }
    return []
  }, [])

  // Initialize state when dialog opens or when forceUpdate changes
  useEffect(() => {
    if (!open) return // Only run when dialog is open
    
    const parsedExpenses = loadExpenses()
    setExpenses(parsedExpenses)
    
    // Find the current expense and check if it has a selected alternative
    const currentExpense = parsedExpenses.find((e: Expense) => e.id === expense.id)
    
    if (currentExpense?.selectedAlternative?.id) {
      setSelectedAlternativeId(currentExpense.selectedAlternative.id)
    } else {
      setSelectedAlternativeId(null)
    }
  }, [expense.id, open, loadExpenses, forceUpdate])

  // Function to add an alternative to the savings plan
  const addToSavingsPlan = (alternative: AlternativeProduct) => {
    try {
      // Calculate savings
      const savings = expense.currentAmount - alternative.price
      
      // Check if this alternative is already selected
      const isCurrentlySelected = selectedAlternativeId === alternative.id
      
      // New selected ID (null if toggling off, or the alternative ID if selecting)
      const newSelectedId = isCurrentlySelected ? null : alternative.id
      
      // Get latest expenses to ensure we're working with the most current data
      const currentExpenses = loadExpenses()
      
      // Update expenses
      const updatedExpenses = currentExpenses.map((e: Expense) => {
        if (e.id === expense.id) {
          // Create the updated expense object
          const updatedExpense = { 
            ...e, 
            selectedAlternative: isCurrentlySelected 
              ? undefined 
              : {
                  id: alternative.id,
                  name: alternative.name,
                  price: alternative.price,
                  savings: savings,
                  source: alternative.source
                },
            targetAmount: isCurrentlySelected 
              ? undefined 
              : alternative.price,
            // Ensure willingness is set to at least "Possible" when an alternative is selected
            willingness: isCurrentlySelected 
              ? e.willingness 
              : (e.willingness === "Not Willing" ? "Possible" : e.willingness)
          };
          
          console.log("Updated expense:", updatedExpense);
          return updatedExpense;
        }
        return e;
      });
      
      // Save to localStorage
      localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('expensesUpdated'));
      
      // Update state
      setSelectedAlternativeId(newSelectedId);
      setExpenses(updatedExpenses);
      
      // Force a refresh to ensure UI updates correctly
      setForceUpdate(prev => prev + 1);
      
      // If we're adding a new alternative (not toggling off), close the modal
      if (!isCurrentlySelected) {
        // Close the modal after a short delay to allow the user to see the selection
        setTimeout(() => {
          onOpenChange(false);
        }, 300);
      }
    } catch (error) {
      console.error("Error adding alternative to savings plan:", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alternatives for {expense.name}</DialogTitle>
          <DialogDescription>Current expense: {formatCurrency(expense.currentAmount)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {alternatives.map((alt) => {
            // Check if this specific alternative is selected by comparing IDs
            const isSelected = selectedAlternativeId === alt.id
            
            return (
              <div 
                key={alt.id} 
                className={cn(
                  "grid gap-2 p-4 rounded-lg border",
                  isSelected 
                    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" 
                    : "bg-white dark:bg-card"
                )}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{alt.name}</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={alt.url} target="_blank" rel="noopener noreferrer">
                        View <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{alt.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <span className="text-sm font-medium">{formatCurrency(alt.price)}</span>
                    <span className="text-sm text-green-600 ml-2">
                      Save {formatCurrency(expense.currentAmount - alt.price)}/month
                    </span>
                    {alt.source && (
                      <div className="flex items-center mt-1">
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                          Data via {alt.source}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          *Prices may vary
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {isSelected ? (
                    <Button 
                      variant="outline"
                      className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                      size="sm"
                      onClick={() => addToSavingsPlan(alt)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      <span className="text-xs">Added</span>
                    </Button>
                  ) : (
                    <Button 
                      variant="gradient"
                      size="sm"
                      onClick={() => addToSavingsPlan(alt)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      <span className="text-xs">Add to Plan</span>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

