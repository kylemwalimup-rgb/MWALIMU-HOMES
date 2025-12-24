import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Pencil, Trash2, Home } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation } from "wouter";
import { formatKES } from "@shared/currency";

export default function Properties() {
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  
  const { data: properties, isLoading } = trpc.properties.list.useQuery();
  const utils = trpc.useUtils();
  
  const createMutation = trpc.properties.create.useMutation({
    onSuccess: () => {
      utils.properties.list.invalidate();
      setIsCreateOpen(false);
      toast.success("Property created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create property: " + error.message);
    },
  });
  
  const updateMutation = trpc.properties.update.useMutation({
    onSuccess: () => {
      utils.properties.list.invalidate();
      setEditingProperty(null);
      toast.success("Property updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update property: " + error.message);
    },
  });
  
  const deleteMutation = trpc.properties.delete.useMutation({
    onSuccess: () => {
      utils.properties.list.invalidate();
      toast.success("Property deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete property: " + error.message);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      description: formData.get("description") as string || undefined,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingProperty.id,
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      description: formData.get("description") as string || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this property?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Properties</h1>
            <p className="text-muted-foreground mt-1">Manage your rental properties and units</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create New Property</DialogTitle>
                  <DialogDescription>Add a new rental property to your portfolio</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Property Name</Label>
                    <Input id="name" name="name" placeholder="Sunset Apartments" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" name="address" placeholder="123 Main Street, City" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" placeholder="Property details..." rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Property"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-32 bg-muted" />
                <CardContent className="h-24" />
              </Card>
            ))}
          </div>
        ) : properties && properties.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{property.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">{property.address}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {property.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{property.description}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => setLocation(`/properties/${property.id}`)}
                    >
                      <Home className="h-4 w-4" />
                      View Units
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingProperty(property)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(property.id)}
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
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Get started by adding your first property</p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Property
              </Button>
            </CardContent>
          </Card>
        )}

        {editingProperty && (
          <Dialog open={!!editingProperty} onOpenChange={() => setEditingProperty(null)}>
            <DialogContent>
              <form onSubmit={handleUpdate}>
                <DialogHeader>
                  <DialogTitle>Edit Property</DialogTitle>
                  <DialogDescription>Update property information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Property Name</Label>
                    <Input id="edit-name" name="name" defaultValue={editingProperty.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input id="edit-address" name="address" defaultValue={editingProperty.address} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea id="edit-description" name="description" defaultValue={editingProperty.description || ""} rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Updating..." : "Update Property"}
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
