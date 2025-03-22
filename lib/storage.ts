// This file will handle all storage-related operations
import { safeLocalStorage } from "@/lib/utils"

const STORAGE_KEY = "payrize_data"

export interface UserData {
  incomeEarners: { id: number; name: string; amount: number }[]
  country: string
  suburb: string
  expenses: any[] // You'll need to define a proper type for expenses
}

export function saveUserData(data: UserData): void {
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getUserData(): UserData | null {
  const data = safeLocalStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : null
}

export function clearUserData(): void {
  safeLocalStorage.removeItem(STORAGE_KEY)
}

