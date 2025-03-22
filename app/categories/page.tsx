"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ColorPicker, THEME_COLORS } from "@/components/ui/color-picker"
import { getCategoryColors, saveCategoryColor, Expense } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<string[]>([])
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState(THEME_COLORS[0].value)
  const [editCategory, setEditCategory] = useState("")
  const [editCategoryColor, setEditCategoryColor] = useState("")
  const [originalCategory, setOriginalCategory] = useState("")
  const { toast } = useToast()

  // Load categories and colors from localStorage
  useEffect(() => {
    // Get all expenses to extract unique categories
    const savedExpenses = localStorage.getItem("expenses")
    if (savedExpenses) {
      const expenses = JSON.parse(savedExpenses) as Expense[]
      const uniqueCategories = Array.from(new Set(expenses.map((expense: Expense) => expense.category)))
      setCategories(uniqueCategories.filter(Boolean).sort() as string[])
    }

    // Get category colors
    const colors = getCategoryColors()
    setCategoryColors(colors)
  }, [])

  // Add a new category
  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        variant: "destructive",
      })
      return
    }

    if (categories.includes(newCategory.trim())) {
      toast({
        title: "Error",
        description: "Category already exists",
        variant: "destructive",
      })
      return
    }

    // Add new category to the list
    const updatedCategories = [...categories, newCategory.trim()].sort()
    setCategories(updatedCategories)

    // Save the category color
    saveCategoryColor(newCategory.trim(), newCategoryColor)
    setCategoryColors({ ...categoryColors, [newCategory.trim()]: newCategoryColor })

    // Reset form and close dialog
    setNewCategory("")
    setNewCategoryColor(THEME_COLORS[0].value)
    setShowAddDialog(false)

    toast({
      title: "Success",
      description: "Category added successfully",
    })
  }

  // Edit a category
  const handleEditCategory = () => {
    if (!editCategory.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        variant: "destructive",
      })
      return
    }

    if (editCategory !== originalCategory && categories.includes(editCategory.trim())) {
      toast({
        title: "Error",
        description: "Category already exists",
        variant: "destructive",
      })
      return
    }

    // Update category in the list
    let updatedCategories = [...categories]
    if (editCategory !== originalCategory) {
      updatedCategories = updatedCategories.filter(c => c !== originalCategory)
      updatedCategories.push(editCategory.trim())
      updatedCategories.sort()
    }
    setCategories(updatedCategories)

    // Update category color
    const updatedColors = { ...categoryColors }
    if (editCategory !== originalCategory) {
      delete updatedColors[originalCategory]
    }
    updatedColors[editCategory.trim()] = editCategoryColor

    // Save changes
    saveCategoryColor(editCategory.trim(), editCategoryColor)
    setCategoryColors(updatedColors)

    // Update expenses with the new category name and color
    updateExpensesWithNewCategory(originalCategory, editCategory.trim(), editCategoryColor)

    // Reset form and close dialog
    setEditCategory("")
    setEditCategoryColor("")
    setOriginalCategory("")
    setShowEditDialog(false)

    toast({
      title: "Success",
      description: "Category updated successfully",
    })
  }

  // Delete a category
  const handleDeleteCategory = (category: string) => {
    if (confirm(`Are you sure you want to delete the category "${category}"?`)) {
      // Remove category from the list
      const updatedCategories = categories.filter(c => c !== category)
      setCategories(updatedCategories)

      // Remove category color
      const updatedColors = { ...categoryColors }
      delete updatedColors[category]
      setCategoryColors(updatedColors)

      // Update localStorage
      const colors = getCategoryColors()
      delete colors[category]
      localStorage.setItem('categoryColors', JSON.stringify(colors))

      // Update expenses with this category
      updateExpensesWithDeletedCategory(category)

      toast({
        title: "Success",
        description: "Category deleted successfully",
      })
    }
  }

  // Update expenses when a category is renamed or color changed
  const updateExpensesWithNewCategory = (oldCategory: string, newCategory: string, newColor: string) => {
    const savedExpenses = localStorage.getItem("expenses")
    if (savedExpenses) {
      const expenses = JSON.parse(savedExpenses) as Expense[]
      const updatedExpenses = expenses.map((expense: Expense) => {
        if (expense.category === oldCategory) {
          return { ...expense, category: newCategory, color: newColor }
        }
        return expense
      })
      localStorage.setItem("expenses", JSON.stringify(updatedExpenses))
    }
  }

  // Update expenses when a category is deleted
  const updateExpensesWithDeletedCategory = (category: string) => {
    const savedExpenses = localStorage.getItem("expenses")
    if (savedExpenses) {
      const expenses = JSON.parse(savedExpenses) as Expense[]
      const updatedExpenses = expenses.map((expense: Expense) => {
        if (expense.category === category) {
          return { ...expense, category: "Uncategorized", color: undefined }
        }
        return expense
      })
      localStorage.setItem("expenses", JSON.stringify(updatedExpenses))
    }
  }

  return (
    <DashboardShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage your expense categories</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Categories</CardTitle>
          <CardDescription>Customize your expense categories and colors</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No categories added yet</p>
              <p className="text-sm text-muted-foreground">Add your first category to get started</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-6 w-6 rounded-full border" 
                      style={{ backgroundColor: categoryColors[category] || "#9333EA" }}
                    />
                    <span className="font-medium">{category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setEditCategory(category)
                        setEditCategoryColor(categoryColors[category] || "#9333EA")
                        setOriginalCategory(category)
                        setShowEditDialog(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteCategory(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-category-name">Category Name</Label>
              <Input
                id="new-category-name"
                placeholder="Enter category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-category-color">Category Color</Label>
              <ColorPicker
                value={newCategoryColor}
                onChange={setNewCategoryColor}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                placeholder="Enter category name"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category-color">Category Color</Label>
              <ColorPicker
                value={editCategoryColor}
                onChange={setEditCategoryColor}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
} 