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
  value: string
  onChange: (value: string) => void
  onColorChange?: (category: string, color: string) => void
}

export function CategoryCombobox({ value, onChange, onColorChange }: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [categories, setCategories] = React.useState([
    "Entertainment",
    "Business",
    "Health",
    "Food",
    "Transportation",
    "Utilities",
    "Insurance",
  ])
  const [showNewCategoryDialog, setShowNewCategoryDialog] = React.useState(false)
  const [newCategory, setNewCategory] = React.useState("")
  const [newCategoryColor, setNewCategoryColor] = React.useState(THEME_COLORS[0].value)
  const [categoryColors, setCategoryColors] = React.useState<Record<string, string>>({})

  // Get a random color from THEME_COLORS
  const getRandomColor = () => {
    const randomIndex = Math.floor(Math.random() * THEME_COLORS.length)
    return THEME_COLORS[randomIndex].value
  }

  // Load category colors from localStorage and assign random colors to categories without colors
  React.useEffect(() => {
    const colors = getCategoryColors()
    
    // Assign random colors to default categories that don't have colors
    const updatedColors = { ...colors }
    let colorsUpdated = false
    
    categories.forEach(category => {
      if (!updatedColors[category]) {
        updatedColors[category] = getRandomColor()
        colorsUpdated = true
      }
    })
    
    // Save updated colors if any were added
    if (colorsUpdated) {
      Object.entries(updatedColors).forEach(([category, color]) => {
        saveCategoryColor(category, color)
      })
    }
    
    setCategoryColors(updatedColors)
  }, [categories])

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
    }
    
    setOpen(false)
  }

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      const categoryName = newCategory.trim()
      setCategories([...categories, categoryName])
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
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            role="combobox" 
            aria-expanded={open} 
            className="w-full justify-between"
            style={value && categoryColors[value] ? { backgroundColor: `${categoryColors[value]}20` } : undefined}
          >
            <div className="flex items-center gap-2">
              {value && categoryColors[value] && (
                <div 
                  className="h-4 w-4 rounded-full border" 
                  style={{ backgroundColor: categoryColors[value] }}
                />
              )}
              {value || "Select category..."}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Search category..." />
            <CommandList>
              <CommandEmpty>No category found.</CommandEmpty>
              <CommandGroup>
                {categories.map((category) => (
                  <CommandItem
                    key={category}
                    onSelect={() => handleSelectCategory(category)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {categoryColors[category] && (
                        <div 
                          className="h-4 w-4 rounded-full border" 
                          style={{ backgroundColor: categoryColors[category] }}
                        />
                      )}
                      <Check className={cn("mr-2 h-4 w-4", value === category ? "opacity-100" : "opacity-0")} />
                      {category}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setShowNewCategoryDialog(true)
                  setOpen(false)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add new category
              </CommandItem>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="Enter category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-color">Category Color</Label>
              <ColorPicker
                value={newCategoryColor}
                onChange={setNewCategoryColor}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

