import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, Plus, Check, MapPin, RefreshCw, Globe, Building2 } from "lucide-react"
import { formatCurrency, calculateMonthlySavings, type AlternativeProduct, type Expense } from "@/lib/utils"
import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface AlternativesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense
  alternatives: AlternativeProduct[]
  targetMet: boolean
}

// Add new StoreInfo component to display store/provider information
function StoreInfo({ alternative }: { alternative: AlternativeProduct }) {
  if (!alternative) return null;
  
  // For physical products with a store location
  if (alternative.location && alternative.type === 'physical') {
    return (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
        <div className="flex items-start">
          <MapPin className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="font-medium text-blue-800 dark:text-blue-300">{alternative.location.name}</div>
            <div className="text-blue-700 dark:text-blue-400">{alternative.location.address}</div>
            {alternative.location.distance && (
              <div className="text-sm text-blue-600 dark:text-blue-500 mt-1 font-medium">
                {alternative.location.distance} from your location
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // For online-only products
  if (alternative.type === 'physical' && alternative.isOnlineOnly) {
    return (
      <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg">
        <div className="flex items-start">
          <Globe className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
          <div>
            <div className="font-medium text-purple-800 dark:text-purple-300">Online Store</div>
            <div className="text-purple-700 dark:text-purple-400">
              Available at {alternative.source || 'Online Retailer'}
            </div>
            <a 
              href={alternative.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-purple-600 dark:text-purple-500 mt-1 hover:underline"
            >
              Visit Website →
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // For services (subscription, insurance, etc.)
  if (alternative.type === 'service' || alternative.type === 'subscription' || alternative.type === 'insurance') {
    return (
      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg">
        <div className="flex items-start">
          <Building2 className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
          <div>
            <div className="font-medium text-green-800 dark:text-green-300">Service Provider</div>
            <div className="text-green-700 dark:text-green-400">{alternative.source}</div>
            {alternative.url && (
              <a 
                href={alternative.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-green-600 dark:text-green-500 mt-1 hover:underline"
              >
                View Service Details →
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}

export function AlternativesDialog({ open, onOpenChange, expense, alternatives, targetMet }: AlternativesDialogProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string | null>(null)
  const [forceUpdate, setForceUpdate] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)
  const [searchStatus, setSearchStatus] = useState<string>('')
  const [searchSources, setSearchSources] = useState<{[key: string]: {status: string, progress: number, message?: string, count?: number}}>({})

  // Listen for search progress events
  useEffect(() => {
    const handleSearchProgress = (event: CustomEvent) => {
      const { source, status, progress, message, count } = event.detail;
      
      // Update the source's status
      setSearchSources(prev => ({
        ...prev,
        [source]: { status, progress, message, count }
      }));
      
      // Use the current progress for simplicity
      setSearchProgress(progress);
      
      // Set status message based on current activity
      if (status === 'error') {
        setSearchStatus(`Error: ${message || 'Failed to find alternatives'}`);
      } else if (status === 'completed' && count && count > 0) {
        setSearchStatus(`Found ${count} options from ${source}`);
      } else if (status === 'searching') {
        setSearchStatus(`Searching for the best alternatives...`);
      } else if (status === 'processing') {
        setSearchStatus(`Processing results...`);
      } else if (status === 'formatting') {
        setSearchStatus(`Preparing your alternatives...`);
      }
    };

    // Add event listener
    window.addEventListener('search-progress', handleSearchProgress as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('search-progress', handleSearchProgress as EventListener);
    };
  }, [searchSources]);

  // Load expenses from localStorage
  const loadExpenses = useCallback(() => {
    try {
      const savedExpenses = localStorage.getItem("expenses")
      if (savedExpenses) {
        const parsedExpenses = JSON.parse(savedExpenses)
        return parsedExpenses
      }
    } catch (error) {
      console.error("Error loading expenses:", error)
    }
    return []
  }, [])

  // Initialize state when dialog opens or when forceUpdate changes
  useEffect(() => {
    if (!open) return // Only run when dialog is open
    
    const parsedExpenses = loadExpenses()
    setExpenses(parsedExpenses)
    
    // Find the current expense and check if it has a selected alternative
    const currentExpense = parsedExpenses.find((e: Expense) => e.id === expense.id)
    
    if (currentExpense?.selectedAlternative?.id) {
      setSelectedAlternativeId(currentExpense.selectedAlternative.id)
    } else {
      setSelectedAlternativeId(null)
    }
  }, [expense.id, open, loadExpenses, forceUpdate])

  // Function to add an alternative to the savings plan
  const addToSavingsPlan = (alternative: AlternativeProduct) => {
    try {
      // Calculate savings
      const savings = expense.amount - alternative.price
      
      // Check if this alternative is already selected
      const isCurrentlySelected = selectedAlternativeId === alternative.id
      
      // New selected ID (null if toggling off, or the alternative ID if selecting)
      const newSelectedId = isCurrentlySelected ? null : alternative.id
      
      // Get latest expenses to ensure we're working with the most current data
      const currentExpenses = loadExpenses()
      
      // Update expenses
      const updatedExpenses = currentExpenses.map((e: Expense) => {
        if (e.id === expense.id) {
          // Create the updated expense object
          const updatedExpense = { 
            ...e, 
            selectedAlternative: isCurrentlySelected 
              ? undefined 
              : {
                  id: alternative.id,
                  name: alternative.name,
                  price: alternative.price,
                  savings: savings,
                  source: alternative.source
                },
            targetAmount: isCurrentlySelected 
              ? undefined 
              : alternative.price,
            // Ensure willingness is set to at least "Possible" when an alternative is selected
            willingness: isCurrentlySelected 
              ? e.willingness 
              : (e.willingness === "Not Willing" ? "Possible" : e.willingness)
          };
          
          console.log("Updated expense:", updatedExpense);
          return updatedExpense;
        }
        return e;
      });
      
      // Save to localStorage
      localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('expensesUpdated'));
      
      // Update state
      setSelectedAlternativeId(newSelectedId);
      setExpenses(updatedExpenses);
      
      // Force a refresh to ensure UI updates correctly
      setForceUpdate(prev => prev + 1);
      
      // If we're adding a new alternative (not toggling off), close the modal
      if (!isCurrentlySelected) {
        // Close the modal after a short delay to allow the user to see the selection
        setTimeout(() => {
          onOpenChange(false);
        }, 300);
      }
    } catch (error) {
      console.error("Error adding alternative to savings plan:", error);
    }
  }

  // Function to refresh alternatives
  const refreshAlternatives = async () => {
    try {
      // Show loading state
      setRefreshing(true);
      setSearchStatus('Initializing search');
      setSearchProgress(5);
      
      // Reset search sources
      setSearchSources({});
      
      // Find the full expense object
      const fullExpense = expenses.find((e: Expense) => e.id === expense.id);
      
      if (!fullExpense) {
        throw new Error("Expense not found");
      }
      
      // Call the API to fetch new alternatives
      const response = await fetch("/api/alternatives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expense: fullExpense }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch alternatives");
      }
      
      const data = await response.json();
      const newAlternatives = Array.isArray(data) ? data : data.alternatives || [];
      
      if (newAlternatives.length === 0) {
        toast({
          title: "No alternatives found",
          description: "No alternatives found for this expense",
          variant: "default"
        });
        return;
      }
      
      if (newAlternatives && newAlternatives.length > 0) {
        // Get current expenses from localStorage
        const currentExpenses = loadExpenses();
        
        // Update the expense with new alternatives
        const updatedExpenses = currentExpenses.map((e: Expense) => {
          if (e.id === expense.id) {
            return {
              ...e,
              alternatives: newAlternatives,
            };
          }
          return e;
        });
        
        // Save to localStorage
        localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
        
        // Trigger refresh
        window.dispatchEvent(new Event('expensesUpdated'));
        setForceUpdate(prev => prev + 1);
        
        // Final progress
        setSearchProgress(100);
        
        // Show success toast
        toast({
          title: "Alternatives Updated",
          description: `Found ${newAlternatives.length} alternatives for ${expense.name}`,
        });
      } else {
        // Show warning if no alternatives found
        toast({
          title: "No new alternatives found",
          description: "Try again later or modify your expense description",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error refreshing alternatives:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh alternatives",
        variant: "destructive",
      });
    } finally {
      // Short delay before hiding loading state to show 100% completion
      setTimeout(() => {
        setRefreshing(false);
      }, 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle>Alternatives for {expense.name}</DialogTitle>
            <DialogDescription>
              {expenses.find((e: Expense) => e.id === expense.id)?.frequency === "Per Unit" ? (
                <>
                  Current price: {formatCurrency(expense.amount)}/unit × 
                  {expenses.find((e: Expense) => e.id === expense.id)?.quantity || 1} units = 
                  {formatCurrency(expense.amount * (expenses.find((e: Expense) => e.id === expense.id)?.quantity || 1))}/month
                </>
              ) : (
                <>Current expense: {formatCurrency(expense.amount)}</>
              )}
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={refreshAlternatives}
            disabled={refreshing}
            className="h-8 w-8"
            title="Update alternatives"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Update alternatives</span>
          </Button>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {refreshing ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                </div>
                <svg className="animate-spin-slow" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-purple-100 dark:text-purple-900/30"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - searchProgress / 100)}
                    className="text-purple-600 dark:text-purple-400"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
              </div>
              <span className="text-lg font-medium mb-2">{searchStatus}</span>
              <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                <div 
                  className="bg-purple-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${searchProgress}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{searchProgress}% complete</span>
              
              {/* Source-specific progress indicators */}
              {Object.entries(searchSources).length > 0 && (
                <div className="mt-4 w-80 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Sources</h4>
                  
                  {Object.entries(searchSources).map(([source, info]) => (
                    <div key={source} className="mb-2 last:mb-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium capitalize">
                          {source === 'firecrawl' ? 'Product Search' : 
                           source === 'brave' ? 'Web Search' : 
                           source === 'openai' ? 'AI Analysis' : source}
                        </span>
                        <span className="text-xs">
                          {info.status === 'completed' && info.count ? 
                            `${info.count} found` : 
                            info.status === 'error' ? 
                            'Error' : 
                            `${info.progress}%`}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                            info.status === 'error' ? 'bg-red-500' :
                            info.status === 'completed' ? 'bg-green-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${info.progress}%` }}
                        ></div>
                      </div>
                      {info.status === 'error' && info.message && (
                        <p className="text-xs text-red-500 mt-1">{info.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-4 max-w-md">
                We're searching across multiple sources to find you the best alternatives for {expense.name}. 
                This might take a moment as we compare prices and check availability.
              </p>
            </div>
          ) : alternatives.length > 0 ? (
            alternatives.map((alt) => {
              // Check if this specific alternative is selected by comparing IDs
              const isSelected = selectedAlternativeId === alt.id
              
              return (
                <div 
                  key={alt.id} 
                  className={cn(
                    "grid gap-2 p-4 rounded-lg border",
                    isSelected 
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" 
                      : "bg-white dark:bg-card"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {/* Show store name in title if available */}
                        {alt.source && (
                          <span className="text-blue-600 dark:text-blue-400">{alt.source}: </span>
                        )}
                        {alt.name.replace(`${alt.source}: `, '')} {/* Remove duplicate store name if already prefixed */}
                      </h3>
                      {alt.type === 'physical' && alt.isOnlineOnly && (
                        <Badge variant="outline" className="mt-1">Online Only</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={alt.url} target="_blank" rel="noopener noreferrer">
                          View <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  {alt.description && (
                    <p className="text-sm text-muted-foreground mt-1">{alt.description}</p>
                  )}
                  <StoreInfo alternative={alt} />
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Price:</span>
                      <div className="flex items-center">
                        {/* Display price appropriately based on frequency */}
                        {expenses.find((e: Expense) => e.id === expense.id)?.frequency === "Per Unit" ? (
                          <span className="font-bold">{formatCurrency(alt.price)}/unit</span>
                        ) : (
                          <span className="font-bold">
                            {formatCurrency(alt.price)}
                            {expenses.find((e: Expense) => e.id === expense.id)?.frequency ? 
                              `/${expenses.find((e: Expense) => e.id === expense.id)?.frequency.toLowerCase()}` : 
                              ""}
                          </span>
                        )}
                        {alt.source && (
                          <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">
                            via {alt.source}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Show unit price savings for Per Unit items */}
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold">
                        {expenses.find((e: Expense) => e.id === expense.id)?.frequency === "Per Unit" ? 
                          "Per Unit Savings:" : 
                          "Savings:"}
                      </span>
                      <span className="font-bold text-green-600 dark:text-green-500">
                        {formatCurrency(expense.amount - alt.price)}
                        {expenses.find((e: Expense) => e.id === expense.id)?.frequency === "Per Unit" ? 
                          "/unit" : 
                          `/${expenses.find((e: Expense) => e.id === expense.id)?.frequency?.toLowerCase() || "month"}`
                        }
                      </span>
                    </div>
                    
                    {/* Add monthly calculation for all expenses */}
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold">Monthly Savings:</span>
                      <span className="font-bold text-green-600 dark:text-green-500">
                        {formatCurrency(
                          calculateMonthlySavings(
                            expense.amount,
                            alt.price,
                            expenses.find((e: Expense) => e.id === expense.id)?.frequency || "Monthly",
                            expenses.find((e: Expense) => e.id === expense.id)?.quantity || 1
                          )
                        )}/month
                      </span>
                    </div>

                    {/* Add explanation for how monthly savings are calculated */}
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {expenses.find((e: Expense) => e.id === expense.id)?.frequency === "Per Unit" 
                          ? `Monthly calculation: ${formatCurrency(expense.amount - alt.price)}/unit × ${expenses.find((e: Expense) => e.id === expense.id)?.quantity || 1} units = ${formatCurrency(
                              calculateMonthlySavings(
                                expense.amount,
                                alt.price,
                                expenses.find((e: Expense) => e.id === expense.id)?.frequency || "Monthly",
                                expenses.find((e: Expense) => e.id === expense.id)?.quantity || 1
                              )
                            )}/month`
                          : expenses.find((e: Expense) => e.id === expense.id)?.frequency === "Weekly"
                          ? `Monthly calculation: ${formatCurrency(expense.amount - alt.price)}/week × 4.33 weeks = ${formatCurrency(
                              calculateMonthlySavings(
                                expense.amount,
                                alt.price,
                                expenses.find((e: Expense) => e.id === expense.id)?.frequency || "Monthly",
                                expenses.find((e: Expense) => e.id === expense.id)?.quantity || 1
                              )
                            )}/month`
                          : expenses.find((e: Expense) => e.id === expense.id)?.frequency === "Quarterly"
                          ? `Monthly calculation: ${formatCurrency(expense.amount - alt.price)}/quarter ÷ 3 = ${formatCurrency(
                              calculateMonthlySavings(
                                expense.amount,
                                alt.price,
                                expenses.find((e: Expense) => e.id === expense.id)?.frequency || "Monthly",
                                expenses.find((e: Expense) => e.id === expense.id)?.quantity || 1
                              )
                            )}/month`
                          : expenses.find((e: Expense) => e.id === expense.id)?.frequency === "Yearly"
                          ? `Monthly calculation: ${formatCurrency(expense.amount - alt.price)}/year ÷ 12 = ${formatCurrency(
                              calculateMonthlySavings(
                                expense.amount,
                                alt.price,
                                expenses.find((e: Expense) => e.id === expense.id)?.frequency || "Monthly",
                                expenses.find((e: Expense) => e.id === expense.id)?.quantity || 1
                              )
                            )}/month`
                          : `Monthly savings calculated based on your frequency: ${expenses.find((e: Expense) => e.id === expense.id)?.frequency}`
                        }
                      </p>
                    </div>
                    
                    {/* Display confidence information */}
                    {typeof alt.confidence === 'number' && (
                      <div className="mt-1">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Price Confidence:</span>
                          <span>
                            {alt.confidence >= 70 ? 'High' : 
                            alt.confidence >= 40 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              alt.confidence >= 70 ? 'bg-green-500' : 
                              alt.confidence >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${alt.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Add disclaimer about pricing */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                      Prices shown are estimates and may vary. Please verify current pricing on the provider's website.
                    </p>
                  </div>
                  
                  {/* View on Provider Site button */}
                  {alt.url && (
                    <div className="mt-3">
                      <a
                        href={alt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                      >
                        View on Provider Site
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    {isSelected ? (
                      <Button 
                        variant="outline"
                        className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                        size="sm"
                        onClick={() => addToSavingsPlan(alt)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        <span className="text-xs">Added</span>
                      </Button>
                    ) : (
                      <Button 
                        variant="gradient"
                        size="sm"
                        onClick={() => addToSavingsPlan(alt)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        <span className="text-xs">Add to Plan</span>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex items-center justify-center p-8">
              <span>No alternatives found. Please add a new expense.</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

