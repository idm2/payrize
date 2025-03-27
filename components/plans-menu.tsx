"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Folder, FolderOpen, Plus, Trash2 } from "lucide-react"

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { 
  getPlans, 
  getActivePlan, 
  createPlan, 
  setActivePlan, 
  deletePlan, 
  syncPlanData,
  loadPlanData,
  type Plan
} from "@/lib/utils"

export function PlansMenu() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [activePlan, setActivePlanState] = useState<Plan | null>(null)
  const [newPlanName, setNewPlanName] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null)

  // Load plans on component mount
  useEffect(() => {
    const loadedPlans = getPlans()
    
    // If no plans exist, create a default one
    if (loadedPlans.length === 0) {
      const defaultPlan = createPlan("Default Plan")
      setPlans([defaultPlan])
      setActivePlanState(defaultPlan)
    } else {
      setPlans(loadedPlans)
      setActivePlanState(getActivePlan())
    }
  }, [])

  // Update plans whenever they change (like when switching between plans)
  useEffect(() => {
    // Set up event listener for plan updates
    const handlePlansUpdated = () => {
      setPlans(getPlans())
      setActivePlanState(getActivePlan())
    }

    window.addEventListener('plansUpdated', handlePlansUpdated)
    
    // Cleanup
    return () => {
      window.removeEventListener('plansUpdated', handlePlansUpdated)
    }
  }, [])

  // Handle creating a new plan
  const handleCreatePlan = () => {
    if (!newPlanName.trim()) {
      toast({
        title: "Error",
        description: "Plan name cannot be empty",
        variant: "destructive"
      })
      return
    }

    try {
      // Save current plan's data before switching
      if (activePlan) {
        syncPlanData(activePlan.id)
      }
      
      // Create new plan and set it as active
      const newPlan = createPlan(newPlanName)
      
      // Update state
      setPlans([...plans, newPlan])
      setActivePlanState(newPlan)
      
      setNewPlanName("")
      setShowDialog(false)
      
      // Show success toast
      toast({
        title: "Success",
        description: `Created new plan: ${newPlanName}`
      })
      
      // Refresh page data
      window.dispatchEvent(new Event('expensesUpdated'))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create plan",
        variant: "destructive"
      })
    }
  }

  // Handle switching plans
  const handleSwitchPlan = (planId: string) => {
    try {
      // Save current plan's data before switching
      if (activePlan) {
        syncPlanData(activePlan.id)
      }
      
      // Set new active plan
      const switchedPlan = setActivePlan(planId)
      
      if (switchedPlan) {
        // Load the data for the new plan
        loadPlanData(planId)
        
        // Update state
        setActivePlanState(switchedPlan)
        setPlans(getPlans())
        
        // Show success toast
        toast({
          title: "Plan Switched",
          description: `Switched to plan: ${switchedPlan.name}`
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch plan",
        variant: "destructive"
      })
    }
  }

  // Handle plan deletion
  const handleDeletePlan = () => {
    if (!planToDelete) return
    
    try {
      if (deletePlan(planToDelete.id)) {
        // Get updated plans after deletion
        const updatedPlans = getPlans()
        setPlans(updatedPlans)
        
        // Set active plan state
        const newActivePlan = getActivePlan()
        setActivePlanState(newActivePlan)
        
        // If we still have a plan, load its data
        if (newActivePlan) {
          loadPlanData(newActivePlan.id)
        }
        
        // Show success toast
        toast({
          title: "Plan Deleted",
          description: `Deleted plan: ${planToDelete.name}`
        })
        
        // Refresh the UI
        window.dispatchEvent(new Event('expensesUpdated'))
      }
      
      // Close dialog
      setShowDeleteDialog(false)
      setPlanToDelete(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete plan",
        variant: "destructive"
      })
    }
  }

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="ml-2">
            <FolderOpen className="mr-2 h-4 w-4" />
            {activePlan?.name || "Plans"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Your Plans</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {plans.map(plan => (
            <DropdownMenuItem
              key={plan.id}
              className={`flex items-center ${plan.isActive ? 'bg-muted' : ''}`}
              onClick={() => !plan.isActive && handleSwitchPlan(plan.id)}
            >
              <Folder className="mr-2 h-4 w-4" />
              <span className="flex-1">{plan.name}</span>
              {plan.isActive ? (
                <span className="ml-2 text-xs text-muted-foreground">Active</span>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPlanToDelete(plan)
                    setShowDeleteDialog(true)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowDialog(true)}
            className="text-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Plan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* New Plan Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Plan</DialogTitle>
            <DialogDescription>
              Create a new savings plan to track different expense scenarios.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="Enter plan name"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePlan}>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this plan? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{planToDelete?.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Created: {planToDelete ? formatDate(planToDelete.createdAt) : ''}
            </p>
            <p className="text-sm text-muted-foreground">
              Last modified: {planToDelete ? formatDate(planToDelete.lastModified) : ''}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePlan}>Delete Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 