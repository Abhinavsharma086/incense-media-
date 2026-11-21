import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { apiCall } from "../../api/apiCall";
import { ENDPOINTS } from "../../api/endpoints";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import ClickableImage from "../../components/common/ClickableImage";
import Ckeditor from "../../components/common/Ckeditor";
import ImageDimensionNote from "../../lib/ImageDimensionNote";
import { addAnonymousToImages } from "../../lib/utils";
import { useDebounce } from "../../hooks/useDebounce";

interface BlogCategory {
  id: string;
  name: string;
}

interface Blog {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  auther: string;
  image: string;
  image_url: string;
  bannerImage: string;
  banner_image_url: string;
  status?: string;
  publishedAt?: string;
  excerpt?: string;
  readTime?: string;
  date?: string;
  type?: string;
  categoryId?: number;
  slug?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  BlogCategory?: {
    id: number;
    name: string;
    isActive: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
  };
}

const AdminBlogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [localBlogs, setLocalBlogs] = useState<Blog[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    shortDescription:
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.",
    auther: "",
    readTime: "",
    date: "",
    type: "blogs",
    categoryId: "",
    isActive: "1",
    blog_image: null as File | null,
    banner_image: null as File | null,
    metaTitle: "",
    metaKeywords: "",
    metaDescription: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBlogsWithPagination();
    fetchCategories();
  }, []);

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [editingBlog]);

  // Handle debounced search
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setSearchLoading(true);
    }

    fetchBlogsWithPagination(1, debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const fetchBlogsWithPagination = async (
    page: number = 1,
    searchQuery: string = ""
  ) => {
    try {
      setPaginationLoading(true);
      setSearchLoading(false);
      let url = `${ENDPOINTS.ADMIN_BLOG}?page=${page}&limit=10`;

      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const response = await apiCall("get", url);
      if (response.success) {
        const blogsData = response.data?.data || [];
        const paginationData = response.data?.pagination || {};

        setLocalBlogs(blogsData);
        setCurrentPage(paginationData.page || 1);
        setTotalPages(paginationData.totalPages || 1);
        setTotalBlogs(paginationData.total || 0);
      }
    } catch (error) {
      console.error("Error fetching blogs:", error);
      toast.error("Failed to fetch blogs");
    } finally {
      setPaginationLoading(false);
      setSearchLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await apiCall("get", ENDPOINTS.ADMIN_BLOG_CATEGORY);
      if (response.success) {
        const categoriesData = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        setCategories(categoriesData as BlogCategory[]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to fetch categories");
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleDeleteBlog = (id: string) => {
    setBlogToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!blogToDelete) return;

    try {
      const response = await apiCall(
        "delete",
        `${ENDPOINTS.ADMIN_BLOG_DELETE}/${blogToDelete}`
      );
      if (response.success) {
        toast.success("Blog deleted successfully");
        fetchBlogsWithPagination(currentPage);
      } else {
        toast.error("Failed to delete blog");
      }
    } catch (error) {
      console.error("Error deleting blog:", error);
      toast.error("Failed to delete blog");
    } finally {
      setShowDeleteModal(false);
      setBlogToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setBlogToDelete(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        [field]: file,
      }));

      if (field === "blog_image") {
        setImagePreview(URL.createObjectURL(file));
      } else if (field === "banner_image") {
        setBannerPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.auther.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      const submitData = new FormData();
      submitData.append("title", formData.title);
      submitData.append(
        "description",
        addAnonymousToImages(formData.description)
      );
      submitData.append("shortDescription", "short description");
      submitData.append("auther", formData.auther);
      submitData.append("readTime", formData.readTime);
      submitData.append("date", formData.date);
      submitData.append("type", formData.type);
      submitData.append("categoryId", formData.categoryId);
      submitData.append("isActive", formData.isActive);
      submitData.append("metaTitle", formData.metaTitle);
      submitData.append("metaKeywords", formData.metaKeywords);
      submitData.append("metaDescription", formData.metaDescription);

      if (formData.blog_image instanceof File) {
        submitData.append("blog_image", formData.blog_image);
      }
      if (formData.banner_image instanceof File) {
        submitData.append("banner_image", formData.banner_image);
      }

      const endpoint =
        isEditMode && editingBlog
          ? ENDPOINTS.ADMIN_BLOG_UPDATE(editingBlog.id)
          : ENDPOINTS.ADMIN_BLOG_CREATE;

      const method = isEditMode ? "put" : "post";

      const response = await apiCall(method, endpoint, submitData);

      if (response.success) {
        toast.success(
          `Blog ${isEditMode ? "updated" : "created"} successfully`
        );
        resetForm();
        fetchBlogsWithPagination(currentPage);
      }
    } catch (error) {
      console.error("Error submitting blog:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (blog: any) => {
    setEditingBlog(blog);
    setIsEditMode(true);
    setFormData({
      title: blog.title || "",
      description: blog.description || "",
      shortDescription: blog.shortDescription || "",
      auther: blog.auther || "",
      readTime: blog.readTime || "",
      date: blog.date || "",
      type: blog.type || "blogs",
      categoryId: blog.categoryId?.toString() || "",
      isActive: blog.isActive ? "1" : "0",
      blog_image: null,
      banner_image: null,
      metaTitle: blog.metaTitle || "",
      metaKeywords: blog.metaKeywords || "",
      metaDescription: blog.metaDescription || "",
    });
    setImagePreview(blog.image_url || null);
    setBannerPreview(blog.banner_image_url || null);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      shortDescription: "",
      auther: "",
      readTime: "",
      date: "",
      type: "blogs",
      categoryId: "",
      isActive: "1",
      blog_image: null,
      banner_image: null,
      metaTitle: "",
      metaKeywords: "",
      metaDescription: "",
    });
    setImagePreview(null);
    setBannerPreview(null);
    setEditingBlog(null);
    setIsEditMode(false);
    setShowAddForm(false);
  };

  const handleAddClick = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    resetForm();
  };

  const handlePageChange = (page: number) => {
    fetchBlogsWithPagination(page, debouncedSearchTerm);
  };

  // No need for client-side filtering since we're using server-side search
  const filteredBlogs = localBlogs;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryRed"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stories Management</h1>
        <button
          onClick={handleAddClick}
          className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Story
        </button>
      </div>
      {/* Add/Edit Blog Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? "Edit Story" : "Add New Story"}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter story title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  author *
                </label>
                <input
                  type="text"
                  name="auther"
                  value={formData.auther}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter auther name"
                  required
                />
              </div>
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short Description *
              </label>
              <textarea
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter short description"
                required
              />
            </div> */}

            <div style={{ minHeight: "350px" }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <Ckeditor
                text={formData.description}
                setText={(text: string) =>
                  setFormData((prev) => ({ ...prev, description: text }))
                }
              />
              {/* <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter full description"
                required
              /> */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Read Time (minutes)
                </label>
                <input
                  type="number"
                  name="readTime"
                  value={formData.readTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  disabled={categoriesLoading}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {categoriesLoading && (
                  <p className="text-sm text-gray-500 mt-1">
                    Loading categories...
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Title
                </label>
                <input
                  type="text"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter meta title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Keywords
                </label>
                <input
                  type="text"
                  name="metaKeywords"
                  value={formData.metaKeywords}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter meta keywords"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Description
              </label>
              <textarea
                name="metaDescription"
                value={formData.metaDescription}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter meta description"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Story Image
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, "blog_image")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {imagePreview && (
                    <div className="flex-shrink-0">
                      <ClickableImage
                        src={imagePreview}
                        alt="Story Preview"
                        className="w-20 h-12 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                      />
                    </div>
                  )}
                </div>
                <ImageDimensionNote type="blog" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner Image
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, "banner_image")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {bannerPreview && (
                    <div className="flex-shrink-0">
                      <ClickableImage
                        src={bannerPreview}
                        alt="Banner Preview"
                        className="w-20 h-12 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                      />
                    </div>
                  )}
                </div>
                <ImageDimensionNote type="blogBanner" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="isActive"
                    value="1"
                    checked={formData.isActive === "1"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: e.target.value,
                      }))
                    }
                    className="h-4 w-4 text-primaryRed focus:ring-primaryRed border-gray-300"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="isActive"
                    value="0"
                    checked={formData.isActive === "0"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: e.target.value,
                      }))
                    }
                    className="h-4 w-4 text-primaryRed focus:ring-primaryRed border-gray-300"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Inactive
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 bg-primaryRed text-white rounded-lg transition-colors ${isSubmitting
                  ? "opacity-75 cursor-not-allowed"
                  : "hover:bg-red-700"
                  }`}
              >
                {isSubmitting
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                    ? "Update Story"
                    : "Create Story"}
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search stories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg w-full max-w-md focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
              disabled={searchLoading}
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primaryRed"></div>
              </div>
            )}
            {searchTerm && !searchLoading && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Story
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Published
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBlogs.length > 0 ? (
                filteredBlogs.map((blog: any) => (
                  <tr key={blog.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <ClickableImage
                          className="h-12 w-12 rounded object-cover mr-4"
                          src={
                            blog.image_url
                              ? blog.image_url
                              : "/assets/img/other/noimage.png"
                          }
                          alt={blog.title}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {blog.title}
                          </div>
                          {/* <div className="text-sm text-gray-500 line-clamp-1">{blog.shortDescription}</div> */}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {blog.auther}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {categories.find(
                        (category) => category.id === blog.categoryId
                      )?.name || "No Category"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${blog.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                          }`}
                      >
                        {blog.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {blog.date
                        ? new Date(blog.date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClick(blog)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBlog(blog.id)}
                          className="text-primaryRed hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      {debouncedSearchTerm
                        ? `No stories found matching "${debouncedSearchTerm}"`
                        : "No stories found"}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {totalBlogs > 0 ? (
                  <>
                    {debouncedSearchTerm ? (
                      <>
                        Showing {(currentPage - 1) * 10 + 1} to{" "}
                        {Math.min(currentPage * 10, totalBlogs)} of {totalBlogs}{" "}
                        results for "{debouncedSearchTerm}"
                      </>
                    ) : (
                      <>
                        Showing {(currentPage - 1) * 10 + 1} to{" "}
                        {Math.min(currentPage * 10, totalBlogs)} of {totalBlogs}{" "}
                        results
                      </>
                    )}
                  </>
                ) : debouncedSearchTerm ? (
                  `No results found for "${debouncedSearchTerm}"`
                ) : (
                  "No results found"
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || paginationLoading}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paginationLoading ? "Loading..." : "Previous"}
                </button>

                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={paginationLoading}
                      className={`px-3 py-2 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${pageNum === currentPage
                        ? "bg-primaryRed text-white"
                        : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || paginationLoading}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paginationLoading ? "Loading..." : "Next"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Story"
        message="Are you sure you want to delete this story? This action will permanently remove the story from your system."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
      />
    </div>
  );
};

export default AdminBlogs;