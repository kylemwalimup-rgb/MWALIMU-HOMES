import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, Home } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation, useRoute } from "wouter";

export default function PropertyDetail() {
  const [, params] = useRoute("/properties/:id");
  const [, setLocation] = useLocation();
  const propertyId = params?.id ? parseInt(params.id) : 0;
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  
  const { data: property } = trpc.properties.getById.useQuery({ id: propertyId });
  const { data: units, isLoading } = trpc.units.getByPropertyId.useQuery({ propertyId });
  const utils = trpc.useUtils();
  
  const createMutation = trpc.units.create.useMutation({
    onSuccess: () => {
      utils.units.getByPropertyId.invalidate({ propertyId });
      setIsCreateOpen(false);
      toast.success("Unit created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create unit: " + error.message);
    },
  });
  
  const updateMutation = trpc.units.update.useMutation({
    onSuccess: () => {
      utils.units.getByPropertyId.invalidate({ propertyId });
      setEditingUnit(null);
      toast.success("Unit updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update unit: " + error.message);
    },
  });
  
  const deleteMutation = trpc.units.delete.useMutation({
    onSuccess: () => {
      utils.units.getByPropertyId.invalidate({ propertyId });
      toast.success("Unit deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete unit: " + error.message);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      propertyId,
      unitNumber: formData.get("unitNumber") as string,
      unitType: formData.get("unitType") as any,
      baseRent: formData.get("baseRent") as string,
      serviceCharge: formData.get("serviceCharge") as string || "0.00",
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingUnit.id,
      unitNumber: formData.get("unitNumber") as string,
      unitType: formData.get("unitType") as any,
      baseRent: formData.get("baseRent") as string,
      serviceCharge: formData.get("serviceCharge") as string,
      status: formData.get("status") as any,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this unit?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "vacant": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "occupied": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "maintenance": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" onClick={() => setLocation("/properties")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Properties
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{property?.name}</h1>
              <p className="text-muted-foreground mt-1">{property?.address}</p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Unit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>Create New Unit</DialogTitle>
                    <DialogDescription>Add a new unit to this property</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="unitNumber">Unit Number</Label>
                      <Input id="unitNumber" name="unitNumber" placeholder="A101" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitType">Unit Type</Label>
                      <Select name="unitType" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bedsitter">Bedsitter</SelectItem>
                          <SelectItem value="1BR">1 Bedroom</SelectItem>
                          <SelectItem value="2BR">2 Bedroom</SelectItem>
                          <SelectItem value="shop">Shop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="baseRent">Base Rent</Label>
                      <Input id="baseRent" name="baseRent" type="number" step="0.01" placeholder="10000.00" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serviceCharge">Service Charge</Label>
                      <Input id="serviceCharge" name="serviceCharge" type="number" step="0.01" placeholder="0.00" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Unit"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted" />
                <CardContent className="h-20" />
              </Card>
            ))}
          </div>
        ) : units && units.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {units.map((unit) => (
              <Card key={unit.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Unit {unit.unitNumber}</CardTitle>
                      <CardDescription className="mt-1">{unit.unitType}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(unit.status)}>{unit.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base Rent:</span>
                      <span className="font-medium">${parseFloat(unit.baseRent).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service Charge:</span>
                      <span className="font-medium">${parseFloat(unit.serviceCharge).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingUnit(unit)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(unit.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Home className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No units yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Add units to this property</p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Unit
              </Button>
            </CardContent>
          </Card>
        )}

        {editingUnit && (
          <Dialog open={!!editingUnit} onOpenChange={() => setEditingUnit(null)}>
            <DialogContent>
              <form onSubmit={handleUpdate}>
                <DialogHeader>
                  <DialogTitle>Edit Unit</DialogTitle>
                  <DialogDescription>Update unit information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-unitNumber">Unit Number</Label>
                    <Input id="edit-unitNumber" name="unitNumber" defaultValue={editingUnit.unitNumber} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-unitType">Unit Type</Label>
                    <Select name="unitType" defaultValue={editingUnit.unitType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bedsitter">Bedsitter</SelectItem>
                        <SelectItem value="1BR">1 Bedroom</SelectItem>
                        <SelectItem value="2BR">2 Bedroom</SelectItem>
                        <SelectItem value="shop">Shop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-baseRent">Base Rent</Label>
                    <Input id="edit-baseRent" name="baseRent" type="number" step="0.01" defaultValue={editingUnit.baseRent} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-serviceCharge">Service Charge</Label>
                    <Input id="edit-serviceCharge" name="serviceCharge" type="number" step="0.01" defaultValue={editingUnit.serviceCharge} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select name="status" defaultValue={editingUnit.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacant">Vacant</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Updating..." : "Update Unit"}
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
