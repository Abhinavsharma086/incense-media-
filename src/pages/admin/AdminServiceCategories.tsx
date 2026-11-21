import React, { useEffect, useMemo, useState } from "react";
import { apiCall } from "../../api/apiCall";
import { ENDPOINTS } from "../../api/endpoints";
import { toast } from "sonner";
import Loader from "@/components/common/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ServiceCategory {
  id: number;
  name: string;
  slug: string | "service-category";
  description: string;
  image?: string;
  isActive: boolean | number | string;
  createdAt?: string;
  updatedAt?: string;
}

const toBoolean = (v: unknown) => v === true || v === 1 || v === "1";

const AdminServiceCategories: React.FC = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{ 
    id: number | null; 
    name: string; 
    slug: string | "service-category"; 
    description: string; 
    isActive: boolean;
    image: File | null;
  }>({
    id: null, 
    name: "", 
    slug: "service-category", 
    description: "", 
    isActive: true,
    image: null
  });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const resetForm = () => setForm({ 
    id: null, 
    name: "", 
    slug: "service-category", 
    description: "", 
    isActive: true,
    image: null
  });

  const fetchCategories = async () => {
    setLoading(true);
    const res = await apiCall("get", ENDPOINTS.ADMIN_MASTERS("service-category"));
    if (res.success) {
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setCategories(list as ServiceCategory[]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.slug.trim()) {
      toast.error("Slug is required");
      return;
    }
    
    setLoading(true);
    
    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("slug", "service-category");
    formData.append("description", form.description.trim());
    formData.append("isActive", form.isActive.toString());
    
    if (form.image) {
      formData.append("image", form.image);
    }

    const res = form.id
      ? await apiCall("put", ENDPOINTS.ADMIN_MASTER_UPDATE(form.id.toString()), formData)
      : await apiCall("post", ENDPOINTS.ADMIN_MASTER_CREATE, formData);

    if (res.success) {
      toast.success(`Service Category ${form.id ? "updated" : "created"} successfully`);
      resetForm();
      await fetchCategories();
    }
    setLoading(false);
  };

  const handleToggleActive = async (cat: ServiceCategory) => {
    const next = !toBoolean(cat.isActive);
    const formData = new FormData();
    formData.append("name", cat.name);
    formData.append("slug", "service-category");
    formData.append("description", cat.description);
    formData.append("isActive", next.toString());
    
    const res = await apiCall("put", ENDPOINTS.ADMIN_MASTER_UPDATE(cat.id.toString()), formData);
    if (res.success) {
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, isActive: next } : c)));
      toast.success(`Service Category ${next ? "activated" : "deactivated"}`);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setLoading(true);
    const res = await apiCall("delete", ENDPOINTS.ADMIN_MASTER_DELETE(deletingId.toString()));
    if (res.success) {
      toast.success("Service Category deleted successfully");
      setCategories((prev) => prev.filter((c) => c.id !== deletingId));
      setDeletingId(null);
    }
    setLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((f) => ({ ...f, image: file }));
    }
  };

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm((f) => ({ ...f, name, slug }));
  };

  const editing = useMemo(() => form.id !== null, [form.id]);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      
      <header>
        <h1 className="text-2xl font-semibold">Service Categories</h1>
        <p className="text-sm text-muted-foreground">Create, edit, and manage service categories.</p>
      </header>

      <section className="flex flex-col gap-6">
        <article className="rounded-lg border bg-background p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">{editing ? "Edit Service Category" : "Add Service Category"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Innovation"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="active">Active</Label>
                <p className="text-xs text-muted-foreground">Controls visibility across the site.</p>
              </div>
              <Switch
                id="active"
                checked={!!form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
            
            <div className="flex items-center gap-2">
              {editing && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
            </div>
          </form>
        </article>

        <article className="rounded-lg border bg-background p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Service Category List</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {loading && <Loader />}
              {Array.isArray(categories) && categories.length > 0 ? (
                categories.map((cat, idx) => (
                  <TableRow key={cat.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{cat.description}</TableCell>
                    <TableCell>
                      {cat.image ? (
                        <img 
                          src={cat.image} 
                          alt={cat.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">No image</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={toBoolean(cat.isActive)}
                          onCheckedChange={() => handleToggleActive(cat)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {toBoolean(cat.isActive) ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cat.createdAt ? new Date(cat.createdAt).toLocaleString() : "--"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setForm({ 
                          id: cat.id, 
                          name: cat.name, 
                          slug: cat.slug,
                          description: cat.description,
                          isActive: toBoolean(cat.isActive),
                          image: null
                        })}
                      >
                        Edit
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" onClick={() => setDeletingId(cat.id)}>
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Service Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this service category.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    No service categories found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableCaption>Manage your service categories efficiently.</TableCaption>
          </Table>
        </article>
      </section>
    </div>
  );
};

export default AdminServiceCategories;
