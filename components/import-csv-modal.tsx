"use client"

import type React from "react"

import { useState } from "react"
import { Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { downloadCSV, getExampleCSV } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"

interface ImportCSVModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: any[]) => void
}

export function ImportCSVModal({ open, onOpenChange, onImport }: ImportCSVModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const { toast } = useToast()

  const handleDownloadTemplate = () => {
    const exampleData = getExampleCSV()
    downloadCSV(exampleData, "payrize-template.csv")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      })
      return
    }

    try {
      const text = await file.text()
      const rows = text.split("\n")
      const headers = rows[0].split(",")
      const data = rows
        .slice(1)
        .map((row) => {
          const values = row.split(",")
          return headers.reduce((obj: any, header, index) => {
            obj[header.trim()] = values[index]?.trim()
            return obj
          }, {})
        })
        .filter((row) => Object.values(row).some((value) => value))

      onImport(data)
      toast({
        title: "Import successful",
        description: `Imported ${data.length} expenses successfully`,
      })
      onOpenChange(false)
      setFile(null)
    } catch (error) {
      toast({
        title: "Import failed",
        description: "There was an error importing your CSV file. Please check the format and try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Expenses</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your expenses. Make sure it follows the correct format.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("csv-file")?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {file ? file.name : "Choose file"}
                </Button>
                <input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Download our template to see the required format</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} variant="default">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

