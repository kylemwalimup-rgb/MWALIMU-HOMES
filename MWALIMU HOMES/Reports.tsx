import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus, TrendingUp, AlertTriangle, DollarSign, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { formatKES } from "@shared/currency";
import { generateStatementPDF } from "@/lib/pdfGenerator";
import { trpc } from "@/lib/trpc";

export default function Reports() {
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  
  const { data: properties } = trpc.properties.list.useQuery() || { data: [] };
  const { data: leases } = trpc.leases.list.useQuery() || { data: [] };
  const { data: invoices } = trpc.invoices.list.useQuery() || { data: [] };
  const { data: payments } = trpc.payments.list.useQuery() || { data: [] };
  const { data: tenants } = trpc.tenants.list.useQuery() || { data: [] };
  const { data: units } = trpc.units.list.useQuery() || { data: [] };


  // Calculate arrears aging
  const calculateArrearsAging = () => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const arrears: Record<string, any> = {};

    invoices?.forEach((invoice) => {
      if (invoice.status === "unpaid" || invoice.status === "partially_paid") {
        const lease = leases?.find(l => l.id === invoice.leaseId);
        const tenant = tenants?.find(t => t.id === lease?.tenantId);
        const dueDate = new Date(invoice.dueDate);
        const balance = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);

        if (balance > 0) {
          const tenantKey = `${tenant?.firstName} ${tenant?.lastName}`;
          if (!arrears[tenantKey]) {
            arrears[tenantKey] = {
              tenantName: tenantKey,
              unitNumber: units?.find(u => u.id === lease?.unitId)?.unitNumber || "Unknown",
              oneMonth: 0,
              twoMonths: 0,
              threeMonths: 0,
              totalArrears: 0,
            };
          }

          if (dueDate <= threeMonthsAgo) {
            arrears[tenantKey].threeMonths += balance;
          } else if (dueDate <= twoMonthsAgo) {
            arrears[tenantKey].twoMonths += balance;
          } else if (dueDate <= oneMonthAgo) {
            arrears[tenantKey].oneMonth += balance;
          }

          arrears[tenantKey].totalArrears += balance;
        }
      }
    });

    return Object.values(arrears);
  };

  // Calculate projected vs actual income
  const calculateIncomeAnalysis = () => {
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    let projectedIncome = 0;
    let actualIncome = 0;

    leases?.forEach((lease) => {
      if (lease.status === "active") {
        projectedIncome += parseFloat(lease.monthlyRent);
      }
    });

    payments?.forEach((payment) => {
      const paymentDate = new Date(payment.paymentDate);
      if (paymentDate >= monthStart && paymentDate <= monthEnd) {
        actualIncome += parseFloat(payment.amount);
      }
    });

    const variance = projectedIncome - actualIncome;
    const collectionRate = projectedIncome > 0 ? (actualIncome / projectedIncome) * 100 : 0;

    return {
      projected: projectedIncome,
      actual: actualIncome,
      variance,
      collectionRate,
    };
  };

  // Calculate net profit
  const calculateNetProfit = () => {
    const incomeAnalysis = calculateIncomeAnalysis();
    const totalExpenses = 0; // Will be populated when expenses are added
    return incomeAnalysis.actual - totalExpenses;
  };

  const arrearsData = calculateArrearsAging();
  const incomeAnalysis = calculateIncomeAnalysis();
  const netProfit = calculateNetProfit();

  const chartData = [
    {
      month: "Current Month",
      Projected: incomeAnalysis.projected,
      Actual: incomeAnalysis.actual,
    },
  ];

  const handleDownloadStatement = async (leaseId: number) => {
    try {
      const lease = leases?.find(l => l.id === leaseId);
      const tenant = tenants?.find(t => t.id === lease?.tenantId);
      const unit = units?.find(u => u.id === lease?.unitId);

      const leaseInvoices = invoices?.filter(i => i.leaseId === leaseId) || [];
      const leasePayments = payments?.filter(p => p.leaseId === leaseId) || [];

      const totalInvoiced = leaseInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
      const totalPaid = leasePayments.reduce((sum, pay) => sum + parseFloat(pay.amount), 0);

      await generateStatementPDF({
        tenantName: `${tenant?.firstName} ${tenant?.lastName}`,
        unitNumber: unit?.unitNumber || "Unknown",
        startDate: new Date(lease?.startDate || new Date()),
        endDate: new Date(),
        invoices: leaseInvoices.map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: new Date(inv.invoiceDate),
          dueDate: new Date(inv.dueDate),
          amount: parseFloat(inv.totalAmount),
          paidAmount: parseFloat(inv.paidAmount),
          status: inv.status,
        })),
        payments: leasePayments.map(pay => ({
          paymentDate: new Date(pay.paymentDate),
          amount: parseFloat(pay.amount),
          reference: pay.transactionReference || undefined,
        })),
        totalInvoiced,
        totalPaid,
        balance: totalInvoiced - totalPaid,
      });
      toast.success("Statement downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate statement");
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">Advanced financial insights and reporting</p>
          </div>
          <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
            <Button className="gap-2" onClick={() => setIsExpenseOpen(true)}>
              <Plus className="h-4 w-4" />
              Record Expense
            </Button>
          </Dialog>
        </div>

        {/* Income Analysis */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Projected Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatKES(incomeAnalysis.projected)}</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Actual Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatKES(incomeAnalysis.actual)}</div>
              <p className="text-xs text-muted-foreground mt-1">Collected</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{incomeAnalysis.collectionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Of projected</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatKES(netProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Income Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Projected vs Actual Income</CardTitle>
            <CardDescription>Monthly income comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatKES(value as number)} />
                <Legend />
                <Bar dataKey="Projected" fill="#1e3a8a" />
                <Bar dataKey="Actual" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Arrears Aging Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Arrears Aging Report
            </CardTitle>
            <CardDescription>Tenants with outstanding payments by age</CardDescription>
          </CardHeader>
          <CardContent>
            {arrearsData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant Name</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>1 Month</TableHead>
                      <TableHead>2 Months</TableHead>
                      <TableHead>3+ Months</TableHead>
                      <TableHead className="text-right">Total Arrears</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {arrearsData.map((arrear, idx) => (
                      <TableRow key={idx} className={arrear.threeMonths > 0 ? "bg-red-50" : ""}>
                        <TableCell className="font-medium">{arrear.tenantName}</TableCell>
                        <TableCell>{arrear.unitNumber}</TableCell>
                        <TableCell>
                          {arrear.oneMonth > 0 ? (
                            <Badge variant="outline">{formatKES(arrear.oneMonth)}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {arrear.twoMonths > 0 ? (
                            <Badge variant="outline" className="bg-yellow-50">{formatKES(arrear.twoMonths)}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {arrear.threeMonths > 0 ? (
                            <Badge className="bg-red-600">{formatKES(arrear.threeMonths)}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {formatKES(arrear.totalArrears)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => {
                            const lease = leases?.find(l => {
                              const unit = units?.find(u => u.unitNumber === arrear.unitNumber);
                              return l.unitId === unit?.id;
                            });
                            if (lease) handleDownloadStatement(lease.id);
                          }}>
                            Statement
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No arrears found. All tenants are current on payments!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Expense Tracker
            </CardTitle>
            <CardDescription>Property maintenance and operational expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Expense tracking coming soon</p>
              <Button onClick={() => setIsExpenseOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Record First Expense
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Expense Recording Dialog */}
        <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Expense</DialogTitle>
              <DialogDescription>Add a new property expense</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="property">Property</Label>
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties?.map((prop) => (
                      <SelectItem key={prop.id} value={prop.id.toString()}>
                        {prop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repairs">Repairs & Maintenance</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="taxes">Taxes & Fees</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input type="number" placeholder="0.00" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea placeholder="Expense details..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={() => {
                toast.success("Expense recorded successfully");
                setIsExpenseOpen(false);
              }}>
                Record Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
