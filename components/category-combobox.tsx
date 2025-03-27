"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, getCategoryColors, saveCategoryColor } from "@/lib/utils"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ColorPicker, THEME_COLORS } from "@/components/ui/color-picker"

interface CategoryComboboxProps {
  value: string | undefined
  onChange: (value: string) => void
  onColorChange?: (category: string, color: string) => void
}

export function CategoryCombobox({ value = "", onChange, onColorChange }: CategoryComboboxProps) {
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
      "Housing",
      "Personal",
      "Debt",
      "Savings",
      "Education",
      "Other"
    ]
    
    // Get all expenses to extract unique categories
    const savedExpenses = localStorage.getItem("expenses")
    let userCategories: string[] = []
    
    if (savedExpenses) {
      try {
        const expenses = JSON.parse(savedExpenses) as any[]
        userCategories = Array.from(new Set(expenses
          .filter(expense => expense && expense.category)
          .map((expense: any) => expense.category)))
          .filter(Boolean) as string[]
      } catch (error) {
        console.error("Error parsing expenses:", error)
      }
    }
    
    // Get category colors
    const colors = getCategoryColors()
    
    // Combine default categories with user categories
    const combinedCategories = Array.from(new Set([
      ...defaultCategories,
      ...userCategories
    ]))
    
    // Ensure all categories have colors
    const updatedColors = { ...colors }
    combinedCategories.forEach(category => {
      if (!updatedColors[category]) {
        const randomColor = getRandomColor()
        updatedColors[category] = randomColor
        saveCategoryColor(category, randomColor)
      }
    })
    
    // Convert to array and sort
    setCategories(combinedCategories.sort())
    
    // Load category colors
    setCategoryColors(updatedColors)
  }, [])

  // Handle selection of a category
  const handleSelectCategory = (category: string) => {
    onChange(category)
    
    // If the category doesn't have a color, assign a random one
    if (category && !categoryColors[category]) {
      const randomColor = getRandomColor()
      const updatedColors = { ...categoryColors, [category]: randomColor }
      setCategoryColors(updatedColors)
      saveCategoryColor(category, randomColor)
      
      if (onColorChange) {
        onColorChange(category, randomColor)
      }
    } else if (category && categoryColors[category] && onColorChange) {
      onColorChange(category, categoryColors[category])
    }
    
    setOpen(false)
  }

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      const categoryName = newCategory.trim()
      setCategories(prevCategories => {
        if (!prevCategories.includes(categoryName)) {
          return [...prevCategories, categoryName].sort()
        }
        return prevCategories
      })
      
      onChange(categoryName)
      
      // Save the category color
      if (newCategoryColor) {
        const updatedColors = { ...categoryColors, [categoryName]: newCategoryColor }
        setCategoryColors(updatedColors)
        saveCategoryColor(categoryName, newCategoryColor)
        if (onColorChange) {
          onColorChange(categoryName, newCategoryColor)
        }
      }
      
      setNewCategory("")
      setNewCategoryColor(THEME_COLORS[0].value)
      setShowNewCategoryDialog(false)
      setOpen(false)
    }
  }

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center">
              {value && (
                <div 
                  className="w-4 h-4 rounded-full mr-2" 
                  style={{ backgroundColor: categoryColors[value] || "#CBD5E1" }}
                />
              )}
              <span>{value || "Select category..."}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search categories..." />
            <CommandEmpty>
              <div className="px-2 py-3 text-sm text-muted-foreground">
                No category found. Add a new one?
              </div>
              <div className="px-2 pb-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowNewCategoryDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add new category
                </Button>
              </div>
            </CommandEmpty>
            <CommandList>
              <CommandGroup>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <CommandItem
                      key={category}
                      value={category}
                      onSelect={() => handleSelectCategory(category)}
                      className="flex items-center"
                    >
                      <div 
                        className="w-4 h-4 rounded-full mr-2 flex-shrink-0" 
                        style={{ backgroundColor: categoryColors[category] || "#CBD5E1" }}
                      />
                      {category}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value === category ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))
                ) : (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    No categories found
                  </div>
                )}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => setShowNewCategoryDialog(true)}
                  className="text-blue-600 dark:text-blue-400"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add new category
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="categoryName" className="text-right">
                Name
              </Label>
              <Input
                id="categoryName"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="col-span-3"
                placeholder="Enter category name"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="categoryColor" className="text-right pt-2">
                Color
              </Label>
              <div className="col-span-3">
                <ColorPicker
                  value={newCategoryColor}
                  onChange={(value) => setNewCategoryColor(value)}
                />
                <div className="h-6 mt-2 rounded" style={{ backgroundColor: newCategoryColor }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

