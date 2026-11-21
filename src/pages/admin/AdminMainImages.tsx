import React, { useEffect, useState } from "react";
import { apiCall } from "@/api/apiCall";
import { ENDPOINTS } from "@/api/endpoints";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Image as ImageIcon } from "lucide-react";
import ClickableImage from "@/components/common/ClickableImage";
import ImageDimensionNote from "@/lib/ImageDimensionNote";

interface MainImageCategory {
    id: number;
    name: string;
    slug: string;
    description: string;
    image?: string;
    isActive: boolean | number | string;
    createdAt?: string;
    updatedAt?: string;
}

const toBoolean = (v: unknown) => v === true || v === 1 || v === "1";

const AdminMainImages: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"publication" | "events">("publication");
    const [publicationCategories, setPublicationCategories] = useState<MainImageCategory[]>([]);
    const [eventCategories, setEventCategories] = useState<MainImageCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<{
        id: number | null;
        name: string;
        description: string;
        image?: File | string;
        isActive: boolean;
        slug: string;
    }>({
        id: null,
        name: "",
        description: "",
        image: "",
        isActive: true,
        slug: ""
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    console.log(form);
    const resetForm = () => {
        setForm({
            id: null,
            name: "",
            description: "",
            image: "",
            isActive: true,
            slug: ""
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setForm({ ...form, image: file });
        }
    };

    const fetchCategories = async (type: "publication" | "events") => {
        setLoading(true);
        try {
            // Try the new specific endpoint first, fallback to masters endpoint

            const slug = type === "publication" ? "publication-images" : "event-images";
            let response = await apiCall("get", ENDPOINTS.ADMIN_MASTERS(slug));

            if (response.data?.success) {
                if (type === "publication") {
                    setPublicationCategories(response.data.data || []);
                } else {
                    setEventCategories(response.data.data || []);
                }
            }
        } catch (error) {
            console.error(`Error fetching ${type} categories:`, error);
            toast.error(`Failed to fetch ${type} categories`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories("publication");
        fetchCategories("events");
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const currentCategories = activeTab === "publication" ? publicationCategories : eventCategories;

        // Category limit removed

        setLoading(true);
        try {
            const formData = new FormData();
            
            if (form.id) {
                // For updates, use existing values
                formData.append('name', form.name.trim());
                formData.append('description', form.description.trim());
                formData.append('isActive', form.isActive.toString());
                formData.append('slug', form.slug);
                
                // Only append image if it's a new file
                if (form.image instanceof File) {
                    formData.append('image', form.image);
                }
            } else {
                // For new categories, set static values
                const staticName = activeTab === "publication" ? "Publication Image" : "Event Image";
                const staticDescription = activeTab === "publication" ? "Publication image" : "Event image";
                const staticSlug = activeTab === "publication" ? "publication-images" : "event-images";
                
                formData.append('name', staticName);
                formData.append('description', staticDescription);
                formData.append('isActive', form.isActive.toString());
                formData.append('slug', staticSlug);
                
                // Append image file if selected
                if (form.image instanceof File) {
                    formData.append('image', form.image);
                }
            }

            let response;
            if (form.id) {
                response = await apiCall("put", ENDPOINTS.ADMIN_MASTER_UPDATE(form.id.toString()), formData,
                );
            } else {
                response = await apiCall("post",
                    ENDPOINTS.ADMIN_MASTER_CREATE,
                    formData,
                );
            }

            if (response.data?.success) {
                toast.success(`Category ${form.id ? 'updated' : 'created'} successfully`);
                setIsDialogOpen(false);
                resetForm();
                fetchCategories(activeTab);
            }
        } catch (error) {
            console.error("Error saving category:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (category: MainImageCategory) => {
        setForm({
            id: category.id,
            name: category.name,
            description: category.description || "",
            image: category.image || "",
            isActive: toBoolean(category.isActive),
            slug: category.slug
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        setLoading(true);
        try {
            let response;
            response = await apiCall("delete", ENDPOINTS.ADMIN_MASTER_DELETE(id.toString()));

            if (response.data?.success) {
                toast.success("Category deleted successfully");
                fetchCategories(activeTab);
            }
        } catch (error) {
            console.error("Error deleting category:", error);
            toast.error("Failed to delete category");
        } finally {
            setLoading(false);
            setDeletingId(null);
        }
    };

    const currentCategories = activeTab === "publication" ? publicationCategories : eventCategories;
    // const maxCategoriesReached = false;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Main Images Management</h1>
                    <p className="text-gray-600 mt-1">Manage publication and event image categories</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "publication" | "events")}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="publication">Publication Images</TabsTrigger>
                    <TabsTrigger value="events">Event Images</TabsTrigger>
                </TabsList>

                <TabsContent value="publication" className="mt-6">
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-semibold">Publication Image Categories</h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Manage categories for publication images
                                    </p>
                                </div>
                                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            onClick={resetForm}
                                            
                                            className="flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Image
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {form.id ? 'Edit Publication Category' : 'Add Publication Category'}
                                            </DialogTitle>
                                            <DialogDescription>
                                                {form.id ? 'Update the publication category details.' : 'Create a new publication category.'}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleSubmit}>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="image">Upload Image</Label>
                                                    <Input
                                                        id="image"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageChange}
                                                    />
                                                    <ImageDimensionNote
                                                        type="covers"
                                                    />
                                                    {form.image instanceof File && (
                                                        <div className="mt-2">
                                                            <img 
                                                                src={URL.createObjectURL(form.image)} 
                                                                alt="Preview" 
                                                                crossOrigin="anonymous"
                                                                className="w-20 h-20 object-cover rounded border"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="isActive"
                                                        checked={form.isActive}
                                                        onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                                                    />
                                                    <Label htmlFor="isActive">Active</Label>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                                    Cancel
                                                </Button>
                                                <Button type="submit" disabled={loading}>
                                                    {loading ? "Saving..." : form.id ? 'Update' : 'Create'}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Image</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                <Loader />
                                            </TableCell>
                                        </TableRow>
                                    ) : publicationCategories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                No publication images found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        publicationCategories.map((category) => (
                                            <TableRow key={category.id}>
                                                <TableCell>
                                                    {category.image ? (
                                                        <ClickableImage
                                                            src={category.image_url}
                                                            crossOrigin="anonymous"
                                                            alt={category.name}
                                                            className="w-16 h-16 object-cover rounded-lg border"
                                                            fallbackSrc="/placeholder.svg"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${toBoolean(category.isActive)
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {toBoolean(category.isActive) ? 'Active' : 'Inactive'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {category.createdAt ? new Date(category.createdAt).toLocaleDateString() : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(category)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-red-600 hover:text-red-700"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This action cannot be undone. This will permanently delete the category
                                                                        "{category.name}".
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDelete(category.id)}
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                    >
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="events" className="mt-6">
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-semibold">Event Image Categories</h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Manage categories for event images
                                    </p>
                                </div>
                                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            onClick={resetForm}
                                            
                                            className="flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Image
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {form.id ? 'Edit Event Image' : 'Add Event Image'}
                                            </DialogTitle>
                                            <DialogDescription>
                                                {form.id ? 'Update the event category details.' : 'Create a new event category.'}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleSubmit}>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="image">Upload Image</Label>
                                                    <Input
                                                        id="image"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageChange}
                                                    />
                                                     <ImageDimensionNote
                                                        type="covers"
                                                    />
                                                    {form.image instanceof File && (
                                                        <div className="mt-2">
                                                            <img 
                                                                src={URL.createObjectURL(form.image)} 
                                                                alt="Preview" 
                                                                className="w-20 h-20 object-cover rounded border"
                                                            />
                                                        </div>
                                                    )}
                                                    {/* {typeof form.image === 'string' && form.image && (
                                                        <div className="mt-2">
                                                            <img 
                                                                src={form.image_url} 
                                                                alt="Current" 
                                                                className="w-20 h-20 object-cover rounded border"
                                                            />
                                                        </div>
                                                    )} */}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="isActive"
                                                        checked={form.isActive}
                                                        onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                                                    />
                                                    <Label htmlFor="isActive">Active</Label>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                                    Cancel
                                                </Button>
                                                <Button type="submit" disabled={loading}>
                                                    {loading ? "Saving..." : form.id ? 'Update' : 'Create'}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Image</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                <Loader />
                                            </TableCell>
                                        </TableRow>
                                    ) : eventCategories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                No event images found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        eventCategories.map((category) => (
                                            <TableRow key={category.id}>
                                                <TableCell>
                                                    {category.image ? (
                                                        <ClickableImage
                                                            src={category.image_url}
                                                            crossOrigin="anonymous"
                                                            alt={category.name}
                                                            className="w-16 h-16 object-cover rounded-lg border"
                                                            fallbackSrc="/placeholder.svg"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${toBoolean(category.isActive)
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {toBoolean(category.isActive) ? 'Active' : 'Inactive'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {category.createdAt ? new Date(category.createdAt).toLocaleDateString() : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(category)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-red-600 hover:text-red-700"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This action cannot be undone. This will permanently delete the category
                                                                        "{category.name}".
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDelete(category.id)}
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                    >
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminMainImages;
