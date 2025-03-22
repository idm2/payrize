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
  frequency: string
  category: string
  description?: string
  willingness: "Possible" | "Not Willing" | "Very Willing"
  url?: string
  targetAmount?: number
  alternatives?: AlternativeProduct[]
  location?: string
  selectedAlternative?: {
    id: string
    name: string
    price: number
    savings: number
    source?: string
  }
  color?: string // Category color
}

export type AlternativeProduct = {
  id: string
  name: string
  description: string
  price: number
  url: string
  savings: number
  selected?: boolean
  source?: string // Where this alternative came from (OpenAI, Brave, etc.)
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

// Store category colors in localStorage
export function getCategoryColors(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  
  const stored = localStorage.getItem('categoryColors')
  return stored ? JSON.parse(stored) : {}
}

// Save category colors to localStorage
export function saveCategoryColor(category: string, color: string): void {
  if (typeof window === 'undefined') return
  
  const colors = getCategoryColors()
  colors[category] = color
  localStorage.setItem('categoryColors', JSON.stringify(colors))
}

// Get color for a specific category
export function getCategoryColor(category: string): string | undefined {
  return getCategoryColors()[category]
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

// Safe localStorage utility for server-side rendering compatibility
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

