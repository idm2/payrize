"use client"

import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ModeToggle } from "@/components/mode-toggle"
import { SuburbCombobox } from "@/components/suburb-combobox"

interface IncomeEarner {
  id: number
  name: string
  amount: number
}

export default function SettingsPage() {
  const [country, setCountry] = useState("")
  const [suburb, setSuburb] = useState("")
  const [incomeEarners, setIncomeEarners] = useState<IncomeEarner[]>([
    { id: 1, name: "", amount: 0 }
  ])
  const { toast } = useToast()

  const countries = ["Australia", "United States", "Canada", "United Kingdom", "New Zealand"]

  useEffect(() => {
    // Load saved settings from localStorage
    const savedCountry = localStorage.getItem("userCountry")
    const savedSuburb = localStorage.getItem("userSuburb")
    const savedIncomeEarners = localStorage.getItem("incomeEarners")

    if (savedCountry) setCountry(savedCountry)
    if (savedSuburb) setSuburb(savedSuburb)
    if (savedIncomeEarners) {
      try {
        setIncomeEarners(JSON.parse(savedIncomeEarners))
      } catch (e) {
        console.error("Error loading income earners:", e)
      }
    }
  }, [])

  const handleSaveSettings = () => {
    localStorage.setItem("userCountry", country)
    localStorage.setItem("userSuburb", suburb)
    localStorage.setItem("incomeEarners", JSON.stringify(incomeEarners))
    
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    })
  }

  const addIncomeEarner = () => {
    setIncomeEarners([
      ...incomeEarners,
      { id: Date.now(), name: "", amount: 0 }
    ])
  }

  const removeIncomeEarner = (id: number) => {
    if (incomeEarners.length > 1) {
      setIncomeEarners(incomeEarners.filter(earner => earner.id !== id))
    }
  }

  const updateIncomeEarner = (id: number, field: keyof IncomeEarner, value: string | number) => {
    setIncomeEarners(
      incomeEarners.map(earner =>
        earner.id === id
          ? { ...earner, [field]: field === "amount" ? Number(value) || 0 : value }
          : earner
      )
    )
  }

  const totalAnnualIncome = incomeEarners.reduce((sum, earner) => sum + earner.amount, 0)

  return (
    <DashboardShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences</p>
        </div>
        <ModeToggle />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Set your location for personalized recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="suburb">Suburb</Label>
              <SuburbCombobox country={country} value={suburb} onChange={setSuburb} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income</CardTitle>
            <CardDescription>Add your annual income details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {incomeEarners.map((earner) => (
              <div key={earner.id} className="grid gap-4 sm:grid-cols-[1fr,auto,auto]">
                <div className="space-y-2">
                  <Label htmlFor={`name-${earner.id}`}>Name</Label>
                  <Input
                    id={`name-${earner.id}`}
                    placeholder="Income earner name"
                    value={earner.name}
                    onChange={(e) => updateIncomeEarner(earner.id, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`amount-${earner.id}`}>Annual Income</Label>
                  <Input
                    id={`amount-${earner.id}`}
                    type="number"
                    placeholder="0.00"
                    value={earner.amount}
                    onChange={(e) => updateIncomeEarner(earner.id, "amount", e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIncomeEarner(earner.id)}
                    disabled={incomeEarners.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addIncomeEarner}>
              <Plus className="mr-2 h-4 w-4" />
              Add Income Earner
            </Button>

            <div className="pt-4 border-t">
              <div className="flex justify-between">
                <span className="font-medium">Total Annual Income:</span>
                <span className="font-bold">${totalAnnualIncome.toLocaleString()}</span>
              </div>
            </div>

            <Button onClick={handleSaveSettings} className="w-full">
              Save All Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

