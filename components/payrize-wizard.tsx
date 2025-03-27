"use client"

import React, { useState, useEffect } from 'react'
import { Wand2, ArrowRight, ArrowLeft, Check, Coins, Loader2, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CategoryCombobox } from "@/components/category-combobox"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency, getCategoryColor, normalizeToMonthlyAmount } from "@/lib/utils"
import type { Expense, AlternativeProduct } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"

// Update the LoadingOverlay component to make it more prominent
const LoadingOverlay = ({ visible, progress }: { visible: boolean, progress?: number }) => {
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 bg-gradient-to-r from-purple-600 to-pink-600 flex flex-col items-center justify-center z-50">
      <div className="text-white text-3xl font-bold mb-8 text-center px-4">
        Finding you the best savings options...
      </div>
      
      <div className="relative w-64 h-32 mb-8">
        {/* Animated wave line */}
        <svg className="absolute inset-0" viewBox="0 0 200 50" preserveAspectRatio="none">
          <path 
            d="M0,25 C20,10 40,40 60,25 C80,10 100,40 120,25 C140,10 160,40 180,25 C200,10 220,40 240,25" 
            fill="none" 
            stroke="white" 
            strokeWidth="3"
            strokeLinecap="round"
            className="animate-wave"
          />
        </svg>
        
        {/* Coin icon that moves along the wave */}
        <div className="absolute top-0 left-0 animate-move-along-wave">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-purple-500 dark:text-purple-400 shadow-lg">
            <Coins className="h-10 w-10" />
          </div>
        </div>
      </div>
      
      {progress !== undefined && (
        <div className="w-64 mb-4">
          <Progress value={progress} className="h-2 bg-white/20" />
          <p className="text-white text-sm mt-2 text-center">{progress}% complete</p>
        </div>
      )}
      
      <p className="text-white/80 text-sm max-w-md text-center px-4">
        We're searching across multiple services to find you the best alternatives and maximize your savings
      </p>
    </div>
  );
};

interface PayRizeWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface WizardData {
  name: string
  income: number[]
  personalExpenses: Expense[]
  businessExpenses: Expense[]
  savingsGoal: number
}

export function PayRizeWizard({ open, onOpenChange }: PayRizeWizardProps) {
  const [step, setStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false)
  const { toast } = useToast()
  
  // Form data
  const [data, setData] = useState<WizardData>({
    name: "",
    income: [0],
    personalExpenses: [],
    businessExpenses: [],
    savingsGoal: 0
  })
  
  // Temporary expense state for adding expenses
  const [tempPersonalExpense, setTempPersonalExpense] = useState<Partial<Expense>>({
    name: "",
    amount: 0,
    category: "",
    frequency: "Monthly",
    description: "",
    willingness: "Possible",
    url: ""
  })
  
  const [tempBusinessExpense, setTempBusinessExpense] = useState<Partial<Expense>>({
    name: "",
    amount: 0,
    category: "",
    frequency: "Monthly",
    description: "",
    willingness: "Possible",
    url: ""
  })
  
  // Current expense type (personal or business)
  const currentStep = step;
  const currentExpenseType = step === 3 ? 'personal' : step === 4 ? 'business' : null;
  
  // Add a progress state for the loading animation
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isProcessingAlternatives, setIsProcessingAlternatives] = useState(false);
  const [alternativesProgress, setAlternativesProgress] = useState(0);
  
  // Sample categories for expenses
  const categories = [
    { name: "Housing" },
    { name: "Transportation" },
    { name: "Food" },
    { name: "Entertainment" },
    { name: "Utilities" },
    { name: "Healthcare" },
    { name: "Personal" },
    { name: "Debt" },
    { name: "Insurance" },
    { name: "Savings" },
    { name: "Education" },
    { name: "Business" },
    { name: "Other" }
  ];
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1)
        setIsComplete(false)
        setData({
          name: "",
          income: [0],
          personalExpenses: [],
          businessExpenses: [],
          savingsGoal: 0
        })
      }, 300)
    }
  }, [open])
  
  // Calculate total income
  const totalIncome = data.income.reduce((sum, income) => sum + income, 0)
  
  // Calculate total expenses
  const totalPersonalExpenses = data.personalExpenses.reduce((sum, expense: Expense) => 
    sum + normalizeToMonthlyAmount(expense), 0)
  const totalBusinessExpenses = data.businessExpenses.reduce((sum, expense: Expense) => 
    sum + normalizeToMonthlyAmount(expense), 0)
  const totalExpenses = totalPersonalExpenses + totalBusinessExpenses
  
  // Calculate maximum possible savings
  const maxPossibleSavings = Math.max(0, totalIncome - totalExpenses)
  
  // Handle name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData(prev => ({ ...prev, name: e.target.value }))
  }
  
  // Handle income change
  const handleIncomeChange = (value: number, index: number) => {
    const newIncome = [...data.income]
    newIncome[index] = value
    setData(prev => ({ ...prev, income: newIncome }))
  }
  
  // Add income field
  const addIncomeField = () => {
    setData(prev => ({ ...prev, income: [...prev.income, 0] }))
  }
  
  // Remove income field
  const removeIncomeField = (index: number) => {
    const newIncome = [...data.income]
    newIncome.splice(index, 1)
    setData(prev => ({ ...prev, income: newIncome.length ? newIncome : [0] }))
  }
  
  // Handle personal expense field changes
  const handlePersonalExpenseChange = (field: keyof Expense, value: any) => {
    setTempPersonalExpense(prev => ({ 
      ...prev, 
      [field]: field === "amount" ? Number(value) || 0 : value 
    }))
  }
  
  // Handle business expense field changes
  const handleBusinessExpenseChange = (field: keyof Expense, value: any) => {
    setTempBusinessExpense(prev => ({ 
      ...prev, 
      [field]: field === "amount" ? Number(value) || 0 : value 
    }))
  }
  
  // Add personal expense
  const addPersonalExpense = () => {
    if (!tempPersonalExpense.name || !tempPersonalExpense.category) return
    
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      name: tempPersonalExpense.name || "",
      amount: tempPersonalExpense.amount || 0,
      category: tempPersonalExpense.category || "",
      frequency: tempPersonalExpense.frequency || "Monthly",
      description: tempPersonalExpense.description || "Added via PayRize Wizard",
      willingness: tempPersonalExpense.willingness || "Possible",
      url: tempPersonalExpense.url || "",
      quantity: tempPersonalExpense.quantity || 1
    }
    
    setData(prev => ({
      ...prev,
      personalExpenses: [...prev.personalExpenses, newExpense]
    }))
    
    // Reset temp expense
    setTempPersonalExpense({
      name: "",
      amount: 0,
      category: "",
      frequency: "Monthly",
      description: "",
      willingness: "Possible",
      url: ""
    })
  }
  
  // Add business expense
  const addBusinessExpense = () => {
    if (!tempBusinessExpense.name || !tempBusinessExpense.category) return
    
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      name: tempBusinessExpense.name || "",
      amount: tempBusinessExpense.amount || 0,
      category: tempBusinessExpense.category || "",
      frequency: tempBusinessExpense.frequency || "Monthly",
      description: tempBusinessExpense.description || "Added via PayRize Wizard",
      willingness: tempBusinessExpense.willingness || "Possible",
      url: tempBusinessExpense.url || "",
      quantity: tempBusinessExpense.quantity || 1
    }
    
    setData(prev => ({
      ...prev,
      businessExpenses: [...prev.businessExpenses, newExpense]
    }))
    
    // Reset temp expense
    setTempBusinessExpense({
      name: "",
      amount: 0,
      category: "",
      frequency: "Monthly",
      description: "",
      willingness: "Possible",
      url: ""
    })
  }
  
  // Remove personal expense
  const removePersonalExpense = (id: string) => {
    setData(prev => ({
      ...prev,
      personalExpenses: prev.personalExpenses.filter(expense => expense.id !== id)
    }))
  }
  
  // Remove business expense
  const removeBusinessExpense = (id: string) => {
    setData(prev => ({
      ...prev,
      businessExpenses: prev.businessExpenses.filter(expense => expense.id !== id)
    }))
  }
  
  // Handle savings goal change
  const handleSavingsGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value) || 0
    setData(prev => ({ ...prev, savingsGoal: Math.min(value, maxPossibleSavings) }))
  }
  
  // Add this function to fetch alternatives for an expense
  const fetchAlternatives = async (expense: Expense) => {
    try {
      console.log("Fetching alternatives for:", expense)
      
      const response = await fetch("/api/alternatives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expense }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch alternatives")
      }
      
      const data = await response.json()
      console.log("Received alternatives:", data)
      
      // Return alternatives with IDs and savings calculations
      return data.map((alt: any, index: number) => ({
        id: `${expense.id}-alt-${index}`,
        name: alt.name,
        description: alt.description,
        price: alt.price,
        url: alt.url,
        savings: expense.amount - alt.price,
        source: alt.source
      }))
    } catch (error) {
      console.error("Error fetching alternatives:", error)
      return []
    }
  }
  
  // Process the wizard data
  const processWizardData = async () => {
    // Show loading overlay before any processing begins
    setShowLoadingOverlay(true);
    setLoadingProgress(5);
    
    // Close the dialog immediately to show the loading animation
    onOpenChange(false);
    
    try {
      // Simulate some initial processing time to show the animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoadingProgress(10);
      
      // Save user data
      localStorage.setItem('userName', data.name);
      setLoadingProgress(15);
      
      // Save income earners
      const incomeEarners = data.income.map((amount, index) => ({
        id: index + 1,
        name: index === 0 ? `${data.name}'s Income` : `Additional Income ${index}`,
        amount: amount
      }));
      localStorage.setItem('incomeEarners', JSON.stringify(incomeEarners));
      setLoadingProgress(25);
      
      // Clear existing expenses to avoid duplicates
      const existingExpenses: Expense[] = [];
      
      // Create a set of existing IDs for quick lookup
      const existingIds = new Set(existingExpenses.map((e: Expense) => e.id));
      
      // Generate unique IDs for new expenses and ensure quantity is preserved
      const personalExpensesWithIds = data.personalExpenses.map(expense => {
        const id = expense.id && !existingIds.has(expense.id) 
          ? expense.id 
          : crypto.randomUUID();
        existingIds.add(id);
        // Ensure quantity is set for "Per Unit" expenses
        const quantity = expense.frequency === "Per Unit" && expense.quantity
          ? expense.quantity
          : expense.frequency === "Per Unit" ? 1 : undefined;
          
        return { 
          ...expense, 
          id,
          quantity 
        };
      });
      
      const businessExpensesWithIds = data.businessExpenses.map(expense => {
        const id = expense.id && !existingIds.has(expense.id) 
          ? expense.id 
          : crypto.randomUUID();
        existingIds.add(id);
        // Ensure quantity is set for "Per Unit" expenses
        const quantity = expense.frequency === "Per Unit" && expense.quantity
          ? expense.quantity
          : expense.frequency === "Per Unit" ? 1 : undefined;
        
        return { 
          ...expense, 
          id,
          quantity
        };
      });
      
      // Combine expenses
      const newExpenses = [...existingExpenses, ...personalExpensesWithIds, ...businessExpensesWithIds];
      
      // Save expenses to localStorage
      localStorage.setItem('expenses', JSON.stringify(newExpenses));
      setLoadingProgress(40);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('expensesUpdated'));
      
      // Save savings goal
      localStorage.setItem('savingsGoal', data.savingsGoal.toString());
      setLoadingProgress(50);
      
      // Flag indicating we're looking for savings
      localStorage.setItem('autoSearchSavings', 'true');
      
      // Find expenses that have willingness to change (Possible or Very Willing)
      const allNewExpenses = [...personalExpensesWithIds, ...businessExpensesWithIds];
      const eligibleExpenses = allNewExpenses.filter(expense => 
        expense.willingness === "Possible" || expense.willingness === "Very Willing"
      );
      
      if (eligibleExpenses.length > 0) {
        setIsProcessingAlternatives(true);
        setLoadingProgress(60);
        
        try {
          // Process alternatives for each expense
          const updatedExpenses = [...newExpenses];
          let processedCount = 0;
          
          for (const expense of eligibleExpenses) {
            // Make sure loading overlay remains visible
            setShowLoadingOverlay(true);
            
            // Update progress
            const individualProgress = Math.round((processedCount / eligibleExpenses.length) * 40);
            setAlternativesProgress(Math.round((processedCount / eligibleExpenses.length) * 100));
            setLoadingProgress(60 + individualProgress);
            
            // Fetch alternatives with a longer timeout
            try {
              const alternatives = await fetchAlternatives(expense);
              
              if (alternatives && alternatives.length > 0) {
                // Find best alternative
                const bestAlternative = alternatives.reduce((best: AlternativeProduct, current: AlternativeProduct) => 
                  current.savings > best.savings ? current : best, alternatives[0]
                );
                
                // Update the expense with alternatives and best selection
                const expenseIndex = updatedExpenses.findIndex((e: Expense) => e.id === expense.id);
                if (expenseIndex !== -1) {
                  updatedExpenses[expenseIndex] = {
                    ...updatedExpenses[expenseIndex],
                    alternatives: alternatives,
                    selectedAlternative: {
                      id: bestAlternative.id,
                      name: bestAlternative.name,
                      price: bestAlternative.price,
                      savings: bestAlternative.savings,
                      source: bestAlternative.source,
                      location: bestAlternative.location
                    },
                    targetAmount: bestAlternative.price,
                    willingness: "Very Willing"
                  };
                }
              }
            } catch (error) {
              console.error(`Error finding alternatives for ${expense.name}:`, error);
              // Continue with next expense even if one fails
            }
            
            processedCount++;
          }
          
          // Save updated expenses with alternatives
          localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
          
          // Dispatch event to notify other components
          window.dispatchEvent(new Event('expensesUpdated'));
          
        } catch (error) {
          console.error("Error processing alternatives:", error);
        } finally {
          setIsProcessingAlternatives(false);
          setLoadingProgress(100);
        }
      } else {
        // No expenses with willingness to change, so we're done
        setLoadingProgress(100);
      }
      
      // Keep loading overlay visible for a moment to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      toast({
        title: "Setup Complete!",
        description: "Your PayRize profile has been successfully set up and alternatives have been automatically added to your plan."
      });
      
      // Navigate to the savings screen directly without closing the loader
      window.location.href = "/savings";
      
    } catch (error) {
      console.error("Error processing wizard data:", error);
      toast({
        title: "Error",
        description: "There was an error processing your data. Please try again.",
        variant: "destructive",
      });
      // Only hide loading overlay on error
      setShowLoadingOverlay(false);
    }
    // Do NOT set showLoadingOverlay to false here to ensure it stays visible during redirect
  };
  
  // Handle next step
  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1)
    } else {
      processWizardData()
    }
  }
  
  // Handle previous step
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }
  
  // Check if current step is valid
  const isStepValid = () => {
    switch (step) {
      case 1: // Name
        return data.name.trim().length > 0
      case 2: // Income
        return data.income.some(income => income > 0)
      case 3: // Personal Expenses
        return data.personalExpenses.length > 0
      case 4: // Business Expenses
        return true // Business expenses are optional
      case 5: // Savings Goal
        return data.savingsGoal > 0 && data.savingsGoal <= maxPossibleSavings
      default:
        return false
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save data to localStorage
    if (step === 5) {
      // Show loading overlay before processing begins
      setShowLoadingOverlay(true);
      
      // Close dialog to show loading animation
      onOpenChange(false);
      
      // Process the wizard data
      processWizardData();
    } else {
      // Move to next step
      setStep(step + 1);
    }
  };
  
  // Handle back button click
  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    if (step > 1) {
      setStep(step - 1)
    }
  }
  
  const handleExpenseChange = (index: number, field: string, value: any) => {
    setData(prev => {
      const expenses = currentStep === 2
        ? [...prev.personalExpenses]
        : [...prev.businessExpenses];

      expenses[index] = {
        ...expenses[index],
        [field]: value
      };

      return currentStep === 2
        ? { ...prev, personalExpenses: expenses }
        : { ...prev, businessExpenses: expenses };
    });
  };

  const handleExpenseCategoryChange = (index: number, category: string) => {
    setData(prev => {
      const expenses = currentStep === 2
        ? [...prev.personalExpenses]
        : [...prev.businessExpenses];

      expenses[index] = {
        ...expenses[index],
        category
      };

      return currentStep === 2
        ? { ...prev, personalExpenses: expenses }
        : { ...prev, businessExpenses: expenses };
    });
  };

  return (
    <>
      <LoadingOverlay 
        visible={showLoadingOverlay} 
        progress={isProcessingAlternatives ? alternativesProgress : loadingProgress} 
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto">
          {!isComplete ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Wand2 className="h-5 w-5 text-yellow-500" />
                  PayRize Wizard {step > 1 && `- Step ${step} of 5`}
                </DialogTitle>
                <DialogDescription>
                  {step === 1 && "Let's get started by setting up your profile."}
                  {step === 2 && "Tell us about your income sources."}
                  {step === 3 && "Add your personal expenses."}
                  {step === 4 && "Add your business expenses (if any)."}
                  {step === 5 && "Set your savings goal - your PayRize!"}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 mb-4">
                <Progress value={step * 20} className="h-2" />
              </div>

              <div className="py-4">
                {/* Step 1: Name */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        value={data.name}
                        onChange={handleNameChange}
                        placeholder="Enter your name"
                        className="text-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Income */}
                {step === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Your Income Sources</h3>
                    
                    {data.income.map((income, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label htmlFor={`income-${index}`} className="sr-only">
                            {index === 0 ? "Income Amount" : `Income Source ${index + 1}`}
                          </Label>
                          <Input
                            id={`income-${index}`}
                            type="number"
                            value={income || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeChange(Number(e.target.value) || 0, index)}
                            placeholder={index === 0 ? "Income Amount" : `Income Source ${index + 1}`}
                            className="text-lg"
                          />
                        </div>
                        
                        {data.income.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeIncomeField(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addIncomeField}
                      className="w-full"
                    >
                      Add Another Income Source
                    </Button>
                    
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Annual Income:</span>
                        <span className="text-xl font-bold">{formatCurrency(totalIncome)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-medium">Monthly Income:</span>
                        <span className="text-lg font-semibold">{formatCurrency(totalIncome / 12)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Personal Expenses */}
                {step === 3 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Your Personal Expenses</h3>
                    
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-md mb-4">
                      <p className="text-blue-700 dark:text-blue-400">
                        <strong>Why we need expense details:</strong> The more information you provide, the better we can find competitive alternatives that meet the same needs but at lower prices.
                      </p>
                    </div>
                    
                    {/* Reorganized form with description in its own row */}
                    <div className="space-y-6">
                      {/* First row - split into two columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                          <div className="form-group">
                            <Label htmlFor="expense-name">Name</Label>
                            <Input
                              type="text"
                              id="expense-name"
                              value={tempPersonalExpense.name}
                              onChange={(e) => handlePersonalExpenseChange('name', e.target.value)}
                              className="form-control"
                              placeholder="e.g. Netflix"
                            />
                          </div>
                          <div className="form-group">
                            <Label htmlFor="expense-category">Category</Label>
                            <CategoryCombobox
                              value={tempPersonalExpense.category}
                              onChange={(value) => handlePersonalExpenseChange('category', value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="form-group">
                            <Label htmlFor="expense-amount">Amount</Label>
                            <div className="relative rounded-md shadow-sm">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">$</span>
                              </div>
                              <Input
                                type="number"
                                id="expense-amount"
                                value={tempPersonalExpense.amount || ''}
                                onChange={(e) => handlePersonalExpenseChange('amount', parseFloat(e.target.value) || 0)}
                                className="form-control pl-7"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div className="form-group">
                            <Label htmlFor="expense-frequency">Frequency</Label>
                            <select
                              id="expense-frequency"
                              value={tempPersonalExpense.frequency}
                              onChange={(e) => handlePersonalExpenseChange('frequency', e.target.value)}
                              className="form-select rounded-[9px] px-4 py-2 h-11"
                            >
                              <option value="Weekly">Weekly</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Quarterly">Quarterly</option>
                              <option value="Yearly">Yearly</option>
                              <option value="Per Unit">Per Unit</option>
                            </select>
                          </div>
                          {tempPersonalExpense.frequency === "Per Unit" && (
                            <div className="form-group">
                              <Label htmlFor="expense-quantity">Quantity per month</Label>
                              <p className="text-sm text-foreground/70 mb-2">
                                How many units do you purchase per month?
                              </p>
                              <Input
                                id="expense-quantity"
                                type="number"
                                min="1"
                                step="1"
                                value={tempPersonalExpense.quantity || 1}
                                onChange={(e) => handlePersonalExpenseChange('quantity', parseInt(e.target.value) || 1)}
                                required
                                placeholder="Enter quantity"
                                className="form-control"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Second row - description takes full width */}
                      <div className="form-group w-full">
                        <Label htmlFor="expense-description">Description</Label>
                        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-md">
                          <p className="text-sm text-blue-700 dark:text-blue-400">
                            Please provide detailed information about the product or service. 
                            The more specific details you include (brand, size, features), 
                            the better our AI can find comparable alternatives.
                          </p>
                        </div>
                        <Textarea
                          id="expense-description"
                          value={tempPersonalExpense.description}
                          onChange={(e) => handlePersonalExpenseChange('description', e.target.value)}
                          className="form-control w-full"
                          placeholder="Description of expense"
                          rows={4}
                        />
                      </div>
                      
                      {/* Third row - willingness and URL */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="form-group">
                          <Label htmlFor="expense-willingness">Willingness to change</Label>
                          <select
                            id="expense-willingness"
                            value={tempPersonalExpense.willingness || 'Possible'}
                            onChange={(e) => handlePersonalExpenseChange('willingness', e.target.value)}
                            className="form-select rounded-[9px] px-4 py-2 h-11"
                          >
                            <option value="Not Willing">Not Willing</option>
                            <option value="Possible">Possible</option>
                            <option value="Very Willing">Very Willing</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <Label htmlFor="expense-url">URL (optional)</Label>
                          <Input
                            type="text"
                            id="expense-url"
                            value={tempPersonalExpense.url || ''}
                            onChange={(e) => handlePersonalExpenseChange('url', e.target.value)}
                            className="form-control"
                            placeholder="https://example.com"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="gradient"
                      onClick={addPersonalExpense}
                      className="w-full"
                      disabled={!tempPersonalExpense.name || !tempPersonalExpense.category}
                    >
                      Add Expense
                    </Button>
                    
                    {data.personalExpenses.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Added Expenses:</h4>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {data.personalExpenses.map((expense) => (
                            <div key={expense.id} className="flex justify-between items-center p-2 bg-muted rounded">
                              <div>
                                <span className="font-medium">{expense.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  {expense.frequency === "Per Unit" ? (
                                    <>({formatCurrency(expense.amount)}/unit × {expense.quantity || 1} = {formatCurrency(normalizeToMonthlyAmount(expense))}/month)</>
                                  ) : (
                                    <>({formatCurrency(expense.amount)}/{expense.frequency.toLowerCase()})</>
                                  )}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removePersonalExpense(expense.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Total Monthly Expenses:</span>
                            <span className="text-lg font-semibold">{formatCurrency(totalPersonalExpenses)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Business Expenses */}
                {step === 4 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Your Business Expenses</h3>
                    
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-100 dark:border-yellow-900 rounded-md mb-4">
                      <p className="text-yellow-700 dark:text-yellow-400">
                        <strong>Optional Section:</strong> Add any business expenses that you'd like to optimize. This is optional - you can skip if you don't have business expenses.
                      </p>
                    </div>
                    
                    {/* Reorganized form with description in its own row */}
                    <div className="space-y-6">
                      {/* First row - split into two columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                          <div className="form-group">
                            <Label htmlFor="business-expense-name">Name</Label>
                            <Input
                              type="text"
                              id="business-expense-name"
                              value={tempBusinessExpense.name}
                              onChange={(e) => handleBusinessExpenseChange('name', e.target.value)}
                              className="form-control"
                              placeholder="e.g. Office Rent"
                            />
                          </div>
                          <div className="form-group">
                            <Label htmlFor="business-expense-category">Category</Label>
                            <CategoryCombobox
                              value={tempBusinessExpense.category}
                              onChange={(value) => handleBusinessExpenseChange('category', value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="form-group">
                            <Label htmlFor="business-expense-amount">Amount</Label>
                            <div className="relative rounded-md shadow-sm">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">$</span>
                              </div>
                              <Input
                                type="number"
                                id="business-expense-amount"
                                value={tempBusinessExpense.amount || ''}
                                onChange={(e) => handleBusinessExpenseChange('amount', parseFloat(e.target.value) || 0)}
                                className="form-control pl-7"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div className="form-group">
                            <Label htmlFor="business-expense-frequency">Frequency</Label>
                            <select
                              id="business-expense-frequency"
                              value={tempBusinessExpense.frequency}
                              onChange={(e) => handleBusinessExpenseChange('frequency', e.target.value)}
                              className="form-select rounded-[9px] px-4 py-2 h-11"
                            >
                              <option value="Weekly">Weekly</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Quarterly">Quarterly</option>
                              <option value="Yearly">Yearly</option>
                              <option value="Per Unit">Per Unit</option>
                            </select>
                          </div>
                          {tempBusinessExpense.frequency === "Per Unit" && (
                            <div className="form-group">
                              <Label htmlFor="business-expense-quantity">Quantity per month</Label>
                              <p className="text-sm text-foreground/70 mb-2">
                                How many units do you purchase per month?
                              </p>
                              <Input
                                id="business-expense-quantity"
                                type="number"
                                min="1"
                                step="1"
                                value={tempBusinessExpense.quantity || 1}
                                onChange={(e) => handleBusinessExpenseChange('quantity', parseInt(e.target.value) || 1)}
                                required
                                placeholder="Enter quantity"
                                className="form-control"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Second row - description takes full width */}
                      <div className="form-group w-full">
                        <Label htmlFor="business-expense-description">Description</Label>
                        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-md">
                          <p className="text-sm text-blue-700 dark:text-blue-400">
                            Please provide detailed information about the product or service. 
                            The more specific details you include (brand, size, features), 
                            the better our AI can find comparable alternatives.
                          </p>
                        </div>
                        <Textarea
                          id="business-expense-description"
                          value={tempBusinessExpense.description}
                          onChange={(e) => handleBusinessExpenseChange('description', e.target.value)}
                          className="form-control w-full"
                          placeholder="Description of expense"
                          rows={4}
                        />
                      </div>
                      
                      {/* Third row - willingness and URL */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="form-group">
                          <Label htmlFor="business-expense-willingness">Willingness to change</Label>
                          <select
                            id="business-expense-willingness"
                            value={tempBusinessExpense.willingness || 'Possible'}
                            onChange={(e) => handleBusinessExpenseChange('willingness', e.target.value)}
                            className="form-select rounded-[9px] px-4 py-2 h-11"
                          >
                            <option value="Not Willing">Not Willing</option>
                            <option value="Possible">Possible</option>
                            <option value="Very Willing">Very Willing</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <Label htmlFor="business-expense-url">URL (optional)</Label>
                          <Input
                            type="text"
                            id="business-expense-url"
                            value={tempBusinessExpense.url || ''}
                            onChange={(e) => handleBusinessExpenseChange('url', e.target.value)}
                            className="form-control"
                            placeholder="https://example.com"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="gradient"
                      onClick={addBusinessExpense}
                      className="w-full"
                      disabled={!tempBusinessExpense.name || !tempBusinessExpense.category}
                    >
                      Add Business Expense
                    </Button>
                    
                    {data.businessExpenses.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Added Business Expenses:</h4>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {data.businessExpenses.map((expense) => (
                            <div key={expense.id} className="flex justify-between items-center p-2 bg-muted rounded">
                              <div>
                                <span className="font-medium">{expense.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  {expense.frequency === "Per Unit" ? (
                                    <>({formatCurrency(expense.amount)}/unit × {expense.quantity || 1} = {formatCurrency(normalizeToMonthlyAmount(expense))}/month)</>
                                  ) : (
                                    <>({formatCurrency(expense.amount)}/{expense.frequency.toLowerCase()})</>
                                  )}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBusinessExpense(expense.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Total Monthly Business Expenses:</span>
                            <span className="text-lg font-semibold">{formatCurrency(totalBusinessExpenses)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {data.businessExpenses.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground">
                        No business expenses added. This step is optional.
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Savings Goal */}
                {step === 5 && (
                  <div className="space-y-6">
                    <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white">
                      <h3 className="text-xl font-bold mb-2">Your PayRize Wish!</h3>
                      <p className="opacity-90">
                        How much would you like to save each month? This is your PayRize - the extra money you'll have in your pocket!
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="savings-goal" className="text-lg">
                          Monthly Savings Goal
                        </Label>
                        <Input
                          id="savings-goal"
                          type="number"
                          value={data.savingsGoal || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSavingsGoalChange(e)}
                          placeholder="Enter your monthly savings goal"
                          className="text-xl h-12"
                        />
                        <p className="text-sm text-muted-foreground">
                          Maximum possible: {formatCurrency(maxPossibleSavings)}/month based on your income and expenses
                        </p>
                      </div>
                      
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Monthly Income:</span>
                          <span className="font-semibold">{formatCurrency(totalIncome / 12)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="font-medium">Monthly Expenses:</span>
                          <span className="font-semibold">{formatCurrency(totalExpenses)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="font-medium">Available for Savings:</span>
                          <span className="font-semibold">{formatCurrency(maxPossibleSavings)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t">
                          <span className="font-bold">Your PayRize:</span>
                          <span className="text-xl font-bold text-green-500">{formatCurrency(data.savingsGoal)}/month</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="font-medium">Annual PayRize:</span>
                          <span className="font-bold text-green-500">{formatCurrency(data.savingsGoal * 12)}/year</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex justify-between items-center">
                <div>
                  {step > 1 && (
                    <Button type="button" variant="outline" onClick={handleBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  )}
                </div>
                <Button 
                  type="button" 
                  variant={step === 5 ? "gradient" : "default"} 
                  onClick={handleSubmit}
                  disabled={!isStepValid() || isProcessing}
                  className={step === 5 ? "bg-gradient-to-r from-purple-500 to-pink-500" : ""}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : step === 5 ? (
                    <>
                      Get Your PayRize
                      <Coins className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            // Success screen
            <div className="py-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Congratulations, {data.name}!</h2>
              <p className="text-lg mb-6">
                Your PayRize of <span className="font-bold text-green-500">{formatCurrency(data.savingsGoal)}/month</span> is ready!
              </p>
              
              <div className="p-4 bg-muted rounded-lg mb-6 text-left">
                <h3 className="font-bold mb-2">We've set up your profile:</h3>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Added your income sources
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Added {data.personalExpenses.length} personal expenses
                  </li>
                  {data.businessExpenses.length > 0 && (
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      Added {data.businessExpenses.length} business expenses
                    </li>
                  )}
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    {isProcessingAlternatives ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 text-blue-500 mr-2 animate-spin" />
                        Finding competitive alternatives... ({alternativesProgress}%)
                      </div>
                    ) : (
                      "Found competitive alternatives for your expenses"
                    )}
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Set your monthly savings goal
                  </li>
                </ul>
              </div>
              
              <p className="mb-6">
                We've analyzed your expenses and found ways to help you achieve your PayRize goal. 
                Check out the Savings Options section to see our recommendations!
              </p>
              
              <Button 
                onClick={() => onOpenChange(false)} 
                variant="gradient" 
                className="w-full"
                disabled={isProcessingAlternatives}
              >
                {isProcessingAlternatives ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finding Alternatives...
                  </>
                ) : (
                  "Start Exploring Your Dashboard"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 