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
import { Plus, DollarSign, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { formatKES } from "@shared/currency";
import { generateReceiptPDF } from "@/lib/pdfGenerator";

export default function Payments() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any>(null);
  
  const { data: payments, isLoading } = trpc.payments.list.useQuery();
  const { data: invoices } = trpc.invoices.list.useQuery();
  const { data: leases } = trpc.leases.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: units } = trpc.units.list.useQuery();
  const utils = trpc.useUtils();
  
  const createMutation = trpc.payments.create.useMutation({
    onSuccess: () => {
      utils.payments.list.invalidate();
      utils.invoices.list.invalidate();
      setIsCreateOpen(false);
      toast.success("Payment recorded successfully");
    },
    onError: (error) => {
      toast.error("Failed to record payment: " + error.message);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const invoiceId = parseInt(formData.get("invoiceId") as string);
    const invoice = invoices?.find(inv => inv.id === invoiceId);
    
    if (!invoice) {
      toast.error("Invoice not found");
      return;
    }
    
    createMutation.mutate({
      invoiceId,
      leaseId: invoice.leaseId,
      paymentDate: new Date(formData.get("paymentDate") as string),
      amount: formData.get("amount") as string,
      paymentMethod: formData.get("paymentMethod") as any,
      transactionReference: formData.get("transactionReference") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      cash: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      mpesa: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      bank: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    };
    return colors[method] || "bg-gray-100 text-gray-800";
  };

  const getTenantName = (leaseId: number) => {
    const lease = leases?.find(l => l.id === leaseId);
    if (!lease) return "Unknown";
    const tenant = tenants?.find(t => t.id === lease.tenantId);
    return tenant ? `${tenant.firstName} ${tenant.lastName}` : "Unknown";
  };

  const getInvoiceNumber = (invoiceId: number) => {
    const invoice = invoices?.find(inv => inv.id === invoiceId);
    return invoice?.invoiceNumber || "Unknown";
  };

  const getUnitInfo = (leaseId: number) => {
    const lease = leases?.find(l => l.id === leaseId);
    if (!lease) return "Unknown";
    const unit = units?.find(u => u.id === lease.unitId);
    return unit?.unitNumber || "Unknown";
  };

  const handleDownloadReceipt = async (payment: any) => {
    try {
      const receiptNumber = `RCP-${payment.id.toString().padStart(5, '0')}`;
      const unitInfo = getUnitInfo(payment.leaseId);
      await generateReceiptPDF({
        receiptNumber,
        paymentDate: new Date(payment.paymentDate),
        tenantName: getTenantName(payment.leaseId),
        unitNumber: unitInfo,
        amount: parseFloat(payment.amount),
        paymentMethod: payment.paymentMethod,
        transactionReference: payment.transactionReference,
        notes: payment.notes,
      });
      toast.success("Receipt downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate receipt");
      console.error(error);
    }
  };

  const unpaidInvoices = invoices?.filter(inv => 
    inv.status === "unpaid" || inv.status === "partially_paid" || inv.status === "overdue"
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Payments</h1>
            <p className="text-muted-foreground mt-1">Record and track rental payments</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>Record a new payment against an invoice</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Invoice Selection</h3>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceId">Invoice</Label>
                      <Select name="invoiceId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select invoice" />
                        </SelectTrigger>
                        <SelectContent>
                          {unpaidInvoices.map((invoice) => {
                            const lease = leases?.find(l => l.id === invoice.leaseId);
                            const tenant = tenants?.find(t => t.id === lease?.tenantId);
                            const balance = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);
                            return (
                              <SelectItem key={invoice.id} value={invoice.id.toString()}>
                                {invoice.invoiceNumber} - {tenant?.firstName} {tenant?.lastName} (Balance: ${balance.toFixed(2)})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Payment Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="paymentDate">Payment Date</Label>
                        <Input id="paymentDate" name="paymentDate" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input id="amount" name="amount" type="number" step="0.01" placeholder="10000.00" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Payment Method</Label>
                        <Select name="paymentMethod" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="mpesa">M-Pesa</SelectItem>
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transactionReference">Transaction Reference</Label>
                        <Input id="transactionReference" name="transactionReference" placeholder="ABC123XYZ" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" placeholder="Additional payment notes..." rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Recording..." : "Record Payment"}
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
        ) : payments && payments.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{getTenantName(payment.leaseId)}</TableCell>
                      <TableCell>{getInvoiceNumber(payment.invoiceId)}</TableCell>
                      <TableCell className="font-semibold text-green-600">{formatKES(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge className={getPaymentMethodBadge(payment.paymentMethod)}>
                          {payment.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{payment.transactionReference || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleDownloadReceipt(payment)}
                        >
                          <Download className="h-4 w-4" />
                          Receipt
                        </Button>
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
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payments yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Record your first payment</p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Record Payment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
