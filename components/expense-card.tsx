import { ExternalLink, PencilIcon, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency, type Expense, getCategoryColor } from "@/lib/utils"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"

interface ExpenseCardProps {
  expense: Expense
  onEdit: () => void
  onDelete: () => void
  setShowAlternatives?: (show: boolean) => void
}

export function ExpenseCard({ expense, onEdit, onDelete, setShowAlternatives }: ExpenseCardProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Get category color
  const categoryColor = getCategoryColor(expense.category);
  
  const refreshAlternatives = async (expense: Expense, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Prevent opening the dialog
    
    try {
      // Show loading state
      setLoading(true);
      setErrorMessage("");
      
      // Call the API to fetch new alternatives
      const response = await fetch("/api/alternatives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expense }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch alternatives");
      }
      
      const newAlternatives = await response.json();
      
      if (newAlternatives && newAlternatives.length > 0) {
        // Get current expenses from localStorage
        const savedExpenses = localStorage.getItem("expenses");
        if (!savedExpenses) throw new Error("No expenses found");
        
        const expenses = JSON.parse(savedExpenses) as Expense[];
        
        // Update the expense with new alternatives
        const updatedExpenses = expenses.map((e) => {
          if (e.id === expense.id) {
            return {
              ...e,
              alternatives: newAlternatives,
            };
          }
          return e;
        });
        
        // Save to localStorage
        localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
        
        // Trigger refresh
        window.dispatchEvent(new Event('expensesUpdated'));
        
        // Show success toast
        toast({
          title: "Alternatives Refreshed",
          description: `Found ${newAlternatives.length} alternatives for ${expense.name}`,
        });
      } else {
        // Show warning if no alternatives found
        setErrorMessage("No alternatives found");
        toast({
          title: "No new alternatives found",
          description: "Try again later or modify your expense description",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error refreshing alternatives:", error);
      setErrorMessage("Error fetching alternatives");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh alternatives",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{expense.name}</h3>
          <div className="flex items-center space-x-2">
            <div 
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: categoryColor ? `${categoryColor}20` : 'var(--muted)',
                color: categoryColor || 'var(--muted-foreground)',
                border: categoryColor ? `1px solid ${categoryColor}40` : undefined
              }}
            >
              {expense.category}
            </div>
            <span className="font-semibold">{formatCurrency(expense.amount)}</span>
          </div>
        </div>
        
        {/* Display more information */}
        <div className="mt-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>{expense.frequency}</span>
            {expense.description && <span>{expense.description}</span>}
          </div>
        </div>
  
        {/* Display current state with action buttons */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            {expense.alternatives && expense.alternatives.length > 0 ? (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAlternatives && setShowAlternatives(true)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Compare Options
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => refreshAlternatives(expense, e)}
                  disabled={loading}
                  className="flex items-center"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Update
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground flex items-center">
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    {errorMessage ? (
                      <span className="text-red-500 flex items-center">
                        <span className="mr-2">{errorMessage}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => refreshAlternatives(expense, e)}
                          className="h-8 w-8 p-0"
                        >
                          <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          <span className="sr-only">Retry</span>
                        </Button>
                      </span>
                    ) : (
                      <span>No alternatives found</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => refreshAlternatives(expense, e)}
                      className="h-8 w-8 p-0 ml-2"
                    >
                      <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      <span className="sr-only">Refresh alternatives</span>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Remove the icon-only refresh button since we now have a full button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-8 w-8 p-0"
            >
              <PencilIcon className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 