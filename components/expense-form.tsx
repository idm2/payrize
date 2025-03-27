"use client"

import { useState, useEffect } from "react"
import { Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CategoryCombobox } from "@/components/category-combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Expense } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import type React from "react"
import { getCategoryColor, getActivePlan, syncPlanData } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"

interface ExpenseFormProps {
  onSubmit: (expense: Expense, alternatives: any[]) => void
  onCancel: () => void
  initialData?: Expense | null
}

export function ExpenseForm({ onSubmit, onCancel, initialData }: ExpenseFormProps) {
  const [expense, setExpense] = useState<Expense>(
    initialData || {
      id: crypto.randomUUID(),
      name: "",
      amount: 0,
      category: "",
      frequency: "Monthly",
      description: "",
      willingness: "Possible",
      url: ""
    }
  )
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Get the active plan on mount
  useEffect(() => {
    const activePlan = getActivePlan()
    // You could do something with the active plan here if needed
    // This ensures the form has the latest plan context
  }, [])

  const handleChange = (field: keyof Expense, value: any) => {
    setExpense((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!expense.name) {
      toast({
        title: "Error",
        description: "Please enter a name for the expense",
        variant: "destructive",
      })
      return
    }

    if (!expense.category) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      })
      return
    }

    if (expense.amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive",
      })
      return
    }

    // For Per Unit expenses, ensure quantity is set
    if (expense.frequency === "Per Unit" && (!expense.quantity || expense.quantity <= 0)) {
      toast({
        title: "Error",
        description: "Please enter a quantity greater than 0",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      
      // Get alternatives if this is a new expense
      let alternatives = []
      if (!initialData) {
        try {
          const response = await fetch("/api/alternatives", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              expense: {
                name: expense.name,
                description: expense.description || expense.name,
                category: expense.category,
                amount: expense.amount,
                frequency: expense.frequency,
                quantity: expense.quantity || 1,
              }
            }),
          })
          
          if (!response.ok) {
            console.error("Alternatives API error:", response.status);
            throw new Error(`Failed to fetch alternatives: ${response.status}`);
          }
          
          // API now returns alternatives directly as an array, not nested in an object
          const alternativesData = await response.json();
          
          // Make sure we have a valid array before mapping
          if (Array.isArray(alternativesData)) {
            alternatives = alternativesData.map((alt: any) => ({
              ...alt,
              id: alt.id || crypto.randomUUID(),
              expenseId: expense.id
            }));
          } else {
            console.log("Unexpected alternatives response format:", alternativesData);
            // Use empty array if response format is unexpected
            alternatives = [];
          }
        } catch (alternativesError) {
          console.error("Error fetching alternatives:", alternativesError);
          // Continue with empty alternatives if the API call fails
          alternatives = [];
        }
      }
      
      // Make sure the data is synced with the active plan
      const activePlan = getActivePlan()
      if (activePlan) {
        syncPlanData(activePlan.id)
      }
      
      onSubmit(expense, alternatives)
      
    } catch (error) {
      console.error("Error submitting expense:", error)
      toast({
        title: "Error",
        description: "There was an error submitting your expense",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Calculate the background color for the category label
  const categoryColor = expense.category ? getCategoryColor(expense.category) : "#CBD5E1"

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      <div className="space-y-3">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={expense.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter expense name"
        />
      </div>
      <div className="space-y-3">
        <Label htmlFor="category">Category</Label>
        <CategoryCombobox 
          value={expense.category} 
          onChange={(value) => handleChange("category", value)} 
        />
        {expense.category && (
          <div 
            className="w-full h-2 mt-1 rounded-full" 
            style={{ backgroundColor: categoryColor }}
          />
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              $
            </span>
            <Input
              id="amount"
              type="number"
              value={expense.amount}
              onChange={(e) => handleChange("amount", parseFloat(e.target.value) || 0)}
              className="pl-7"
              step="0.01"
              min="0"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="frequency">Frequency</Label>
          <select
            id="frequency"
            value={expense.frequency}
            onChange={(e) => handleChange("frequency", e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
          >
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Yearly">Yearly</option>
            <option value="Per Unit">Per Unit</option>
          </select>
        </div>
      </div>
      
      {expense.frequency === "Per Unit" && (
        <div className="space-y-3">
          <Label htmlFor="quantity">Quantity per month</Label>
          <p className="text-sm text-muted-foreground mb-2">
            How many units do you purchase per month?
          </p>
          <Input
            id="quantity"
            type="number"
            min="1"
            step="1"
            value={expense.quantity || 1}
            onChange={(e) => handleChange("quantity", parseInt(e.target.value) || 1)}
            required
            placeholder="Enter quantity"
          />
        </div>
      )}
      
      <div className="space-y-3">
        <Label htmlFor="description">Description</Label>
        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-md">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Please provide detailed information about the product or service. 
            The more specific details you include (brand, size, features), 
            the better our AI can find comparable alternatives.
          </p>
        </div>
        <Textarea
          id="description"
          value={expense.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Enter a detailed description for better alternatives"
          className="h-24"
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label htmlFor="willingness">Willingness to Change</Label>
          <select
            id="willingness"
            value={expense.willingness || "Possible"}
            onChange={(e) => handleChange("willingness", e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
          >
            <option value="Not Willing">Not Willing</option>
            <option value="Possible">Possible</option>
            <option value="Very Willing">Very Willing</option>
          </select>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="url">Product URL (optional)</Label>
          <Input
            id="url"
            value={expense.url || ""}
            onChange={(e) => handleChange("url", e.target.value)}
            placeholder="https://"
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" /> Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent border-white rounded-full" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" /> {initialData ? "Update" : "Save"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

