"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface SuburbComboboxProps {
  country: string
  value: string
  onChange: (value: string) => void
}

export function SuburbCombobox({ country, value, onChange }: SuburbComboboxProps) {
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [inputValue, setInputValue] = React.useState(value)
  const timeoutRef = React.useRef<NodeJS.Timeout>()

  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  // Function to fetch suburbs based on search input
  const searchSuburbs = async (search: string) => {
    if (!country || !search || search.length < 2) {
      setSuggestions([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      console.log("Fetching suburbs for:", { country, search }) // Debug log
      const response = await fetch(
        `/api/suburbs?country=${encodeURIComponent(country)}&search=${encodeURIComponent(search)}`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log("API response:", data) // Debug log
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setSuggestions(data.suburbs || [])
      
      if (data.suburbs?.length === 0) {
        setError("No suburbs found")
      }
    } catch (error) {
      console.error("Error fetching suburbs:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch suburbs")
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setError(null)
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set a new timeout to search after 300ms of no typing
    timeoutRef.current = setTimeout(() => {
      searchSuburbs(newValue)
    }, 300)
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    setInputValue(suggestion)
    setSuggestions([])
    setError(null)
  }

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder={country ? "Start typing to search suburbs..." : "Select a country first"}
        disabled={!country}
        className="w-full"
      />
      {loading && (
        <div className="absolute w-full bg-background border rounded-md mt-1 p-2 shadow-lg z-50">
          Loading suburbs...
        </div>
      )}
      {!loading && error && (
        <div className="absolute w-full bg-background border rounded-md mt-1 p-2 shadow-lg z-50 text-destructive">
          {error}
        </div>
      )}
      {!loading && !error && suggestions.length > 0 && (
        <ul className="absolute w-full bg-background border rounded-md mt-1 shadow-lg z-50 max-h-[200px] overflow-y-auto">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion}
              className={cn(
                "px-4 py-2 cursor-pointer hover:bg-accent",
                suggestion === value && "bg-accent"
              )}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

