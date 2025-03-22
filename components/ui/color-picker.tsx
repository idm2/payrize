"use client"

import * as React from "react"
import { Check, Paintbrush } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// Theme colors from the palette
export const THEME_COLORS = [
  { name: "Teal", value: "#2DD4BF" },
  { name: "Blue", value: "#38BDF8" },
  { name: "Purple", value: "#6366F1" },
  { name: "Pink", value: "#EC4899" },
  { name: "Orange", value: "#FB923C" },
]

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [customColor, setCustomColor] = React.useState(value || "")

  // Update custom color when value changes externally
  React.useEffect(() => {
    if (value && !THEME_COLORS.some(color => color.value === value)) {
      setCustomColor(value)
    }
  }, [value])

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setCustomColor(newColor)
    
    // Only update if it's a valid hex color
    if (/^#([0-9A-F]{3}){1,2}$/i.test(newColor)) {
      onChange(newColor)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("w-full justify-between", className)}
          style={{ backgroundColor: value ? `${value}20` : undefined }}
        >
          <div className="flex items-center gap-2">
            {value && (
              <div 
                className="h-4 w-4 rounded-full border" 
                style={{ backgroundColor: value }}
              />
            )}
            <span>{value ? (THEME_COLORS.find(c => c.value === value)?.name || 'Custom') : "Select color"}</span>
          </div>
          <Paintbrush className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-3">
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {THEME_COLORS.map((color) => (
              <button
                key={color.value}
                className={cn(
                  "h-8 w-full rounded-md border flex items-center justify-center",
                  value === color.value && "ring-2 ring-offset-2 ring-offset-background"
                )}
                style={{ backgroundColor: color.value }}
                onClick={() => onChange(color.value)}
                type="button"
                title={color.name}
              >
                {value === color.value && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
          
          <div className="flex flex-col space-y-1">
            <label className="text-xs">Custom color</label>
            <div className="flex gap-2">
              <div 
                className="h-8 w-8 rounded-md border" 
                style={{ backgroundColor: customColor }}
              />
              <Input
                value={customColor}
                onChange={handleCustomColorChange}
                className="h-8"
                placeholder="#RRGGBB"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 