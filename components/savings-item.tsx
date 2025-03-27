import { ExternalLink, RefreshCw, Edit, Trash2, Sliders, MapPin, User, Car } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency, type Expense, calculateMonthlySavings } from "@/lib/utils"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LocationInfo {
  name: string
  address: string
  distance: string
  latitude?: number
  longitude?: number
  placeId?: string
}

interface SavingsItemProps {
  expense: Expense
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (expense: Expense) => void
  onShowAlternatives: (expense: Expense) => void
}

export function SavingsItem({ expense, onEditExpense, onDeleteExpense, onShowAlternatives }: SavingsItemProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [savingsPercentage, setSavingsPercentage] = useState(
    expense.manualSavingsPercentage || 0
  );
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Dispatch a custom event to refresh alternatives
      const event = new CustomEvent('refreshAlternatives', { detail: { expenseId: expense.id } });
      window.dispatchEvent(event);
      
      // Show alternatives after refreshing
      onShowAlternatives(expense);
    } catch (error) {
      console.error('Error refreshing alternatives:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getMonthlySavings = () => {
    // If using manual savings
    if (expense.manualSavingsPercentage && expense.manualSavingsPercentage > 0) {
      const monthlySavings = calculateMonthlySavings(
        expense.amount,
        expense.amount * (1 - expense.manualSavingsPercentage / 100),
        expense.frequency,
        expense.quantity || 1
      );
      return monthlySavings;
    }
    
    // If using alternative
    if (expense.selectedAlternative) {
      const monthlySavings = calculateMonthlySavings(
        expense.amount,
        expense.selectedAlternative.price,
        expense.frequency,
        expense.quantity || 1
      );
      return monthlySavings;
    }
    
    return 0;
  };

  const getFrequencyDisplay = () => {
    if (expense.frequency === "Per Unit") {
      return `${formatCurrency(expense.amount)}/unit × ${expense.quantity || 1} units`;
    } else {
      return `${formatCurrency(expense.amount)}/${expense.frequency.toLowerCase()}`;
    }
  };

  const handleEdit = () => {
    onEditExpense(expense);
  };

  const handleDelete = () => {
    onDeleteExpense(expense);
  };
  
  const handleManualSavings = () => {
    setShowManualDialog(true);
    setSavingsPercentage(expense.manualSavingsPercentage || 0);
  };
  
  const saveManualSavings = () => {
    try {
      // Get current expenses
      const savedExpenses = localStorage.getItem("expenses");
      if (!savedExpenses) {
        throw new Error("No expenses found");
      }
      
      const expenses = JSON.parse(savedExpenses);
      
      // Update the expense with manual savings
      const updatedExpenses = expenses.map((e: Expense) => {
        if (e.id === expense.id) {
          // If we're setting manual savings, clear any selected alternative
          return {
            ...e,
            manualSavingsPercentage: savingsPercentage,
            selectedAlternative: savingsPercentage > 0 ? undefined : e.selectedAlternative,
            targetAmount: savingsPercentage > 0 
              ? e.amount * (1 - savingsPercentage / 100) 
              : e.targetAmount,
            willingness: savingsPercentage > 0 ? "Very Willing" : e.willingness
          };
        }
        return e;
      });
      
      // Save to localStorage
      localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
      
      // Dispatch event
      window.dispatchEvent(new Event('expensesUpdated'));
      
      // Close dialog
      setShowManualDialog(false);
      
      // Show toast
      toast({
        title: "Savings Updated",
        description: savingsPercentage > 0
          ? `Manual savings of ${savingsPercentage}% set for ${expense.name}`
          : `Manual savings removed from ${expense.name}`
      });
      
    } catch (error) {
      console.error("Error updating manual savings:", error);
      toast({
        title: "Error",
        description: "Failed to update manual savings",
        variant: "destructive"
      });
    }
  };

  const cancelManualSavings = () => {
    setShowManualDialog(false);
  };

  const hasSavings = (expense.selectedAlternative && getMonthlySavings() > 0) || 
                    (expense.manualSavingsPercentage && expense.manualSavingsPercentage > 0);
  
  // Check if we have location information (from a selected alternative)
  const hasLocationInfo = expense.selectedAlternative && 
                         (typeof expense.selectedAlternative.location === 'object' || 
                          expense.alternatives?.some(alt => 
                            alt.id === expense.selectedAlternative?.id && alt.location));
  
  // Get location info if available
  const getLocationInfo = (): LocationInfo | null => {
    if (!expense.selectedAlternative) return null;
    
    // First try to get location directly from the selectedAlternative
    if (expense.selectedAlternative.location && 
        typeof expense.selectedAlternative.location === 'object' &&
        'name' in expense.selectedAlternative.location) {
      return expense.selectedAlternative.location as LocationInfo;
    }
    
    // If not available, look for it in the alternatives array
    const selectedAlt = expense.alternatives?.find(alt => 
      alt.id === expense.selectedAlternative?.id
    );
    
    // Make sure location is an object with the expected properties
    const location = selectedAlt?.location;
    
    if (!location || typeof location === 'string' || !('name' in location)) {
      return null;
    }
    
    return location as LocationInfo;
  };
  
  const locationInfo = getLocationInfo();
  
  // Parse distance as a number for sorting/display
  const parseDistance = (distanceStr: string | undefined): number => {
    if (!distanceStr) return Infinity;
    
    const match = distanceStr.match(/(\d+(?:\.\d+)?)/);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
    return Infinity;
  }
  
  // Format distance for display
  const formatDistance = (distance: string | undefined): string => {
    if (!distance) return "Unknown distance";
    
    // Parse numeric value
    const distanceNum = parseDistance(distance);
    
    // Format based on distance range
    if (distanceNum < 0.1) {
      return "Very close by";
    } else if (distanceNum < 1) {
      return `${(distanceNum * 1000).toFixed(0)}m away`;
    } else if (distanceNum < 10) {
      return `${distanceNum.toFixed(1)}km away`;
    } else {
      return `${distanceNum.toFixed(0)}km away`;
    }
  }
  
  // Determine if distance is walkable (< 2km)
  const isWalkable = (distance: string | undefined): boolean => {
    const distanceNum = parseDistance(distance);
    return distanceNum < 2;
  }
  
  // Determine if distance is close (< 5km)
  const isClose = (distance: string | undefined): boolean => {
    const distanceNum = parseDistance(distance);
    return distanceNum < 5 && distanceNum >= 2;
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-bold">{expense.name}</CardTitle>
              <CardDescription>
                {getFrequencyDisplay()}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1">
              {expense.selectedAlternative && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  Alternative Selected
                </Badge>
              )}
              {expense.manualSavingsPercentage && expense.manualSavingsPercentage > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Sliders className="h-3 w-3 mr-1" />
                  Manual: {expense.manualSavingsPercentage}%
                </Badge>
              )}
              {locationInfo && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  <MapPin className="h-3 w-3 mr-1" />
                  Store Location Available
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {hasSavings && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Potential Savings</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(getMonthlySavings())}/month
                </span>
              </div>
              <Progress value={75} className="h-2" />
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md border border-blue-100">
                {expense.manualSavingsPercentage && expense.manualSavingsPercentage > 0 ? (
                  <>Manual savings of {expense.manualSavingsPercentage}% = {formatCurrency(getMonthlySavings())}/month</>
                ) : expense.frequency === "Per Unit" ? (
                  <>Saves {formatCurrency(expense.amount - (expense.selectedAlternative?.price || 0))}/unit × {expense.quantity || 1} units = {formatCurrency(getMonthlySavings())}/month</>
                ) : expense.frequency === "Weekly" ? (
                  <>Saves {formatCurrency(expense.amount - (expense.selectedAlternative?.price || 0))}/week × 4.33 weeks = {formatCurrency(getMonthlySavings())}/month</>
                ) : expense.frequency === "Fortnightly" ? (
                  <>Saves {formatCurrency(expense.amount - (expense.selectedAlternative?.price || 0))}/fortnight × 2.17 fortnights = {formatCurrency(getMonthlySavings())}/month</>
                ) : expense.frequency === "Quarterly" ? (
                  <>Saves {formatCurrency(expense.amount - (expense.selectedAlternative?.price || 0))}/quarter ÷ 3 = {formatCurrency(getMonthlySavings())}/month</>
                ) : expense.frequency === "Yearly" ? (
                  <>Saves {formatCurrency(expense.amount - (expense.selectedAlternative?.price || 0))}/year ÷ 12 = {formatCurrency(getMonthlySavings())}/month</>
                ) : (
                  <>Saves {formatCurrency(getMonthlySavings())}/month</>
                )}
              </div>
            </div>
          )}
          
          {/* Show location info if available */}
          {locationInfo && (
            <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-md">
              <div className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5 text-purple-600" />
                <div className="text-sm">
                  <div className="font-medium text-purple-800">{locationInfo.name}</div>
                  <div className="text-purple-700">{locationInfo.address}</div>
                  <div className="flex items-center mt-1.5 text-xs">
                    {isWalkable(locationInfo.distance) ? (
                      <>
                        <User className="h-3 w-3 mr-1 text-green-600" />
                        <span className="text-green-700 font-medium">{formatDistance(locationInfo.distance)}</span>
                        <span className="text-purple-600 ml-1">- walkable distance</span>
                      </>
                    ) : isClose(locationInfo.distance) ? (
                      <>
                        <Car className="h-3 w-3 mr-1 text-amber-600" />
                        <span className="text-amber-700 font-medium">{formatDistance(locationInfo.distance)}</span>
                        <span className="text-purple-600 ml-1">- short drive</span>
                      </>
                    ) : (
                      <>
                        <Car className="h-3 w-3 mr-1 text-purple-600" />
                        <span className="text-purple-700 font-medium">{formatDistance(locationInfo.distance)}</span>
                        <span className="text-purple-600 ml-1">from your location</span>
                      </>
                    )}
                  </div>
                  
                  {/* Add directions link if we have the address */}
                  {locationInfo.address && (
                    <div className="mt-2">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationInfo.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Get Directions
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {!hasSavings && expense.selectedAlternative && (
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">No monthly savings with selected alternative</span>
            </div>
          )}
          
          {!hasSavings && !expense.selectedAlternative && (
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">No alternative selected yet</span>
            </div>
          )}
        </CardContent>
        <Separator />
        <CardFooter className="pt-4 flex justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <>Refreshing...</>
              ) : (
                <>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Alternatives
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleManualSavings}>
              <Sliders className="h-3.5 w-3.5 mr-1" />
              Manual Savings
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              <Edit className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Manual Savings Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Set Manual Savings</DialogTitle>
            <DialogDescription>
              If you don't want to use suggested alternatives, you can manually set how much you plan to save on this expense.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Current expense: {getFrequencyDisplay()}</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">Savings percentage:</span>
                <span className="font-medium">{savingsPercentage}%</span>
              </div>
              <Slider
                value={[savingsPercentage]}
                onValueChange={(values) => setSavingsPercentage(values[0])}
                max={100}
                step={1}
              />
            </div>
            
            <div className="space-y-1 p-3 bg-blue-50 rounded-md">
              <div className="flex justify-between text-sm">
                <span>Original amount:</span>
                <span className="font-medium">{formatCurrency(expense.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>With {savingsPercentage}% savings:</span>
                <span className="font-medium">{formatCurrency(expense.amount * (1 - savingsPercentage / 100))}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-green-600">
                <span>Monthly savings:</span>
                <span>
                  {formatCurrency(
                    calculateMonthlySavings(
                      expense.amount,
                      expense.amount * (1 - savingsPercentage / 100),
                      expense.frequency,
                      expense.quantity || 1
                    )
                  )}
                </span>
              </div>
            </div>
            
            {/* Explain benefit of manual saving */}
            <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-md text-sm text-yellow-800">
              <p className="font-medium mb-1">Why use manual savings?</p>
              <p>
                Use this option when you know you can reduce this expense without changing providers,
                such as by reducing usage, negotiating a better rate, or finding your own alternative.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={cancelManualSavings}>Cancel</Button>
            <Button onClick={saveManualSavings}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 