import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { formatKES } from "@shared/currency";

export default function InvoiceReview() {
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: leases } = trpc.leases.list.useQuery() || { data: [] };
  const { data: tenants } = trpc.tenants.list.useQuery() || { data: [] };
  const { data: units } = trpc.units.list.useQuery() || { data: [] };

  // Mock pending invoices data - in real app would come from API
  const pendingInvoices = [
    {
      id: 1,
      invoiceNumber: "INV-202501-ABC123",
      leaseId: 1,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      periodStart: new Date(2025, 0, 1),
      periodEnd: new Date(2025, 0, 31),
      rentAmount: "50000",
      serviceChargeAmount: "5000",
      utilitiesAmount: "0",
      totalAmount: "55000",
      notes: "Auto-generated invoice for January 2025",
    },
  ];

  const getTenantName = (leaseId: number) => {
    const lease = leases?.find(l => l.id === leaseId);
    if (!lease) return "Unknown";
    const tenant = tenants?.find(t => t.id === lease.tenantId);
    return tenant ? `${tenant.firstName} ${tenant.lastName}` : "Unknown";
  };

  const getUnitNumber = (leaseId: number) => {
    const lease = leases?.find(l => l.id === leaseId);
    if (!lease) return "Unknown";
    const unit = units?.find(u => u.id === lease.unitId);
    return unit?.unitNumber || "Unknown";
  };

  const handleSelectInvoice = (id: number) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInvoices(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedInvoices.size === pendingInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(pendingInvoices.map(inv => inv.id)));
    }
  };

  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice({ ...invoice });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    toast.success("Invoice updated successfully");
    setIsEditOpen(false);
    setEditingInvoice(null);
  };

  const handleFinalizeSelected = () => {
    if (selectedInvoices.size === 0) {
      toast.error("Please select at least one invoice");
      return;
    }

    toast.success(`Finalized ${selectedInvoices.size} invoices. Ready for collection.`);
    setSelectedInvoices(new Set());
  };

  const handleRejectSelected = () => {
    if (selectedInvoices.size === 0) {
      toast.error("Please select at least one invoice");
      return;
    }

    toast.success(`Rejected ${selectedInvoices.size} invoices. They have been removed.`);
    setSelectedInvoices(new Set());
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Review Pending Invoices</h1>
            <p className="text-muted-foreground mt-1">Review and approve auto-generated invoices before finalization</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingInvoices.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Invoices awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatKES(
                  pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">To be invoiced</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedInvoices.size}</div>
              <p className="text-xs text-muted-foreground mt-1">For action</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        {selectedInvoices.size > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6 flex gap-3">
              <Button onClick={handleFinalizeSelected} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Finalize {selectedInvoices.size} Selected
              </Button>
              <Button onClick={handleRejectSelected} variant="outline" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Reject Selected
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Invoices</CardTitle>
            <CardDescription>Review and make adjustments before finalizing</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedInvoices.size === pendingInvoices.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Rent</TableHead>
                      <TableHead className="text-right">Service Charge</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className={selectedInvoices.has(invoice.id) ? "bg-blue-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedInvoices.has(invoice.id)}
                            onCheckedChange={() => handleSelectInvoice(invoice.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{getTenantName(invoice.leaseId)}</TableCell>
                        <TableCell>{getUnitNumber(invoice.leaseId)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(invoice.periodStart).toLocaleDateString()} -{" "}
                          {new Date(invoice.periodEnd).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">{formatKES(invoice.rentAmount)}</TableCell>
                        <TableCell className="text-right">{formatKES(invoice.serviceChargeAmount)}</TableCell>
                        <TableCell className="text-right font-bold">{formatKES(invoice.totalAmount)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditInvoice(invoice)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No pending invoices</p>
                <p className="text-sm text-muted-foreground">All invoices have been finalized or the next generation hasn't run yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Invoice Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Invoice</DialogTitle>
              <DialogDescription>Make adjustments before finalizing</DialogDescription>
            </DialogHeader>
            {editingInvoice && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Invoice Number</Label>
                    <Input value={editingInvoice.invoiceNumber} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Date</Label>
                    <Input type="date" value={editingInvoice.invoiceDate.toISOString().split("T")[0]} disabled />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rent Amount (KSh)</Label>
                    <Input
                      type="number"
                      value={editingInvoice.rentAmount}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          rentAmount: e.target.value,
                          totalAmount: (
                            parseFloat(e.target.value) +
                            parseFloat(editingInvoice.serviceChargeAmount) +
                            parseFloat(editingInvoice.utilitiesAmount)
                          ).toString(),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Service Charge (KSh)</Label>
                    <Input
                      type="number"
                      value={editingInvoice.serviceChargeAmount}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          serviceChargeAmount: e.target.value,
                          totalAmount: (
                            parseFloat(editingInvoice.rentAmount) +
                            parseFloat(e.target.value) +
                            parseFloat(editingInvoice.utilitiesAmount)
                          ).toString(),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Utilities (KSh)</Label>
                    <Input
                      type="number"
                      value={editingInvoice.utilitiesAmount}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          utilitiesAmount: e.target.value,
                          totalAmount: (
                            parseFloat(editingInvoice.rentAmount) +
                            parseFloat(editingInvoice.serviceChargeAmount) +
                            parseFloat(e.target.value)
                          ).toString(),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Amount (KSh)</Label>
                    <Input type="number" value={editingInvoice.totalAmount} disabled className="bg-muted" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={editingInvoice.notes}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, notes: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
