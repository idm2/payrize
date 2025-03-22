"use client"

import { useState, useEffect, useMemo } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, type Expense } from "@/lib/utils"
import { ExpenseForm } from "@/components/expense-form"
import { ExpenseList } from "@/components/expense-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>("all")

  useEffect(() => {
    const savedExpenses = localStorage.getItem("expenses")
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses))
    }
  }, [])

  const handleAddExpense = (expense: Expense) => {
    let updatedExpenses
    if (editingExpense) {
      updatedExpenses = expenses.map((e) => (e.id === expense.id ? expense : e))
      setEditingExpense(null)
    } else {
      updatedExpenses = [...expenses, { ...expense, id: Date.now().toString() }]
    }
    setExpenses(updatedExpenses)
    localStorage.setItem("expenses", JSON.stringify(updatedExpenses))
    setShowExpenseForm(false)
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setShowExpenseForm(true)
  }

  const handleDeleteExpense = (id: string) => {
    const updatedExpenses = expenses.filter((expense) => expense.id !== id)
    setExpenses(updatedExpenses)
    localStorage.setItem("expenses", JSON.stringify(updatedExpenses))
  }

  // Get unique categories from expenses
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(expenses.map(expense => expense.category)))
    return ["all", ...uniqueCategories].filter(Boolean)
  }, [expenses])

  // Filter expenses by active category
  const filteredExpenses = useMemo(() => {
    if (activeCategory === "all") return expenses
    return expenses.filter(expense => expense.category === activeCategory)
  }, [expenses, activeCategory])

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const filteredTotalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Expense Tracker</h2>
          <p className="text-sm text-muted-foreground">Track your expenses and find savings opportunities.</p>
        </div>
        {!showExpenseForm && (
          <Button variant="gradient" size="sm" onClick={() => setShowExpenseForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        )}
      </div>
      
      {showExpenseForm ? (
        <ExpenseForm
          onSubmit={handleAddExpense}
          onCancel={() => {
            setShowExpenseForm(false)
            setEditingExpense(null)
          }}
          initialData={editingExpense}
        />
      ) : (
        <>
          {categories.length > 1 && (
            <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="mb-4 sm:mb-6">
              <TabsList className="w-full flex overflow-x-auto">
                {categories.map(category => (
                  <TabsTrigger 
                    key={category} 
                    value={category}
                    className="flex-1 capitalize text-xs sm:text-sm whitespace-nowrap"
                  >
                    {category === "all" ? "All Categories" : category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <ExpenseList 
            expenses={filteredExpenses} 
            onEdit={handleEditExpense} 
            onDelete={handleDeleteExpense} 
          />
        </>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t pt-4 mt-4 gap-3 sm:gap-0">
        <div>
          <p className="text-sm font-medium">
            {activeCategory === "all" 
              ? "Total Monthly Expenses" 
              : `Total ${activeCategory} Expenses`}
          </p>
          <p className="text-xl sm:text-2xl font-bold">
            {formatCurrency(activeCategory === "all" ? totalExpenses : filteredTotalExpenses)}
          </p>
        </div>
        {!showExpenseForm && (
          <Button variant="gradient" size="sm" onClick={() => setShowExpenseForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        )}
      </div>
    </div>
  )
}

