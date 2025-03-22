"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { DashboardHeader } from "@/components/dashboard-header"
import { ExpenseTracker } from "@/components/expense-tracker"
import { RecommendationEngine } from "@/components/recommendation-engine"
import { SavingsPieChart } from "@/components/savings-pie-chart"
import { SavingsLineGraph } from "@/components/savings-line-graph"
import { SavingsSummary } from "@/components/savings-summary"
import { FinancialTrendsGraph } from "@/components/financial-trends-graph"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Dashboard"
        text="Welcome to Payrize, your personal expense management system."
      />
      
      {/* Savings Summary - Prominent display of total savings */}
      <div className="mb-4 sm:mb-6">
        <SavingsSummary />
      </div>
      
      {/* Top Row - Charts */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 mb-4 sm:mb-6">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Top Left: Savings Pie Chart */}
          <SavingsPieChart />
        </div>
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Top Right: Expense/Savings Bar Graph */}
          <SavingsLineGraph />
        </div>
      </div>
      
      {/* Middle Row - Financial Trends Graph */}
      <div className="mb-4 sm:mb-6">
        <FinancialTrendsGraph />
      </div>
      
      {/* Bottom Row - Expense Tracker and Savings Options */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Bottom Left: Expense Tracker */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Expense Tracker</CardTitle>
              <CardDescription>Track and manage your recurring expenses</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <ExpenseTracker />
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Bottom Right: Savings Options */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Savings Options</CardTitle>
              <CardDescription>Find ways to save by comparing or reducing expenses</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <RecommendationEngine />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}

