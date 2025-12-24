import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Home as HomeIcon, Users, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { formatKES } from "@shared/currency";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: recentInvoices } = trpc.invoices.list.useQuery();
  const { data: recentPayments } = trpc.payments.list.useQuery();

  const unpaidInvoices = recentInvoices?.filter(inv => 
    inv.status === "unpaid" || inv.status === "overdue"
  ).slice(0, 5) || [];

  const latestPayments = recentPayments?.slice(0, 5) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your rental property management</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Units</CardTitle>
              <HomeIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.totalUnits || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.occupiedUnits || 0} occupied, {stats?.vacantUnits || 0} vacant
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.occupancyRate.toFixed(1) || 0}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.occupiedUnits || 0} of {stats?.totalUnits || 0} units
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Arrears</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-600">{formatKES(stats?.totalArrears || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Outstanding payments</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{latestPayments.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Last 5 transactions</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and operations</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start" onClick={() => setLocation("/properties")}>
                <Building2 className="h-4 w-4 mr-2" />
                Manage Properties
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setLocation("/tenants")}>
                <Users className="h-4 w-4 mr-2" />
                Manage Tenants
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setLocation("/leases")}>
                <HomeIcon className="h-4 w-4 mr-2" />
                Create New Lease
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setLocation("/payments")}>
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unpaid Invoices</CardTitle>
              <CardDescription>Invoices requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {unpaidInvoices.length > 0 ? (
                <div className="space-y-3">
                  {unpaidInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">
                        {formatKES(invoice.totalAmount)}
                      </p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={() => setLocation("/invoices")}>
                    View All Invoices
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No unpaid invoices</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {latestPayments.length > 0 ? (
              <div className="space-y-3">
                {latestPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.paymentMethod} • {payment.transactionReference || "No reference"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        +{formatKES(payment.amount)}
                      </p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={() => setLocation("/payments")}>
                  View All Payments
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No recent payments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
