import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export default function PaymentsWithPDF() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any>(null);
  
  const { data: payments, isLoading } = trpc.payments.list.useQuery();
  const { data: leases } = trpc.leases.list.useQuery();
  const { data: invoices } = trpc.invoices.list.useQuery();
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
    createMutation.mutate({
      leaseId: parseInt(formData.get("leaseId") as string),
      invoiceId: parseInt(formData.get("invoiceId") as string),
      amount: parseFloat(formData.get("amount") as string),
      paymentDate: new Date(formData.get("paymentDate") as string),
      paymentMethod: formData.get("paymentMethod") as string,
      transactionReference: formData.get("transactionReference") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const getTenantName = (leaseId: number) => {
    const lease = leases?.find(l => l.id === leaseId);
    return lease?.tenantName || "Unknown";
  };

  const getInvoiceNumber = (invoiceId: number) => {
    const invoice = invoices?.find(i => i.id === invoiceId);
    return invoice?.invoiceNumber || "Unknown";
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      "Cash": "bg-green-100 text-green-800",
      "M-Pesa": "bg-yellow-100 text-yellow-800",
      "Bank": "bg-blue-100 text-blue-800",
    };
    return colors[method] || "bg-gray-100 text-gray-800";
  };

  const handleDownloadReceipt = async (payment: any) => {
    try {
      const receiptNumber = `RCP-${payment.id.toString().padStart(5, '0')}`;
      await generateReceiptPDF({
        receiptNumber,
        paymentDate: new Date(payment.paymentDate),
        tenantName: getTenantName(payment.leaseId),
        unitNumber: leases?.find(l => l.id === payment.leaseId)?.unitNumber || "Unknown",
        amount: payment.amount,
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Payments</h1>
            <p className="text-muted-foreground mt-1">Record and manage tenant payments</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Record Payment
            </Button>
          </Dialog>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-pulse">Loading payments...</div>
            </CardContent>
          </Card>
        ) : payments && payments.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All recorded tenant payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Invoice</TableHead>
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
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.transactionReference || "-"}
                        </TableCell>
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
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payments recorded</h3>
              <p className="text-sm text-muted-foreground mb-4">Start by recording the first payment</p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Record Payment
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>Add a new tenant payment record</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="leaseId">Lease</Label>
                  <Select name="leaseId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lease" />
                    </SelectTrigger>
                    <SelectContent>
                      {leases?.map((lease) => (
                        <SelectItem key={lease.id} value={lease.id.toString()}>
                          {lease.tenantName} - {lease.unitNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceId">Invoice</Label>
                  <Select name="invoiceId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices?.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id.toString()}>
                          {invoice.invoiceNumber} - {formatKES(invoice.totalAmount)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input id="paymentDate" name="paymentDate" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select name="paymentMethod" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transactionReference">Transaction Reference Code</Label>
                  <Input
                    id="transactionReference"
                    name="transactionReference"
                    placeholder="e.g., ABC123XYZ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Additional payment notes..."
                    rows={3}
                  />
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
    </DashboardLayout>
  );
}
