"use client"

import { useState } from "react"
import { Download, Upload, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadCSV, getExampleCSV } from "@/lib/utils"
import { ImportCSVModal } from "@/components/import-csv-modal"
import { useToast } from "@/components/ui/use-toast"
import { PayRizeWizard } from "@/components/payrize-wizard"

interface DashboardHeaderProps {
  heading?: string
  text?: string
  onAddExpense: () => void
}

export function DashboardHeader({ 
  heading = "Dashboard", 
  text = "Welcome to Payrize, your personal expense management system.",
  onAddExpense
}: DashboardHeaderProps) {
  const [showImportModal, setShowImportModal] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const { toast } = useToast()

  const handleExportCSV = () => {
    const exampleData = getExampleCSV()
    downloadCSV(exampleData, "payrize-expenses.csv")
  }

  const handleImportCSV = (data: any[]) => {
    try {
      // Get existing expenses from localStorage
      const existingExpenses = localStorage.getItem("expenses")
      const expenses = existingExpenses ? JSON.parse(existingExpenses) : []
      
      // Add unique IDs to imported expenses
      const importedExpenses = data.map(expense => ({
        ...expense,
        id: crypto.randomUUID()
      }))
      
      // Combine existing and imported expenses
      const updatedExpenses = [...expenses, ...importedExpenses]
      
      // Save to localStorage
      localStorage.setItem("expenses", JSON.stringify(updatedExpenses))
      
      toast({
        title: "Import successful",
        description: `Imported ${data.length} expenses successfully`,
      })
    } catch (error) {
      toast({
        title: "Import failed",
        description: "There was an error processing your data",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between mb-4 sm:mb-6 md:mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{heading}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">{text}</p>
      </div>
      <div className="flex items-center gap-2 mt-2 md:mt-0">
        <Button 
          variant="gradient-tertiary" 
          size="sm" 
          className="h-8 sm:h-9 text-xs sm:text-sm shadow-md hover:shadow-lg transition-all"
          onClick={() => setShowWizard(true)}
        >
          <Wand2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          PayRize Wizard
        </Button>
        <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" onClick={handleExportCSV}>
          <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Export</span> CSV
        </Button>
        <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" onClick={() => setShowImportModal(true)}>
          <Upload className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Import</span> CSV
        </Button>
      </div>

      <ImportCSVModal 
        open={showImportModal} 
        onOpenChange={setShowImportModal} 
        onImport={handleImportCSV}
      />
      
      <PayRizeWizard
        open={showWizard}
        onOpenChange={setShowWizard}
      />
    </div>
  )
}

