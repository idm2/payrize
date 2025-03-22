"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { ExpenseTracker } from "@/components/expense-tracker"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Upload } from "lucide-react"
import { ImportCSVModal } from "@/components/import-csv-modal"
import { downloadCSV, getExampleCSV } from "@/lib/utils"
import { useState } from "react"
import { ExpensePieChart } from "@/components/expense-pie-chart"
import { ExpenseLineGraph } from "@/components/expense-line-graph"

export default function ExpensesPage() {
  const [showImportModal, setShowImportModal] = useState(false)

  const handleExportCSV = () => {
    const exampleData = getExampleCSV()
    downloadCSV(exampleData, "payrize-expenses.csv")
  }

  const handleImport = (data: any[]) => {
    // Handle the imported data
    console.log("Imported data:", data)
  }

  return (
    <DashboardShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Manage and track all your expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => setShowImportModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column - Charts */}
        <div className="flex flex-col gap-6">
          <ExpensePieChart />
          <ExpenseLineGraph />
        </div>
        
        {/* Right Column - Expense Tracker */}
        <Card>
          <CardHeader>
            <CardTitle>All Expenses</CardTitle>
            <CardDescription>View and manage all your recurring expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseTracker />
          </CardContent>
        </Card>
      </div>

      <ImportCSVModal open={showImportModal} onOpenChange={setShowImportModal} onImport={handleImport} />
    </DashboardShell>
  )
}

