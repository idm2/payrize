"use client"

import React, { useState, useEffect } from "react"
import { Clock, Edit, Info, Plus, PlusCircle, TrashIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { PlansMenu } from "@/components/plans-menu"

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [activePlan, setActivePlanState] = useState<Plan | null>(null)
  const [showNewPlanDialog, setShowNewPlanDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null)
  const [newPlanName, setNewPlanName] = useState("")

  // Load plans on component mount
  useEffect(() => {
    const loadedPlans = getPlans()
    setPlans(loadedPlans)
    setActivePlanState(getActivePlan())
  }, [])

  // Setup listener for plan updates
  useEffect(() => {
    const handlePlansUpdated = () => {
      setPlans(getPlans())
      setActivePlanState(getActivePlan())
    }

    window.addEventListener('plansUpdated', handlePlansUpdated)
    
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
      setShowNewPlanDialog(false)
      
      // Show success toast
      toast({
        title: "Success",
        description: `Created new plan: ${newPlanName}`
      })
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <DashboardShell>
      <DashboardHeader 
        heading="Plans Management" 
        text="Create and manage your savings plans"
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-4 sm:p-8">
        {/* Add New Plan Card */}
        <Card className="border-dashed cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowNewPlanDialog(true)}>
          <CardHeader className="flex flex-row items-center justify-center py-8">
            <div className="flex flex-col items-center text-center">
              <Plus className="h-10 w-10 text-muted-foreground mb-2" />
              <CardTitle className="text-xl">Create New Plan</CardTitle>
              <CardDescription>Start a new savings scenario</CardDescription>
            </div>
          </CardHeader>
        </Card>
        
        {/* Plan Cards */}
        {plans.map(plan => (
          <Card key={plan.id} className={plan.isActive ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center">
                    {plan.name}
                    {plan.isActive && (
                      <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                        Active
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <div className="flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Created: {formatDate(plan.createdAt)}</span>
                    </div>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Expenses:</span>
                  <span>{plan.expenses?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Income Sources:</span>
                  <span>{plan.incomeEarners?.length || 0}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              {!plan.isActive ? (
                <>
                  <Button 
                    onClick={() => handleSwitchPlan(plan.id)}
                    variant="outline"
                  >
                    Activate
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      setPlanToDelete(plan)
                      setShowDeleteDialog(true)
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button 
                  disabled
                  variant="outline"
                  className="w-full"
                >
                  Current Plan
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* New Plan Dialog */}
      <Dialog open={showNewPlanDialog} onOpenChange={setShowNewPlanDialog}>
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
            <Button variant="outline" onClick={() => setShowNewPlanDialog(false)}>Cancel</Button>
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
    </DashboardShell>
  )
} 