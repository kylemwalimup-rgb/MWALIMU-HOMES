import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Users as UsersIcon, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

export default function Tenants() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  
  const { data: tenants, isLoading } = trpc.tenants.list.useQuery();
  const utils = trpc.useUtils();
  
  const createMutation = trpc.tenants.create.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      setIsCreateOpen(false);
      toast.success("Tenant created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create tenant: " + error.message);
    },
  });
  
  const updateMutation = trpc.tenants.update.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      setEditingTenant(null);
      toast.success("Tenant updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update tenant: " + error.message);
    },
  });
  
  const deleteMutation = trpc.tenants.delete.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      toast.success("Tenant deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete tenant: " + error.message);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string || undefined,
      phone: formData.get("phone") as string,
      idNumber: formData.get("idNumber") as string,
      emergencyContact: formData.get("emergencyContact") as string || undefined,
      emergencyContactName: formData.get("emergencyContactName") as string || undefined,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingTenant.id,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string || undefined,
      phone: formData.get("phone") as string,
      idNumber: formData.get("idNumber") as string,
      emergencyContact: formData.get("emergencyContact") as string || undefined,
      emergencyContactName: formData.get("emergencyContactName") as string || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this tenant?")) {
      deleteMutation.mutate({ id });
    }
  };

  const TenantForm = ({ tenant, onSubmit, isPending }: any) => (
    <form onSubmit={onSubmit}>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" name="firstName" defaultValue={tenant?.firstName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" name="lastName" defaultValue={tenant?.lastName} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={tenant?.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={tenant?.phone} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="idNumber">ID Number</Label>
          <Input id="idNumber" name="idNumber" defaultValue={tenant?.idNumber} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
          <Input id="emergencyContactName" name="emergencyContactName" defaultValue={tenant?.emergencyContactName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emergencyContact">Emergency Contact Phone</Label>
          <Input id="emergencyContact" name="emergencyContact" defaultValue={tenant?.emergencyContact} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : tenant ? "Update Tenant" : "Create Tenant"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Tenants</h1>
            <p className="text-muted-foreground mt-1">Manage tenant information and contacts</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
                <DialogDescription>Add a new tenant to the system</DialogDescription>
              </DialogHeader>
              <TenantForm onSubmit={handleCreate} isPending={createMutation.isPending} />
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
        ) : tenants && tenants.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          {tenant.firstName} {tenant.lastName}
                        </div>
                      </TableCell>
                      <TableCell>{tenant.email || "-"}</TableCell>
                      <TableCell>{tenant.phone}</TableCell>
                      <TableCell>{tenant.idNumber}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTenant(tenant)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(tenant.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
              <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tenants yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Add your first tenant to get started</p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Tenant
              </Button>
            </CardContent>
          </Card>
        )}

        {editingTenant && (
          <Dialog open={!!editingTenant} onOpenChange={() => setEditingTenant(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Tenant</DialogTitle>
                <DialogDescription>Update tenant information</DialogDescription>
              </DialogHeader>
              <TenantForm tenant={editingTenant} onSubmit={handleUpdate} isPending={updateMutation.isPending} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
