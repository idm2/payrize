"use client"

import * as React from "react"
import { Sparkles, FileDown, FileUp } from "lucide-react"
import Papa from "papaparse"

import { Button } from "@/components/ui/button"
import { PlansMenu } from "@/components/plans-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Expense, formatCurrency } from "@/lib/utils"
import { PayRizeWizard } from "@/components/payrize-wizard"

interface DashboardHeaderProps {
  heading: string
  text?: string
  onAddExpense?: () => void
}

export function DashboardHeader({
  heading,
  text,
  onAddExpense,
}: DashboardHeaderProps) {
  const [showImportModal, setShowImportModal] = React.useState(false)
  const [importedExpenses, setImportedExpenses] = React.useState<any[]>([])
  const [file, setFile] = React.useState<File | null>(null)
  const [showWizard, setShowWizard] = React.useState(false)

  const handleExportCSV = () => {
    const expenses = localStorage.getItem("expenses")
    if (!expenses) {
      toast({
        title: "No expenses to export",
        description: "Add some expenses first",
        variant: "destructive",
      })
      return
    }

    const parsedExpenses = JSON.parse(expenses)
    const csv = Papa.unparse(parsedExpenses)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "expenses.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Expenses exported",
      description: "Your expenses have been exported to CSV",
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      Papa.parse(selectedFile, {
        header: true,
        complete: (results: Papa.ParseResult<any>) => {
          setImportedExpenses(results.data as any[])
        },
      })
    }
  }

  const handleImport = () => {
    if (!importedExpenses.length) {
      toast({
        title: "No expenses to import",
        description: "Please select a valid CSV file",
        variant: "destructive",
      })
      return
    }

    const existingExpenses = localStorage.getItem("expenses")
      ? JSON.parse(localStorage.getItem("expenses") || "[]")
      : []

    const combinedExpenses = [...existingExpenses, ...importedExpenses]
    localStorage.setItem("expenses", JSON.stringify(combinedExpenses))
    
    // Dispatch the expensesUpdated event to refresh the UI
    window.dispatchEvent(new Event('expensesUpdated'))

    setShowImportModal(false)
    setFile(null)
    setImportedExpenses([])

    toast({
      title: "Expenses imported",
      description: `${importedExpenses.length} expenses have been imported`,
    })
  }

  const handleWizardComplete = () => {
    setShowWizard(false)
    // Dispatch the expensesUpdated event to refresh the UI
    window.dispatchEvent(new Event('expensesUpdated'))
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-8 sm:p-8 md:flex-row md:items-center md:justify-between">
      <div className="grid gap-1">
        <h1 className="text-3xl font-semibold tracking-tighter">{heading}</h1>
        {text && <p className="text-muted-foreground">{text}</p>}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <PlansMenu />
        <Button
          variant="default"
          className="h-9"
          onClick={() => setShowWizard(true)}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          PayRize Wizard
        </Button>
        <Button
          variant="outline"
          className="h-9"
          onClick={handleExportCSV}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button
          variant="outline"
          className="h-9"
          onClick={() => setShowImportModal(true)}
        >
          <FileUp className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
        {onAddExpense && (
          <Button onClick={onAddExpense} className="h-9">
            Add Expense
          </Button>
        )}
      </div>

      {/* Import CSV Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Import Expenses</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import expenses. The CSV should have the same
              format as the exported expenses.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file">CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
            </div>
            {importedExpenses.length > 0 && (
              <div>
                <p className="text-sm font-medium">
                  Found {importedExpenses.length} expenses in the file.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowImportModal(false)}
            >
              Cancel
            </Button>
            <Button disabled={!importedExpenses.length} onClick={handleImport}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PayRize Wizard Modal */}
      {showWizard && (
        <PayRizeWizard
          open={showWizard}
          onOpenChange={setShowWizard}
        />
      )}
    </div>
  )
}

