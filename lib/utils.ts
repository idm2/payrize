import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function downloadCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const cell = row[header]
          const value = cell === null || cell === undefined ? "" : cell.toString()
          return `"${value.replace(/"/g, '""')}"`
        })
        .join(","),
    ),
  ]

  const csvContent = csvRows.join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function getExampleCSV(): Expense[] {
  return [
    {
      id: "1",
      name: "Netflix Subscription",
      category: "Entertainment",
      amount: 15.99,
      frequency: "Monthly",
      description: "Standard HD streaming plan",
      willingness: "Possible",
      url: "https://netflix.com",
    },
    {
      id: "2",
      name: "Gym Membership",
      category: "Health",
      amount: 49.99,
      frequency: "Monthly",
      description: "Local fitness center membership",
      willingness: "Not Willing",
      url: "",
    },
    {
      id: "3",
      name: "Web Hosting",
      category: "Business",
      amount: 29.99,
      frequency: "Monthly",
      description: "Website hosting on DigitalOcean",
      willingness: "Very Willing",
      url: "https://digitalocean.com",
    },
    {
      id: "4",
      name: "Grocery Shopping",
      category: "Essentials",
      amount: 400,
      frequency: "Monthly",
      description: "Monthly groceries at Whole Foods",
      willingness: "Possible",
      url: "",
    },
    {
      id: "5",
      name: "Car Insurance",
      category: "Insurance",
      amount: 120,
      frequency: "Monthly",
      description: "Full coverage auto insurance",
      willingness: "Not Willing",
      url: "",
    },
  ]
}

export type Expense = {
  id: string
  name: string
  amount: number
  frequency: 'Weekly' | 'Fortnightly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Per Unit'
  quantity?: number // For per-unit expenses, represents number of units per month
  category?: string
  description?: string
  willingness: 'Not Willing' | 'Possible' | 'Very Willing'
  url?: string
  targetAmount?: number
  selectedAlternative?: {
    id: string
    name: string
    price: number
    savings: number
    source?: string
    location?: {
      name?: string
      address?: string
      distance?: string
    }
  }
  alternatives?: AlternativeProduct[]
  manualSavingsPercentage?: number
  notes?: string
  location?: string
  isPhysical?: boolean
  _forceMock?: boolean // Added for development/testing to force mock data generation
}

export type AlternativeProduct = {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  url: string
  savings: number
  selected?: boolean
  source?: string // Where this alternative came from (OpenAI, Brave, etc.)
  confidence?: number // How confident we are about the price accuracy (0-100)
  location?: {
    name?: string
    address?: string
    distance?: string
    rating?: number
    openNow?: boolean
    coords?: {
      lat: number
      lng: number
    }
  } // Physical location information for stores/services
  image?: string // URL to product image
  type?: 'physical' | 'service' | 'subscription' | 'insurance' // Type of product/service
  isOnlineOnly?: boolean // Whether this product is only available online (no physical store)
}

export type SavingsRecommendation = {
  expenseId: string
  expenseName: string
  currentAmount: number
  suggestedAmount: number
  savings: number
  alternativeUrl?: string
  alternativeName?: string
}

// Get category colors from localStorage
export function getCategoryColors(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  
  const stored = localStorage.getItem('categoryColors')
  const colors = stored ? JSON.parse(stored) : {}
  
  // Enforce default category colors
  ensureDefaultCategoryColors(colors);
  
  return colors;
}

// Ensure default categories always have their designated colors
function ensureDefaultCategoryColors(colors: Record<string, string>): void {
  const defaultCategoryColors = {
    "Entertainment": "#9333EA", // Purple
    "Business": "#F97316",      // Orange
    "Health": "#10B981",        // Green
    "Food": "#05C3B6",          // Turquoise
    "Transportation": "#3B82F6", // Blue
    "Utilities": "#6B7280",     // Gray
    "Insurance": "#FF8B6B",     // Dark Peach
  };
  
  // Apply default colors
  Object.entries(defaultCategoryColors).forEach(([category, color]) => {
    // If the category exists but has a different color, update it
    // or if the category doesn't have a color yet, set it
    if (category === "Business" || !colors[category]) {
      colors[category] = color;
    }
  });
}

// Save category colors to localStorage
export function saveCategoryColor(category: string, color: string): void {
  if (typeof window === 'undefined') return
  
  const colors = getCategoryColors()
  
  // Only update if this isn't the Business category or we're setting it to the correct orange
  if (category !== "Business" || color === "#F97316") {
    colors[category] = color
    localStorage.setItem('categoryColors', JSON.stringify(colors))
  } else {
    // For Business category, always use the designated orange color
    colors[category] = "#F97316"
    localStorage.setItem('categoryColors', JSON.stringify(colors))
  }
}

// Get color for a specific category
export function getCategoryColor(category: string): string | undefined {
  return getCategoryColors()[category]
}

/**
 * Calculate normalized monthly amount for expenses based on frequency
 * @param expense The expense to normalize
 * @returns The monthly amount in dollars
 */
export function normalizeToMonthlyAmount(expense: Expense): number {
  if (!expense || !expense.amount) return 0;
  
  switch (expense.frequency) {
    case "Weekly":
      return expense.amount * 4.33; // Average weeks per month
    case "Fortnightly":
      return expense.amount * 2.17; // Average fortnights per month (26 per year ÷ 12)
    case "Monthly":
      return expense.amount;
    case "Quarterly":
      return expense.amount / 3; 
    case "Yearly":
      return expense.amount / 12;
    case "Per Unit":
      // For per-unit, we multiply by quantity (default to 1 if not specified)
      const quantity = expense.quantity || 1;
      return expense.amount * quantity;
    default:
      return expense.amount;
  }
}

/**
 * Calculate monthly savings between two prices based on frequency and quantity
 * @param currentPrice Current price (per unit or per period)
 * @param alternativePrice Alternative price (per unit or per period)
 * @param frequency Frequency of the expense (Weekly, Monthly, etc.)
 * @param quantity For Per Unit items, how many units per month
 * @returns Monthly savings amount
 */
export function calculateMonthlySavings(
  currentPrice: number,
  alternativePrice: number,
  frequency: string,
  quantity: number = 1
): number {
  // Calculate the per-unit or per-period savings first
  const perUnitOrPeriodSavings = Math.max(0, currentPrice - alternativePrice);
  
  // Then convert to monthly based on frequency
  switch (frequency) {
    case "Weekly":
      return perUnitOrPeriodSavings * 4.33; // Average weeks per month
    case "Fortnightly":
      return perUnitOrPeriodSavings * 2.17; // Average fortnights per month
    case "Quarterly":
      return perUnitOrPeriodSavings / 3;
    case "Yearly":
      return perUnitOrPeriodSavings / 12;
    case "Per Unit":
      // For per-unit pricing, multiply by quantity
      return perUnitOrPeriodSavings * quantity;
    case "Monthly":
    default:
      return perUnitOrPeriodSavings;
  }
}

export function calculateSavings(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => {
    if (expense.willingness === "Very Willing") {
      return total + expense.amount * 0.8
    } else if (expense.willingness === "Possible") {
      return total + expense.amount * 0.4
    }
    return total
  }, 0)
}

export function getProgressGradient(percentage: number): string {
  if (percentage <= 20) {
    // Only purple for low percentages
    return "bg-gradient-to-r from-purple-500 to-purple-600"
  } else if (percentage <= 60) {
    // Gradually introduce peach
    const peachPercentage = ((percentage - 20) / 40) * 100
    return `bg-gradient-to-r from-purple-500 via-purple-600 to-[#FF8B6B] bg-[length:${200}%_100%] bg-[100%] animate-gradient`
  } else if (percentage <= 80) {
    // Introduce green
    const greenPercentage = ((percentage - 60) / 20) * 100
    return `bg-gradient-to-r from-purple-600 via-[#FF8B6B] to-green-500 bg-[length:${200}%_100%] bg-[100%] animate-gradient`
  } else {
    // Prominent green for high percentages
    return "bg-gradient-to-r from-[#FF8B6B] to-green-500"
  }
}

// Save localStorage utility for server-side rendering compatibility
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(key)
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, value)
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  }
}

// Plans feature
export type Plan = {
  id: string
  name: string
  createdAt: string
  lastModified: string
  isActive: boolean
  expenses?: Expense[]
  incomeEarners?: Array<{
    id: number
    name: string
    amount: number
  }>
  savingsGoal?: number
  userName?: string
}

// Get all plans
export function getPlans(): Plan[] {
  const plans = safeLocalStorage.getItem('plans')
  return plans ? JSON.parse(plans) : []
}

// Get active plan
export function getActivePlan(): Plan | null {
  const plans = getPlans()
  return plans.find(plan => plan.isActive) || null
}

// Create a new plan
export function createPlan(name: string): Plan {
  const plans = getPlans()
  
  // Deactivate all existing plans first
  const updatedPlans = plans.map(plan => ({
    ...plan,
    isActive: false
  }))
  
  // Create a new plan
  const newPlan: Plan = {
    id: `plan-${Date.now()}`,
    name,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    isActive: true
  }
  
  // Add the new plan to the list
  updatedPlans.push(newPlan)
  
  // Save the updated plans
  safeLocalStorage.setItem('plans', JSON.stringify(updatedPlans))
  
  return newPlan
}

// Set active plan
export function setActivePlan(planId: string): Plan | null {
  const plans = getPlans()
  
  // Update active state for all plans
  const updatedPlans = plans.map(plan => ({
    ...plan,
    isActive: plan.id === planId
  }))
  
  // Save the updated plans
  safeLocalStorage.setItem('plans', JSON.stringify(updatedPlans))
  
  // Return the newly activated plan
  return updatedPlans.find(plan => plan.id === planId) || null
}

// Delete a plan
export function deletePlan(planId: string): boolean {
  const plans = getPlans()
  const planToDelete = plans.find(plan => plan.id === planId)
  
  if (!planToDelete) {
    return false
  }
  
  // Filter out the plan to delete
  const updatedPlans = plans.filter(plan => plan.id !== planId)
  
  // If we're deleting the active plan, make another plan active if available
  if (planToDelete.isActive && updatedPlans.length > 0) {
    updatedPlans[0].isActive = true
  }
  
  // Save the updated plans
  safeLocalStorage.setItem('plans', JSON.stringify(updatedPlans))
  
  return true
}

// Update plan data (sync with localStorage)
export function syncPlanData(planId: string): void {
  const plans = getPlans()
  const planIndex = plans.findIndex(plan => plan.id === planId)
  
  if (planIndex === -1) {
    return
  }
  
  // Get current data from localStorage
  const expenses = safeLocalStorage.getItem('expenses')
  const incomeEarners = safeLocalStorage.getItem('incomeEarners')
  const savingsGoal = safeLocalStorage.getItem('savingsGoal')
  const userName = safeLocalStorage.getItem('userName')
  
  // Update the plan with current data
  plans[planIndex] = {
    ...plans[planIndex],
    lastModified: new Date().toISOString(),
    expenses: expenses ? JSON.parse(expenses) : undefined,
    incomeEarners: incomeEarners ? JSON.parse(incomeEarners) : undefined,
    savingsGoal: savingsGoal ? parseFloat(savingsGoal) : undefined,
    userName: userName || undefined
  }
  
  // Save the updated plans
  safeLocalStorage.setItem('plans', JSON.stringify(plans))
}

// Load plan data (from plan to localStorage)
export function loadPlanData(planId: string): void {
  const plans = getPlans()
  const plan = plans.find(p => p.id === planId)
  
  if (!plan) {
    return
  }
  
  // Set the plan data to localStorage
  if (plan.expenses) {
    safeLocalStorage.setItem('expenses', JSON.stringify(plan.expenses))
  } else {
    safeLocalStorage.removeItem('expenses')
  }
  
  if (plan.incomeEarners) {
    safeLocalStorage.setItem('incomeEarners', JSON.stringify(plan.incomeEarners))
  } else {
    safeLocalStorage.removeItem('incomeEarners')
  }
  
  if (plan.savingsGoal !== undefined) {
    safeLocalStorage.setItem('savingsGoal', plan.savingsGoal.toString())
  } else {
    safeLocalStorage.removeItem('savingsGoal')
  }
  
  if (plan.userName) {
    safeLocalStorage.setItem('userName', plan.userName)
  } else {
    safeLocalStorage.removeItem('userName')
  }
  
  // Dispatch event to notify components that data has changed
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('plansUpdated'))
    window.dispatchEvent(new Event('expensesUpdated'))
  }
}

/**
 * Get all expenses from the active plan
 * @returns Array of expenses
 */
export function getExpenses(): Expense[] {
  // First check if we have any plans
  const activePlan = getActivePlan();
  
  // If we have an active plan with expenses, use those
  if (activePlan && activePlan.expenses) {
    return activePlan.expenses;
  }
  
  // Otherwise fallback to direct localStorage access (legacy support)
  const expenses = safeLocalStorage.getItem("expenses");
  if (!expenses) return [];
  
  return JSON.parse(expenses);
}

/**
 * Save expenses to the active plan
 * @param expenses Array of expenses to save
 */
export function saveExpenses(expenses: Expense[]): void {
  // Save to localStorage (for immediate UI updates)
  safeLocalStorage.setItem("expenses", JSON.stringify(expenses));
  
  // Then save to the active plan if available
  const activePlan = getActivePlan();
  if (activePlan) {
    // Get current plans
    const plans = getPlans();
    
    // Find the active plan to update
    const planIndex = plans.findIndex(p => p.id === activePlan.id);
    if (planIndex !== -1) {
      // Update plan data
      plans[planIndex] = {
        ...plans[planIndex],
        expenses,
        lastModified: new Date().toISOString()
      };
      
      // Save updated plans
      safeLocalStorage.setItem("plans", JSON.stringify(plans));
    }
  }
  
  // Trigger events to notify components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('expensesUpdated'));
  }
}

