"use client"

import { useState, useEffect, useCallback } from "react"
import { ExternalLink, Percent, Search, List, AlertTriangle, Check, Plus, Loader2, MapPin } from "lucide-react"
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
import { SavingsItem } from "@/components/savings-item"
import { toast } from "@/components/ui/use-toast"
import { ExpenseEditDialog } from "@/components/expense-edit-dialog"

export function RecommendationEngine() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([])
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)

  // Load expenses from localStorage
  useEffect(() => {
    const loadExpenses = () => {
      const savedExpenses = localStorage.getItem("expenses")
      if (savedExpenses) {
        try {
          const parsed = JSON.parse(savedExpenses) as Expense[]
          setExpenses(parsed)
          setFilteredExpenses(parsed)
        } catch (error) {
          console.error("Error parsing expenses:", error)
          toast({
            title: "Error",
            description: "Failed to load your expenses. Please try again.",
            variant: "destructive",
          })
        }
      }
    }

    loadExpenses()

    // Listen for expense updates
    const handleExpensesUpdated = () => {
      loadExpenses()
    }

    window.addEventListener("expensesUpdated", handleExpensesUpdated)
    return () => {
      window.removeEventListener("expensesUpdated", handleExpensesUpdated)
    }
  }, [])

  // Auto-search on component mount if flag is set
  useEffect(() => {
    const autoSearch = localStorage.getItem("autoSearchSavings")
    if (autoSearch === "true" && expenses.length > 0) {
      // Clear the flag
      localStorage.removeItem("autoSearchSavings")
      
      // Only auto-search if we have expenses with Possible or Very Willing willingness
      const eligibleExpenses = expenses.filter(expense => 
        (expense.willingness === "Possible" || expense.willingness === "Very Willing") &&
        !expense.selectedAlternative // Only search for those without alternatives already
      )
      
      if (eligibleExpenses.length > 0) {
        // Automatically trigger the search
        handleRefreshAll()
      }
    }
  }, [expenses])

  // Handle search
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredExpenses(expenses)
    } else {
      const filtered = expenses.filter(
        (expense) =>
          expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredExpenses(filtered)
    }
  }, [searchTerm, expenses])

  // Handle show alternatives
  const handleShowAlternatives = (expense: Expense) => {
    setSelectedExpense(expense)
    setAlternatives(expense.alternatives || [])
    setShowAlternatives(true)
  }

  // Handle editing an expense
  const handleEditExpense = (expense: Expense) => {
    // Find the full expense in the current expenses array
    const fullExpense = expenses.find(e => e.id === expense.id)
    
    if (!fullExpense) {
      toast({
        title: "Error",
        description: "Could not find expense to edit",
        variant: "destructive",
      })
      return
    }
    
    // Set the expense being edited and show the dialog
    setEditingExpense(fullExpense)
    setShowEditDialog(true)
  }

  // Handle delete expense
  const handleDeleteExpense = (expense: Expense) => {
    if (confirm(`Are you sure you want to delete ${expense.name}?`)) {
      try {
        // Remove expense from localStorage
        const updatedExpenses = expenses.filter((e) => e.id !== expense.id)
        localStorage.setItem("expenses", JSON.stringify(updatedExpenses))
        
        // Update state
        setExpenses(updatedExpenses)
        setFilteredExpenses(updatedExpenses)
        
        // Show success message
        toast({
          title: "Expense Deleted",
          description: `${expense.name} has been deleted.`,
        })
        
        // Trigger refresh
        window.dispatchEvent(new Event('expensesUpdated'))
      } catch (error) {
        console.error("Error deleting expense:", error)
        toast({
          title: "Error",
          description: "Failed to delete expense. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  // Calculate potential savings
  const calculateTotalSavings = () => {
    return expenses.reduce((total, expense) => {
      if (expense.selectedAlternative) {
        const originalAmount = expense.amount
        const alternativeAmount = expense.selectedAlternative.price
        
        if (expense.frequency === "Per Unit") {
          const quantity = expense.quantity || 1
          // Get the division factor based on frequency
          const divisionFactor = expense.frequency.toLowerCase() === "yearly" ? 12 : 1
          const monthlySavings = ((originalAmount - alternativeAmount) * quantity) / divisionFactor
          return total + monthlySavings
        } else {
          // Get the division factor based on frequency
          const divisionFactor = expense.frequency.toLowerCase() === "yearly" ? 12 : 1
          const monthlySavings = (originalAmount - alternativeAmount) / divisionFactor
          return total + monthlySavings
        }
      } else if (expense.manualSavingsPercentage && expense.manualSavingsPercentage > 0) {
        // Calculate savings from manual percentage
        const originalAmount = expense.amount;
        const savingsAmount = originalAmount * (expense.manualSavingsPercentage / 100);
        
        // Convert to monthly based on frequency
        if (expense.frequency === "Weekly") {
          return total + (savingsAmount * 4.33); // Average weeks per month
        } else if (expense.frequency === "Yearly") {
          return total + (savingsAmount / 12);
        } else if (expense.frequency === "Quarterly") {
          return total + (savingsAmount / 3);
        } else if (expense.frequency === "Per Unit") {
          const quantity = expense.quantity || 1;
          return total + (savingsAmount * quantity);
        } else {
          // Monthly or default
          return total + savingsAmount;
        }
      }
      return total
    }, 0)
  }

  // Count expenses with any savings (either alternatives or manual)
  const countExpensesWithSavings = () => {
    return expenses.filter((expense) => 
      expense.selectedAlternative || (expense.manualSavingsPercentage && expense.manualSavingsPercentage > 0)
    ).length
  }

  // Count total expenses
  const totalExpensesCount = expenses.length

  // Handle refresh alternatives for all expenses
  const handleRefreshAll = async () => {
    try {
      // Show searching overlay
      setIsSearching(true)
      setSearchProgress(5)
      
      console.log("=== Starting search for alternatives ===");
      
      // Show loading toast
      toast({
        title: "Searching for Better Deals",
        description: "Finding savings opportunities across all your expenses...",
      });
      
      // Get user preferences from localStorage
      const locationRadius = localStorage.getItem("userLocationRadius") || "10";
      const sortPreference = localStorage.getItem("userSortPreference") || "balanced";
      
      console.log("User preferences:", { locationRadius, sortPreference });
      
      // Create a copy of expenses that we can update
      const updatedExpenses = [...expenses];
      let successCount = 0;
      let errorCount = 0;
      
      // Process each expense that has a good description
      const eligibleExpenses = expenses.filter(expense => 
        expense.willingness !== "Not Willing"
      );
      
      console.log(`Found ${eligibleExpenses.length} eligible expenses for search`, 
        eligibleExpenses.map(e => ({
          id: e.id,
          name: e.name,
          willingness: e.willingness,
          descriptionLength: e.description?.length || 0
        }))
      );
      
      // Early return if no eligible expenses
      if (eligibleExpenses.length === 0) {
        console.error("No eligible expenses found for search");
        toast({
          title: "No Eligible Expenses",
          description: "Add detailed descriptions to your expenses to find alternatives.",
          variant: "destructive",
        });
        setIsSearching(false)
        return;
      }
      
      // Increment progress based on eligible expenses
      setSearchProgress(10)
      
      // Process each eligible expense
      for (let i = 0; i < eligibleExpenses.length; i++) {
        const expense = eligibleExpenses[i]
        
        try {
          // Update progress
          const progressIncrement = 80 / eligibleExpenses.length
          setSearchProgress(10 + Math.round(progressIncrement * i))
          
          console.log(`Searching for alternatives for expense: ${expense.name} (${expense.id})`);
          
          // Use relative path instead of hardcoded localhost URL to fix port issues
          // Log the complete URL to help in debugging
          const apiUrl = new URL('/api/alternatives', window.location.origin).href;
          console.log(`Fetching from API URL: ${apiUrl}`);
          
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-location-radius": locationRadius,
              "x-sort-preference": sortPreference
            },
            body: JSON.stringify(expense),
          });
          
          // Log response status and headers for debugging
          console.log(`Response status for ${expense.name}:`, response.status, response.statusText);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`API error for ${expense.name}:`, response.status, errorText);
            throw new Error(`Failed to fetch alternatives for ${expense.name}: ${response.status}`);
          }
          
          // Parse the response JSON
          const data = await response.json();
          
          console.log(`Received API response for ${expense.name}:`, data);
          
          // Check if we have a proper alternatives array
          const alternatives = Array.isArray(data) ? data : 
                              (data.alternatives ? data.alternatives : []);
          
          console.log(`Processed ${alternatives.length} alternatives for ${expense.name}`);
          
          if (alternatives && alternatives.length > 0) {
            // Count alternatives by source for detailed logging
            const alternativesBySource = alternatives.reduce((counts: Record<string, number>, alt: AlternativeProduct) => {
              const source = alt.source || 'unknown';
              counts[source] = (counts[source] || 0) + 1;
              return counts;
            }, {});
            
            console.log(`Alternatives by source for ${expense.name}:`, alternativesBySource);
            
            // Find the expense in our updated array
            const expenseIndex = updatedExpenses.findIndex(e => e.id === expense.id);
            if (expenseIndex !== -1) {
              // Log detailed information about the alternatives
              console.log(`Processing alternatives for ${expense.name} by source:`, 
                alternatives.reduce((count: Record<string, number>, alt: AlternativeProduct) => {
                  const source = alt.source || 'unknown';
                  count[source] = (count[source] || 0) + 1;
                  return count;
                }, {} as Record<string, number>)
              );
              
              // Update with new alternatives
              updatedExpenses[expenseIndex] = {
                ...updatedExpenses[expenseIndex],
                alternatives: alternatives,
              };
              
              // Find best alternative - consider savings and confidence
              const bestAlternative = alternatives.reduce(
                (best: AlternativeProduct, current: AlternativeProduct) => {
                  // Calculate weighted score based on savings and confidence (if available)
                  const bestScore = best.savings * (best.confidence ? (best.confidence / 100) : 1);
                  const currentScore = current.savings * (current.confidence ? (current.confidence / 100) : 1);
                  
                  console.log(`Comparing alternatives - Current: ${current.name} (${current.source || 'unknown'}) Score: ${currentScore.toFixed(2)}, Best so far: ${best.name} (${best.source || 'unknown'}) Score: ${bestScore.toFixed(2)}`);
                  
                  return currentScore > bestScore ? current : best;
                }, 
                alternatives[0]
              );
              
              console.log(`Best alternative for ${expense.name}:`, {
                id: bestAlternative.id,
                name: bestAlternative.name,
                source: bestAlternative.source || 'unknown',
                price: bestAlternative.price,
                savings: bestAlternative.savings,
                confidence: bestAlternative.confidence
              });
              
              // If we found a better option than existing alternative, update it
              if (!updatedExpenses[expenseIndex].selectedAlternative || 
                  bestAlternative.savings > (updatedExpenses[expenseIndex].selectedAlternative?.savings || 0)) {
                updatedExpenses[expenseIndex].selectedAlternative = {
                  id: bestAlternative.id,
                  name: bestAlternative.name,
                  price: bestAlternative.price,
                  savings: bestAlternative.savings,
                  source: bestAlternative.source,
                  location: bestAlternative.location
                };
                updatedExpenses[expenseIndex].targetAmount = bestAlternative.price;
              }
            }
            successCount++;
          } else {
            console.log(`No alternatives found for ${expense.name}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`Error refreshing alternatives for ${expense.name}:`, error);
          errorCount++;
        }
      }
      
      // Final progress increment
      setSearchProgress(95)
      
      console.log(`Search complete. Success: ${successCount}, Errors: ${errorCount}`);
      
      // Save the updated expenses
      localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
      
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('expensesUpdated'));
      
      // Update state
      setExpenses(updatedExpenses);
      
      // Complete progress
      setSearchProgress(100)
      
      // Show success toast
      toast({
        title: "Savings Opportunities Found",
        description: `Successfully found savings for ${successCount} expense${successCount === 1 ? '' : 's'}${errorCount > 0 ? ` (${errorCount} failed)` : ''}.`,
        variant: successCount > 0 ? "default" : "destructive",
      });
      
      // Hide searching overlay after a short delay to show 100%
      setTimeout(() => {
        setIsSearching(false)
      }, 1000)
      
    } catch (error) {
      console.error("Error refreshing alternatives:", error);
      toast({
        title: "Error",
        description: "Failed to refresh alternatives. Please try again.",
        variant: "destructive",
      });
      setIsSearching(false)
    }
  }

  // Render content based on data
  const renderContent = () => {
    if (expenses.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Expenses Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add expenses in the Dashboard to see potential savings.
          </p>
        </div>
      )
    }

    if (filteredExpenses.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Search className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Matching Expenses</h3>
          <p className="text-sm text-muted-foreground">
            Try a different search term or clear your search.
          </p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 gap-4">
        {filteredExpenses.map((expense) => (
          <SavingsItem
            key={expense.id}
            expense={expense}
            onShowAlternatives={() => handleShowAlternatives(expense)}
            onEditExpense={() => handleEditExpense(expense)}
            onDeleteExpense={() => handleDeleteExpense(expense)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Loading overlay for web search */}
      {isSearching && (
        <div className="fixed inset-0 bg-gradient-to-r from-purple-600 to-pink-600 flex flex-col items-center justify-center z-50">
          <div className="text-white text-3xl font-bold mb-8 text-center px-4">
            Searching for the best savings options...
          </div>
          
          <div className="relative w-64 h-32 mb-8">
            {/* Search web animation */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center mb-4 animate-bounce">
                {searchProgress < 50 ? (
                  <Search className="h-10 w-10 text-purple-600" />
                ) : (
                  <MapPin className="h-10 w-10 text-purple-600" />
                )}
              </div>
              <div className="w-32 h-1 bg-white/30 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-white animate-pulse" style={{ width: `${searchProgress}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="w-64 mb-4">
            <div className="bg-white/20 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300 ease-in-out" 
                style={{ width: `${searchProgress}%` }}
              ></div>
            </div>
            <p className="text-white text-sm mt-2 text-center">{searchProgress}% complete</p>
          </div>
          
          <p className="text-white/80 text-sm max-w-md text-center px-4">
            {searchProgress < 50 ? (
              <>We're searching across the web to find you the best deals and maximize your savings</>
            ) : searchProgress < 80 ? (
              <>Finding store locations within your preferred distance radius</>
            ) : (
              <>Sorting alternatives by price and distance for the best recommendations</>
            )}
          </p>
          
          {/* Location radius indicator when searching for physical products */}
          {searchProgress >= 50 && searchProgress < 90 && (
            <div className="mt-6 bg-white/10 rounded-md p-3 text-sm text-white/90 max-w-md text-center">
              <div className="font-medium mb-1">Location Preference Applied</div>
              <div className="flex items-center justify-center">
                <MapPin className="h-4 w-4 mr-1 text-white/80" />
                Looking for stores within {localStorage.getItem("userLocationRadius") || "10"}km of your location
              </div>
            </div>
          )}
        </div>
      )}
      
      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <TabsList>
            <TabsTrigger value="all">All Expenses</TabsTrigger>
            <TabsTrigger value="identified">With Savings</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                className="pl-8 w-full md:w-[200px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshAll}
              disabled={isSearching}
              className="relative"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Find Savings
                </>
              )}
            </Button>
          </div>
        </div>

        <Alert className="mb-4">
          <AlertDescription className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="mr-4">
                <div className="text-sm font-medium">Potential Monthly Savings</div>
                <div className="text-2xl font-bold">{formatCurrency(calculateTotalSavings())}</div>
              </div>
              <div className="hidden md:block h-10 w-px bg-border mx-2"></div>
              <div className="hidden md:block">
                <div className="text-sm font-medium">Expenses with Savings</div>
                <div className="text-lg font-medium">
                  {countExpensesWithSavings()} / {totalExpensesCount}
                </div>
              </div>
            </div>
            <Badge variant="outline" className="hidden md:flex bg-green-50 text-green-700 border-green-200">
              <Check className="h-3 w-3 mr-1" />
              Savings Identified
            </Badge>
          </AlertDescription>
        </Alert>

        <TabsContent value="all" className="mt-0">
          {renderContent()}
        </TabsContent>
        
        <TabsContent value="identified" className="mt-0">
          {/* Similar to renderContent but filtered to only show expenses with savings (alternatives OR manual) */}
          <div className="grid grid-cols-1 gap-4">
            {filteredExpenses
              .filter((expense) => 
                expense.selectedAlternative || (expense.manualSavingsPercentage && expense.manualSavingsPercentage > 0)
              )
              .map((expense) => (
                <SavingsItem
                  key={expense.id}
                  expense={expense}
                  onShowAlternatives={() => handleShowAlternatives(expense)}
                  onEditExpense={() => handleEditExpense(expense)}
                  onDeleteExpense={() => handleDeleteExpense(expense)}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editingExpense && (
        <ExpenseEditDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          expense={editingExpense}
        />
      )}
      
      {/* Alternatives Dialog */}
      {selectedExpense && (
        <AlternativesDialog
          open={showAlternatives}
          onOpenChange={setShowAlternatives}
          expense={selectedExpense}
          alternatives={alternatives}
          targetMet={!!expenses.find(e => e.id === selectedExpense.id)?.selectedAlternative}
        />
      )}
    </div>
  )
}

