"use client"

import { useState } from "react"
import { Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CategoryCombobox } from "@/components/category-combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Expense } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import type React from "react"
import { getCategoryColor } from "@/lib/utils"

interface ExpenseFormProps {
  onSubmit: (expense: Expense, alternatives: any[]) => void
  onCancel: () => void
  initialData?: Expense | null
}

export function ExpenseForm({ onSubmit, onCancel, initialData }: ExpenseFormProps) {
  const [expense, setExpense] = useState<Expense>(
    initialData || {
      id: "",
      name: "",
      category: "",
      amount: 0,
      frequency: "Monthly",
      description: "",
      willingness: "Possible",
      url: "",
    },
  )
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setExpense((prev) => ({
      ...prev,
      [name]: name === "amount" ? Number.parseFloat(value) || 0 : value,
    }))
  }

  const handleCategoryChange = (category: string) => {
    // Get the color for this category if it exists
    const color = getCategoryColor(category)
    
    setExpense((prev) => ({
      ...prev,
      category,
      color: color // Set the color if it exists
    }))
  }

  const handleCategoryColorChange = (category: string, color: string) => {
    // Update the expense color if it's the current category
    if (category === expense.category) {
      setExpense((prev) => ({
        ...prev,
        color
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/alternatives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expense }),
      })

      const contentType = response.headers.get("content-type")
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`)
        }
        onSubmit(expense, data)
      } else {
        const text = await response.text()
        throw new Error(`Unexpected response: ${text}`)
      }
    } catch (error: any) {
      console.error("Error fetching alternatives:", error)
      toast({
        title: "Error",
        description: `Failed to find alternatives: ${error.message}`,
        variant: "destructive",
      })
      onSubmit(expense, [])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="form-group">
          <Label htmlFor="name" className="form-label">
            Expense Name
          </Label>
          <Input
            id="name"
            name="name"
            value={expense.name}
            onChange={handleChange}
            required
            placeholder="Enter expense name"
            className="form-control"
          />
        </div>

        <div className="form-group">
          <Label htmlFor="category" className="form-label">
            Category
          </Label>
          <CategoryCombobox
            value={expense.category}
            onChange={handleCategoryChange}
            onColorChange={handleCategoryColorChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="form-group">
          <Label htmlFor="amount" className="form-label">
            Amount
          </Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            value={expense.amount}
            onChange={handleChange}
            required
            placeholder="Enter amount"
            className="form-control"
          />
        </div>

        <div className="form-group">
          <Label htmlFor="frequency" className="form-label">
            Frequency
          </Label>
          <select
            id="frequency"
            name="frequency"
            value={expense.frequency}
            onChange={handleChange}
            className="form-select rounded-[9px] px-4 py-2 h-11"
          >
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Yearly">Yearly</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <Label htmlFor="description" className="form-label">
          Description
        </Label>
        <p className="text-sm text-foreground/70 mb-2">
          Provide detailed information about your expense to help us find better deals. Include supplier name,
          product/service details, and any specific features that matter to you.
        </p>
        <textarea
          id="description"
          name="description"
          value={expense.description}
          onChange={handleChange}
          rows={3}
          className="form-control min-h-[100px]"
          placeholder="Enter detailed description of your expense"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="form-group">
          <Label htmlFor="willingness" className="form-label">
            Saving Willingness
          </Label>
          <select
            id="willingness"
            name="willingness"
            value={expense.willingness}
            onChange={handleChange}
            className="form-select rounded-[9px] px-4 py-2 h-11"
          >
            <option value="Not Willing">Not Willing</option>
            <option value="Possible">Possible</option>
            <option value="Very Willing">Very Willing</option>
          </select>
        </div>

        <div className="form-group">
          <Label htmlFor="url" className="form-label">
            URL (Optional)
          </Label>
          <Input
            id="url"
            name="url"
            type="url"
            value={expense.url}
            onChange={handleChange}
            placeholder="Enter supplier/product URL"
            className="form-control"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="btn btn-outline-secondary">
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" variant="gradient" size="sm" className="btn btn-primary" disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : initialData ? "Update" : "Save"}
        </Button>
      </div>
    </form>
  )
}

