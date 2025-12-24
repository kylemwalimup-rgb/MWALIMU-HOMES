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
import { Plus, FileText, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { formatKES } from "@shared/currency";

export default function Leases() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [terminatingLease, setTerminatingLease] = useState<any>(null);
  
  const { data: leases, isLoading } = trpc.leases.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: units } = trpc.units.list.useQuery();
  const utils = trpc.useUtils();
  
  const createMutation = trpc.leases.create.useMutation({
    onSuccess: () => {
      utils.leases.list.invalidate();
      utils.units.list.invalidate();
      setIsCreateOpen(false);
      toast.success("Lease created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create lease: " + error.message);
    },
  });
  
  const terminateMutation = trpc.leases.terminate.useMutation({
    onSuccess: () => {
      utils.leases.list.invalidate();
      utils.units.list.invalidate();
      setTerminatingLease(null);
      toast.success("Lease terminated successfully");
    },
    onError: (error) => {
      toast.error("Failed to terminate lease: " + error.message);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      tenantId: parseInt(formData.get("tenantId") as string),
      unitId: parseInt(formData.get("unitId") as string),
      startDate: new Date(formData.get("startDate") as string),
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : undefined,
      monthlyRent: formData.get("monthlyRent") as string,
      serviceCharge: formData.get("serviceCharge") as string || "0.00",
      securityDeposit: formData.get("securityDeposit") as string,
      openingBalance: formData.get("openingBalance") as string || "0.00",
      moveInInspection: formData.get("moveInInspection") as string || undefined,
    });
  };

  const handleTerminate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    terminateMutation.mutate({
      id: terminatingLease.id,
      terminationDate: new Date(formData.get("terminationDate") as string),
      terminationNotes: formData.get("terminationNotes") as string || undefined,
      depositDeduction: formData.get("depositDeduction") as string || "0.00",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "terminated": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "expired": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTenantName = (tenantId: number) => {
    const tenant = tenants?.find(t => t.id === tenantId);
    return tenant ? `${tenant.firstName} ${tenant.lastName}` : "Unknown";
  };

  const getUnitInfo = (unitId: number) => {
    const unit = units?.find(u => u.id === unitId);
    if (!unit) return "Unknown";
    const property = unit.propertyId;
    return `Unit ${unit.unitNumber}`;
  };

  const vacantUnits = units?.filter(u => u.status === "vacant") || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Leases</h1>
            <p className="text-muted-foreground mt-1">Manage rental agreements and tenant onboarding</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Lease
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create New Lease</DialogTitle>
                  <DialogDescription>Complete tenant onboarding and lease agreement</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Tenant & Unit Selection</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tenantId">Tenant</Label>
                        <Select name="tenantId" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tenant" />
                          </SelectTrigger>
                          <SelectContent>
                            {tenants?.map((tenant) => (
                              <SelectItem key={tenant.id} value={tenant.id.toString()}>
                                {tenant.firstName} {tenant.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unitId">Unit</Label>
                        <Select name="unitId" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {vacantUnits.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id.toString()}>
                                Unit {unit.unitNumber} - {unit.unitType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Lease Terms</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Lease Start Date</Label>
                        <Input id="startDate" name="startDate" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">Lease End Date (Optional)</Label>
                        <Input id="endDate" name="endDate" type="date" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Financial Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="monthlyRent">Monthly Rent</Label>
                        <Input id="monthlyRent" name="monthlyRent" type="number" step="0.01" placeholder="10000.00" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="serviceCharge">Service Charge</Label>
                        <Input id="serviceCharge" name="serviceCharge" type="number" step="0.01" placeholder="0.00" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="securityDeposit">Security Deposit</Label>
                        <Input id="securityDeposit" name="securityDeposit" type="number" step="0.01" placeholder="10000.00" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="openingBalance">Opening Balance (Arrears)</Label>
                        <Input id="openingBalance" name="openingBalance" type="number" step="0.01" placeholder="0.00" />
                        <p className="text-xs text-muted-foreground">For existing arrears from previous tenancy</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Move-In Inspection</h3>
                    <div className="space-y-2">
                      <Label htmlFor="moveInInspection">Inspection Notes</Label>
                      <Textarea 
                        id="moveInInspection" 
                        name="moveInInspection" 
                        placeholder="Document the condition of the unit at move-in..."
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Lease"}
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
        ) : leases && leases.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Deposit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leases.map((lease) => (
                    <TableRow key={lease.id}>
                      <TableCell className="font-medium">{getTenantName(lease.tenantId)}</TableCell>
                      <TableCell>{getUnitInfo(lease.unitId)}</TableCell>
                      <TableCell>{new Date(lease.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{formatKES(lease.monthlyRent)}</TableCell>
                      <TableCell>{formatKES(lease.securityDeposit)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(lease.status)}>{lease.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {lease.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTerminatingLease(lease)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Terminate
                          </Button>
                        )}
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
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leases yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first lease agreement</p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Lease
              </Button>
            </CardContent>
          </Card>
        )}

        {terminatingLease && (
          <Dialog open={!!terminatingLease} onOpenChange={() => setTerminatingLease(null)}>
            <DialogContent>
              <form onSubmit={handleTerminate}>
                <DialogHeader>
                  <DialogTitle>Terminate Lease</DialogTitle>
                  <DialogDescription>Complete the move-out process and final settlement</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="terminationDate">Termination Date</Label>
                    <Input id="terminationDate" name="terminationDate" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="depositDeduction">Deposit Deduction (Repairs)</Label>
                    <Input 
                      id="depositDeduction" 
                      name="depositDeduction" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      max={terminatingLease.securityDeposit}
                    />
                    <p className="text-xs text-muted-foreground">
                      Security deposit: {formatKES(terminatingLease.securityDeposit)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="terminationNotes">Termination Notes</Label>
                    <Textarea 
                      id="terminationNotes" 
                      name="terminationNotes" 
                      placeholder="Reason for termination, final inspection notes..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" variant="destructive" disabled={terminateMutation.isPending}>
                    {terminateMutation.isPending ? "Terminating..." : "Terminate Lease"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
