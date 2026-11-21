import React, { useEffect, useMemo, useState } from "react";
import { apiCall } from "../../api/apiCall";
import { ENDPOINTS } from "../../api/endpoints";
import { toast } from "sonner";
import Loader from "@/components/common/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

interface BlogCategory {
  id: number;
  name: string;
  isActive: boolean | number | string;
  createdAt?: string;
  updatedAt?: string;
}

const toBoolean = (v: unknown) => v === true || v === 1 || v === "1";

const AdminBlogCategories: React.FC = () => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{ id: number | null; name: string; isActive: boolean }>(
    { id: null, name: "", isActive: true }
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const resetForm = () => setForm({ id: null, name: "", isActive: true });

  const fetchCategories = async () => {
    setLoading(true);
    const res = await apiCall("get", ENDPOINTS.ADMIN_BLOG_CATEGORY);
    if (res.success) {
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setCategories(list as BlogCategory[]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setLoading(true);
    const payload = { name: form.name.trim(), isActive: !!form.isActive };
    const res = form.id
      ? await apiCall("put", `${ENDPOINTS.ADMIN_BLOG_CATEGORY_CREATE}/${form.id}`, payload)
      : await apiCall("post", ENDPOINTS.ADMIN_BLOG_CATEGORY_CREATE, payload);

    if (res.success) {
      toast.success(`Category ${form.id ? "updated" : "created"} successfully`);
      resetForm();
      await fetchCategories();
    }
    setLoading(false);
  };

  const handleToggleActive = async (cat: BlogCategory) => {
    const next = !toBoolean(cat.isActive);
    const res = await apiCall("put", `${ENDPOINTS.ADMIN_BLOG_CATEGORY_CREATE}/${cat.id}`, {
      name: cat.name,
      isActive: next,
    });
    if (res.success) {
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, isActive: next } : c)));
      toast.success(`Category ${next ? "activated" : "deactivated"}`);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setLoading(true);
    const res = await apiCall("delete", `${ENDPOINTS.ADMIN_BLOG_CATEGORY_CREATE}/${deletingId}`);
    if (res.success) {
      toast.success("Category deleted successfully");
      setCategories((prev) => prev.filter((c) => c.id !== deletingId));
      setDeletingId(null);
    }
    setLoading(false);
  };

  const editing = useMemo(() => form.id !== null, [form.id]);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {loading && <Loader />}
      <header>
        <h1 className="text-2xl font-semibold">Story Categories</h1>
        <p className="text-sm text-muted-foreground">Create, edit, and manage story categories.</p>
      </header>

      <section className="flex flex-col gap-6">
        <article className="rounded-lg border bg-background p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">{editing ? "Edit Category" : "Add Category"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Study"
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
            <h2 className="text-lg font-medium">Category List</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(categories) && categories.length > 0 ? (
                categories.map((cat, idx) => (
                  <TableRow key={cat.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
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
                        onClick={() => setForm({ id: cat.id, name: cat.name, isActive: toBoolean(cat.isActive) })}
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
                            <AlertDialogTitle>Delete Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this category.
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
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No categories found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableCaption>Manage your story taxonomy efficiently.</TableCaption>
          </Table>
        </article>
      </section>
    </div>
  );
};

export default AdminBlogCategories;
