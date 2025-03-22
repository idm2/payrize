// This file will handle all storage-related operations

const STORAGE_KEY = "payrize_data"

export interface UserData {
  incomeEarners: { id: number; name: string; amount: number }[]
  country: string
  suburb: string
  expenses: any[] // You'll need to define a proper type for expenses
}

export function saveUserData(data: UserData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getUserData(): UserData | null {
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : null
}

export function clearUserData(): void {
  localStorage.removeItem(STORAGE_KEY)
}

