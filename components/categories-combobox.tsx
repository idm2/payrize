import React from 'react'
import { THEME_COLORS } from '../constants/theme-colors'

export function CategoryCombobox({ value, onChange, onColorChange }: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [categories, setCategories] = React.useState<string[]>([])
  const [showNewCategoryDialog, setShowNewCategoryDialog] = React.useState(false)
  const [newCategory, setNewCategory] = React.useState("")
  const [newCategoryColor, setNewCategoryColor] = React.useState(THEME_COLORS[0].value)
  const [categoryColors, setCategoryColors] = React.useState<Record<string, string>>({})

  // Get a random color from THEME_COLORS
  const getRandomColor = () => {
    const randomIndex = Math.floor(Math.random() * THEME_COLORS.length)
    return THEME_COLORS[randomIndex].value
  }

  // Load categories and colors from localStorage
  React.useEffect(() => {
    // Default categories with colors to use when no categories are found
    const defaultCategories = [
      "Entertainment",
      "Business",
      "Health",
      "Food",
      "Transportation",
      "Utilities",
      "Insurance",
    ]
    
    // Get all expenses to extract unique categories
    const savedExpenses = localStorage.getItem("expenses")
    let userCategories: string[] = []
    
    if (savedExpenses) {
      const expenses = JSON.parse(savedExpenses) as any[]
      userCategories = Array.from(new Set(expenses.map((expense: any) => expense.category)))
        .filter(Boolean) as string[]
    }
    
    // Get category colors
    const colors = getCategoryColors()
    
    // Combine default categories with user categories
    const combinedCategories = new Set([
      ...defaultCategories,
      ...userCategories
    ])
    
    // Convert to array and sort
    setCategories(Array.from(combinedCategories).sort())
    
    // Load category colors
    setCategoryColors(colors)
  }, [])

  // ... existing code ...
} 