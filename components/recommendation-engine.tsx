"use client"

import { useState, useEffect, useCallback } from "react"
import { ExternalLink, Percent, Search, List, AlertTriangle, Check, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { AlternativesDialog } from "@/components/alternatives-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { AlternativeProduct, Expense } from "@/lib/utils"

export function RecommendationEngine() {
  const [activeTab, setActiveTab] = useState("compare")
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadingAlternatives, setLoadingAlternatives] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedExpense, setSelectedExpense] = useState<{
    id: string
    name: string
    currentAmount: number
  } | null>(null)
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([])

  // Load expenses from localStorage
  const loadExpenses = useCallback(() => {
    try {
    const savedExpenses = localStorage.getItem("expenses")
    if (savedExpenses) {
      const parsedExpenses = JSON.parse(savedExpenses)
        console.log("Loaded expenses:", parsedExpenses)
      setExpenses(parsedExpenses)
        return parsedExpenses
      }
    } catch (error) {
      console.error("Error loading expenses:", error)
    }
    return []
  }, [])

  // Add this new function to automatically add the best alternative to the plan
  const addBestAlternativeToPlan = useCallback((expense: Expense, alternatives: AlternativeProduct[]) => {
    if (!alternatives || alternatives.length === 0) return;
    
    // Find the best alternative (highest savings)
    const bestAlternative = alternatives.reduce((best, current) => 
      current.savings > best.savings ? current : best, alternatives[0]);
    
    console.log("Automatically adding best alternative to plan:", bestAlternative);
    
    // Get the latest expenses to ensure we don't overwrite other changes
    const currentExpenses = loadExpenses();
    
    // Update the expense with the selected alternative
    const updatedExpenses = currentExpenses.map((e: Expense) => 
      e.id === expense.id 
        ? { 
            ...e, 
            selectedAlternative: {
              id: bestAlternative.id,
              name: bestAlternative.name,
              price: bestAlternative.price,
              savings: bestAlternative.savings,
              source: bestAlternative.source
            },
            targetAmount: bestAlternative.price,
            willingness: "Very Willing" // Mark as very willing since we're selecting an alternative
          } 
        : e
    );
    
    // Save to localStorage
    localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
    
    // Update state
    setExpenses(updatedExpenses);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('expensesUpdated'));
  }, [loadExpenses]);

  // Modify the fetchAlternatives function to automatically add the best alternative
  const fetchAlternatives = async (expense: Expense) => {
    if (!expense || !expense.id) {
      console.error("Invalid expense object:", expense)
      return
    }
    
    console.log("Fetching alternatives for:", expense)
    setLoadingAlternatives(prev => ({ ...prev, [expense.id]: true }))
    setErrors(prev => ({ ...prev, [expense.id]: "" }))
    
    try {
      const response = await fetch("/api/alternatives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expense }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch alternatives")
      }

      console.log("Received alternatives:", data)
      
      // Process alternatives
      const alternatives = data.map((alt: any, index: number) => ({
        ...alt,
        id: `${expense.id}-alt-${index}`,
        savings: expense.amount - alt.price
      }));
      
      // Get the latest expenses to ensure we don't overwrite other changes
      const currentExpenses = loadExpenses()
      
      // Update the expense with alternatives
      const updatedExpenses = currentExpenses.map((e: Expense) => 
        e.id === expense.id ? { 
          ...e, 
          alternatives: alternatives
        } : e
      )
      
      console.log("Updating expenses with alternatives:", updatedExpenses)
      setExpenses(updatedExpenses)
      localStorage.setItem("expenses", JSON.stringify(updatedExpenses))
      
      // Automatically add the best alternative to the plan if it provides savings
      const bestAlternative = alternatives.reduce((best: AlternativeProduct, current: AlternativeProduct) => 
        current.savings > best.savings ? current : best, alternatives[0]);
      
      if (bestAlternative && bestAlternative.savings > 0) {
        // Wait a short time to ensure the alternatives are saved first
        setTimeout(() => {
          addBestAlternativeToPlan(expense, alternatives);
        }, 300);
      }

    } catch (error) {
      console.error("Error fetching alternatives:", error)
      setErrors(prev => ({ 
      ...prev,
        [expense.id]: error instanceof Error ? error.message : "Failed to fetch alternatives" 
      }))
    } finally {
      setLoadingAlternatives(prev => ({ ...prev, [expense.id]: false }))
    }
  }

  // Load expenses and fetch alternatives
  useEffect(() => {
    const parsedExpenses = loadExpenses()
    
    // Automatically fetch alternatives for expenses that don't have them
    if (parsedExpenses.length > 0) {
      parsedExpenses.forEach((expense: Expense) => {
        if (!expense.alternatives) {
          // Use setTimeout to stagger requests and avoid rate limiting
          setTimeout(() => {
            fetchAlternatives(expense)
          }, 500 * Math.random()) // Random delay up to 500ms
        }
      })
    }
  }, [loadExpenses])

  // Listen for updates to expenses
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "expenses") {
        loadExpenses()
      }
    }
    
    const handleCustomStorageChange = () => {
      loadExpenses()
    }
    
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("expensesUpdated", handleCustomStorageChange)
    
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("expensesUpdated", handleCustomStorageChange)
    }
  }, [loadExpenses])

  // Get the best alternative for an expense
  const getBestAlternative = (expense: Expense) => {
    if (!expense.alternatives || expense.alternatives.length === 0) return null
    return expense.alternatives.reduce((best, current) => 
      current.savings > best.savings ? current : best, expense.alternatives[0])
  }

  // Calculate potential savings
  const calculatePotentialSavings = () => {
    return expenses.reduce((total, expense) => {
      if (expense.targetAmount !== undefined && expense.targetAmount < expense.amount) {
        return total + (expense.amount - expense.targetAmount)
      }
      return total
    }, 0)
  }

  // Calculate savings for an alternative
  const calculateSavings = (expense: Expense, alternative: AlternativeProduct) => {
    return expense.amount - alternative.price
  }

  // Add a manual refresh button
  const refreshExpenses = () => {
    const refreshedExpenses = loadExpenses()
    setExpenses(refreshedExpenses)
  }

  return (
    <div className="w-full">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-4 grid grid-cols-2">
          <TabsTrigger value="compare" className="text-xs sm:text-sm">
            <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="reduce" className="text-xs sm:text-sm">
            <Percent className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Reduce
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compare" className="space-y-4">
          {expenses.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              <p>No expenses added yet. Add expenses to find alternatives.</p>
            </div>
          ) : (
            expenses.map(expense => (
              <Card key={expense.id} className="bg-muted/30 overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                  <h3 className="font-medium">{expense.name}</h3>
                        <p className="text-sm text-muted-foreground">{formatCurrency(expense.amount)} / month</p>
                </div>

                      {/* Willingness badge */}
                      {expense.willingness && (
                        <Badge 
                          variant="outline" 
                          className={`
                            ${expense.willingness === "Very Willing" ? "border-green-500/30 bg-green-500/10 text-green-500 dark:border-green-500/30 dark:bg-green-500/20 dark:text-green-400" : ""}
                            ${expense.willingness === "Possible" ? "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400" : ""}
                            ${expense.willingness === "Not Willing" ? "border-red-500/30 bg-red-500/10 text-red-500 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-400" : ""}
                            self-start sm:self-center
                          `}
                        >
                          {expense.willingness}
                        </Badge>
                      )}
                  </div>

                  </div>

                  {loadingAlternatives[expense.id] && (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  )}

                  {errors[expense.id] && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="ml-2">
                        {errors[expense.id]}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchAlternatives(expense)}
                          className="ml-2"
                        >
                          Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {expense.alternatives && getBestAlternative(expense) && (
                    <div className="mt-4 border rounded-lg p-4 bg-card">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">Best Alternative:</h4>
                            <Badge variant="outline" className="text-green-500 dark:text-green-400 border-green-500/30 bg-green-500/10 dark:border-green-500/30 dark:bg-green-500/20">
                              Save {formatCurrency(calculateSavings(expense, getBestAlternative(expense)!))}/month
                            </Badge>
                    </div>
                          <p className="text-sm">{getBestAlternative(expense)!.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {getBestAlternative(expense)!.description}
                          </p>
                          <p className="text-sm font-medium">
                            Price: {formatCurrency(getBestAlternative(expense)!.price)}/month
                          </p>
                  </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                    <a
                              href={getBestAlternative(expense)!.url} 
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                              <ExternalLink className="h-4 w-4" />
                    </a>
                          </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedExpense({
                          id: expense.id,
                          name: expense.name,
                          currentAmount: expense.amount,
                        })
                              setAlternatives(expense.alternatives || [])
                        setShowAlternatives(true)
                      }}
                    >
                            <List className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={expense.selectedAlternative ? "outline" : "gradient"}
                            size="sm"
                            className={expense.selectedAlternative ? "bg-muted text-muted-foreground hover:bg-muted/80 border-border" : ""}
                            onClick={() => {
                              const bestAlt = getBestAlternative(expense)!;
                              const updatedExpenses = expenses.map(e => 
                                e.id === expense.id 
                                  ? { 
                                      ...e, 
                                      selectedAlternative: e.selectedAlternative ? undefined : {
                                        id: bestAlt.id,
                                        name: bestAlt.name,
                                        price: bestAlt.price,
                                        savings: calculateSavings(expense, bestAlt),
                                        source: bestAlt.source
                                      },
                                      targetAmount: e.selectedAlternative ? undefined : bestAlt.price
                                    } 
                                  : e
                              );
                              setExpenses(updatedExpenses);
                              localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
                              // Dispatch custom event to notify other components
                              window.dispatchEvent(new Event('expensesUpdated'));
                            }}
                          >
                            {expense.selectedAlternative ? (
                              <span className="flex items-center gap-1">
                                <Check className="h-4 w-4" />
                                <span className="text-xs">Added</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Plus className="h-4 w-4" />
                                <span className="text-xs">Add to Plan</span>
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reduce" className="space-y-4 pt-4 px-4">
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No expenses added yet</p>
              <p className="text-sm">Add expenses to start reducing your spending</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Adjust Your Spending</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Use the sliders below to adjust how much you want to spend on each expense.
                  Drag left to reduce your spending.
                </p>
              </div>
              
              {expenses.map((expense) => {
                return (
                  <Card key={expense.id} className="bg-card border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-medium">{expense.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Original: {formatCurrency(expense.amount)}/month
                          </p>
                        </div>
                        <Badge variant="outline" className={
                          expense.willingness === "Not Willing" ? "border-red-500/30 bg-red-500/10 text-red-500 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-400" :
                          expense.willingness === "Possible" ? "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400" :
                          "border-green-500/30 bg-green-500/10 text-green-500 dark:border-green-500/30 dark:bg-green-500/20 dark:text-green-400"
                        }>
                          {expense.willingness}
                        </Badge>
                      </div>
                      
                      <div className="space-y-4">
                        {expense.selectedAlternative ? (
                          <div className="bg-blue-500/10 dark:bg-blue-500/20 p-3 rounded-lg border border-blue-500/30 dark:border-blue-500/30 mb-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Using Alternative:</span>
                                  <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-500 dark:border-green-500/30 dark:bg-green-500/20 dark:text-green-400">
                                    Save {formatCurrency(expense.selectedAlternative.savings)}/month
                                  </Badge>
                                </div>
                                <p className="text-sm text-blue-600 dark:text-blue-400">{expense.selectedAlternative.name}</p>
                                <p className="text-sm text-blue-500 dark:text-blue-300 mt-1">
                                  Price: {formatCurrency(expense.selectedAlternative.price)}/month
                                  {expense.alternatives?.find(alt => alt.id === expense.selectedAlternative?.id)?.source && (
                                    <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                      via {expense.alternatives.find(alt => alt.id === expense.selectedAlternative?.id)?.source}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/50"
                                onClick={() => {
                                  const updatedExpenses = expenses.map(e => 
                                    e.id === expense.id ? { ...e, selectedAlternative: undefined, targetAmount: undefined } : e
                                  );
                                  setExpenses(updatedExpenses);
                                  localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">Target amount:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {formatCurrency(expense.targetAmount !== undefined ? expense.targetAmount : expense.amount)}
                                </span>
                                {expense.targetAmount !== undefined && expense.targetAmount !== expense.amount && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 px-2 text-xs"
                                    onClick={() => {
                                      const updatedExpenses = expenses.map(e => 
                                        e.id === expense.id ? { ...e, targetAmount: expense.amount } : e
                                      );
                                      setExpenses(updatedExpenses);
                                      localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
                                    }}
                                  >
                                    Reset
                    </Button>
                                )}
                              </div>
                            </div>
                            
                            <Slider
                              defaultValue={[expense.targetAmount || expense.amount]}
                              value={[expense.targetAmount !== undefined ? expense.targetAmount : expense.amount]}
                              max={expense.amount}
                              min={0}
                              step={5}
                              onValueChange={(value) => {
                                const newTargetAmount = value[0];
                                if (newTargetAmount !== expense.targetAmount) {
                                  const updatedExpenses = expenses.map(e => 
                                    e.id === expense.id ? { ...e, targetAmount: newTargetAmount } : e
                                  );
                                  setExpenses(updatedExpenses);
                                  localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
                                }
                              }}
                              className="my-4"
                            />
                            
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>$0</span>
                              <span>{formatCurrency(expense.amount)}</span>
                            </div>
                          </>
                        )}
                        
                        {(expense.targetAmount !== undefined && expense.targetAmount < expense.amount) || expense.selectedAlternative ? (
                          <div className="flex justify-between items-center text-sm mt-4">
                            <span>Potential savings:</span>
                            <span className="font-medium text-green-500">
                              {formatCurrency(expense.selectedAlternative ? expense.selectedAlternative.savings : calculatePotentialSavings())}/month
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">Total Potential Savings</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Monthly savings:</span>
                    <span className="text-2xl font-bold text-green-500">
                      {formatCurrency(calculatePotentialSavings())}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-muted-foreground">Annual savings:</span>
                    <span className="text-lg font-semibold text-green-500">
                      {formatCurrency(calculatePotentialSavings() * 12)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedExpense && (
        <AlternativesDialog
          open={showAlternatives}
          onOpenChange={setShowAlternatives}
          expense={selectedExpense}
          alternatives={alternatives}
        />
      )}
    </div>
  )
}

