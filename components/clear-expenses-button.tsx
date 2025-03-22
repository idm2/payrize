"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export function ClearExpensesButton() {
  const { toast } = useToast()

  const handleClearExpenses = () => {
    try {
      // Clear expenses from localStorage
      localStorage.setItem("expenses", "[]")
      
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('expensesUpdated'))
      
      toast({
        title: "Success",
        description: "All expenses have been cleared from the system.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error clearing expenses:", error)
      toast({
        title: "Error",
        description: "There was an error clearing expenses. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Button 
      variant="destructive" 
      onClick={handleClearExpenses}
      className="flex items-center gap-2"
    >
      <Trash2 className="h-4 w-4" />
      Clear All Expenses
    </Button>
  )
} 