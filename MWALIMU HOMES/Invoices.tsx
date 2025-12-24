import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { formatKES } from "@shared/currency";

export default function Invoices() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const { data: invoices, isLoading } = trpc.invoices.list.useQuery();
  const { data: leases } = trpc.leases.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: units } = trpc.units.list.useQuery();
  const utils = trpc.useUtils();
  
  const createMutation = trpc.invoices.create.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      setIsCreateOpen(false);
      toast.success("Invoice created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create invoice: " + error.message);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const leaseId = parseInt(formData.get("leaseId") as string);
    const invoiceDate = new Date(formData.get("invoiceDate") as string);
    const dueDate = new Date(formData.get("dueDate") as string);
    const periodStart = new Date(formData.get("periodStart") as string);
    const periodEnd = new Date(formData.get("periodEnd") as string);
    
    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${leaseId}`;
    
    createMutation.mutate({
      leaseId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      periodStart,
      periodEnd,
      rentAmount: formData.get("rentAmount") as string,
      serviceChargeAmount: formData.get("serviceChargeAmount") as string || "0.00",
      utilitiesAmount: formData.get("utilitiesAmount") as string || "0.00",
      notes: formData.get("notes") as string || undefined,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fully_paid": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "partially_paid": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "unpaid": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "overdue": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTenantName = (leaseId: number) => {
    const lease = leases?.find(l => l.id === leaseId);
    if (!lease) return "Unknown";
    const tenant = tenants?.find(t => t.id === lease.tenantId);
    return tenant ? `${tenant.firstName} ${tenant.lastName}` : "Unknown";
  };

  const getUnitInfo = (leaseId: number) => {
    const lease = leases?.find(l => l.id === leaseId);
    if (!lease) return "Unknown";
    const unit = units?.find(u => u.id === lease.unitId);
    return unit ? `Unit ${unit.unitNumber}` : "Unknown";
  };

  const activeLeases = leases?.filter(l => l.status === "active") || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground mt-1">Manage rental invoices and billing</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create New Invoice</DialogTitle>
                  <DialogDescription>Generate a rental invoice for a tenant</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Lease Selection</h3>
                    <div className="space-y-2">
                      <Label htmlFor="leaseId">Active Lease</Label>
                      <Select name="leaseId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lease" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeLeases.map((lease) => {
                            const tenant = tenants?.find(t => t.id === lease.tenantId);
                            const unit = units?.find(u => u.id === lease.unitId);
                            return (
                              <SelectItem key={lease.id} value={lease.id.toString()}>
                                {tenant?.firstName} {tenant?.lastName} - Unit {unit?.unitNumber}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Invoice Dates</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="invoiceDate">Invoice Date</Label>
                        <Input id="invoiceDate" name="invoiceDate" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input id="dueDate" name="dueDate" type="date" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="periodStart">Period Start</Label>
                        <Input id="periodStart" name="periodStart" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="periodEnd">Period End</Label>
                        <Input id="periodEnd" name="periodEnd" type="date" required />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Invoice Amounts</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rentAmount">Rent Amount</Label>
                        <Input id="rentAmount" name="rentAmount" type="number" step="0.01" placeholder="10000.00" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="serviceChargeAmount">Service Charge</Label>
                        <Input id="serviceChargeAmount" name="serviceChargeAmount" type="number" step="0.01" placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="utilitiesAmount">Utilities</Label>
                        <Input id="utilitiesAmount" name="utilitiesAmount" type="number" step="0.01" placeholder="0.00" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" placeholder="Additional notes..." rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Invoice"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : invoices && invoices.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{getTenantName(invoice.leaseId)}</TableCell>
                      <TableCell>{getUnitInfo(invoice.leaseId)}</TableCell>
                      <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>{formatKES(invoice.totalAmount)}</TableCell>
                      <TableCell>{formatKES(invoice.paidAmount)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first invoice</p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Invoice
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
