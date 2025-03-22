import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RecommendationEngine } from "@/components/recommendation-engine"
import { SavingsPieChart } from "@/components/savings-pie-chart"
import { SavingsLineGraph } from "@/components/savings-line-graph"

export default function SavingsPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Savings</h1>
          <p className="text-muted-foreground">Optimize your expenses and maximize savings</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column - Charts */}
        <div className="flex flex-col gap-6">
          <SavingsPieChart />
          <SavingsLineGraph />
        </div>
        
        {/* Right Column - Savings Options */}
        <Card>
          <CardHeader>
            <CardTitle>Savings Options</CardTitle>
            <CardDescription>Find ways to save by comparing or reducing expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <RecommendationEngine />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

