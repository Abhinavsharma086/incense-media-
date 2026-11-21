import React, { useState, useEffect } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { apiCall } from "../../api/apiCall";
import { ENDPOINTS } from "../../api/endpoints";
import ClickableImage from "../../components/common/ClickableImage";
import Ckeditor from "../../components/common/Ckeditor";
import ImageDimensionNote from "../../lib/ImageDimensionNote";
import { addAnonymousToImages } from "../../lib/utils";
import Loader from "../../components/common/Loader";

interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  image?: string;
  isActive: boolean | number | string;
  createdAt?: string;
  updatedAt?: string;
}

interface Service {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  banner: string;
  banner_url: string;
  slug: string;
  isActive: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  packages?: Array<{
    title: string;
    price: string;
    banner: string;
  }>;
  offers?: Array<{
    title: string;
    description: string;
    banner: string;
  }>;
  service_gallery?: string[];
  ServicePackages?: Array<{
    id: number;
    serviceId: number;
    title: string;
    price: number;
    image: string;
    image_url: string;
    isActive: string;
    createdAt: string;
    updatedAt: string;
  }>;
  ServiceOffers?: Array<{
    id: number;
    serviceId: number;
    title: string;
    description: string;
    banner: string;
    banner_url: string;
    isActive: string;
    createdAt: string;
    updatedAt: string;
  }>;
  ServiceGallery?: string[];
}

const AdminServicesCreate: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [packagePreviews, setPackagePreviews] = useState<(string | null)[]>([]);
  const [offerPreviews, setOfferPreviews] = useState<(string | null)[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    longDescription: "",
    categoryId: "",
    isActive: "1",
    banner: null as File | null,
    packages: [{ title: "", price: "", banner: null as File | null }],
    offers: [{ title: "", description: "", banner: null as File | null }],
    service_gallery: [] as File[],
    option_image: [] as File[],
    metaTitle: "",
    metaKeywords: "",
    metaDescription: "",
  });

  useEffect(() => {
    // Fetch service categories
    fetchServiceCategories();

    // Check if we're editing a service from localStorage
    const editingService = localStorage.getItem("editingService");
    if (editingService) {
      const service = JSON.parse(editingService);
      setIsEditMode(true);
      fetchServiceDetails(service.id);
    }
  }, []);

  const fetchServiceCategories = async () => {
    try {
      const res = await apiCall(
        "get",
        ENDPOINTS.ADMIN_MASTERS("service-category")
      );
      if (res.success) {
        const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setCategories(list as ServiceCategory[]);
      }
    } catch (error) {
      console.error("Error fetching service categories:", error);
      toast.error("Failed to fetch service categories");
    }
  };

  const fetchServiceDetails = async (serviceId: string) => {
    try {
      setLoading(true);

      // Fetch detailed service data by ID
      const response = await apiCall(
        "get",
        ENDPOINTS.ADMIN_SERVICE_DETAIL(serviceId)
      );

      if (response.success) {
        const serviceDetails = response.data?.data || response.data;

        setFormData({
          title: serviceDetails.title || "",
          description: serviceDetails.description || "",
          longDescription: serviceDetails.longDescription || "",
          categoryId: serviceDetails.categoryId?.toString() || "",
          isActive:
            serviceDetails.isActive !== undefined
              ? serviceDetails.isActive
              : "1",
          banner: null,
          packages: serviceDetails.ServicePackages?.map((pkg: any) => ({
            title: pkg.title || "",
            price: pkg.price?.toString() || "",
            image: pkg.image || null,
            banner: null,
          })) || [{ title: "", price: "", banner: null }],
          offers: serviceDetails.ServiceOffers?.map((offer: any) => ({
            title: offer.title || "",
            description: offer.description || "",
            image: offer.banner || null,
            banner: null,
          })) || [{ title: "", description: "", banner: null }],
          service_gallery: serviceDetails.ServiceGallery || [],
          option_image: [],
          metaTitle: serviceDetails.metaTitle || "",
          metaKeywords: serviceDetails.metaKeywords || "",
          metaDescription: serviceDetails.metaDescription || "",
        });

        setBannerPreview(serviceDetails.banner_url || serviceDetails.banner);

        // Set package previews
        const packagePreviews =
          serviceDetails.ServicePackages?.map(
            (pkg: any) => pkg.image_url || null
          ) || [];
        setPackagePreviews(packagePreviews);

        // Set offer previews
        const offerPreviews =
          serviceDetails.ServiceOffers?.map(
            (offer: any) => offer.banner_url || null
          ) || [];
        setOfferPreviews(offerPreviews);

        // Format existing gallery images for display
        const optionalImages = serviceDetails.ServiceGallery || [];
        const formattedOptionalImages = optionalImages.map((img) => ({
          type: "existing",
          data: img.image_url || img.imageUrl || img.url,
          id: img.id,
        }));
        setGalleryImages(formattedOptionalImages);
      } else {
        toast.error("Failed to fetch service details");
      }
    } catch (error) {
      console.error("Error fetching service details:", error);
      toast.error("Failed to fetch service details");
    } finally {
      setLoading(false);
    }
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
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [field]: file,
      }));

      if (field === "banner") {
        setBannerPreview(URL.createObjectURL(file));
      }
    }
  };

  const handlePackageChange = (
    index: number,
    field: string,
    value: string | File
  ) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, i) =>
        i === index ? { ...pkg, [field]: value } : pkg
      ),
    }));

    // Update preview if it's a banner file
    if (field === "banner" && value instanceof File) {
      setPackagePreviews((prev) => {
        const newPreviews = [...prev];
        newPreviews[index] = URL.createObjectURL(value);
        return newPreviews;
      });
    }
  };

  const handleOfferChange = (
    index: number,
    field: string,
    value: string | File
  ) => {
    setFormData((prev) => ({
      ...prev,
      offers: prev.offers.map((offer, i) =>
        i === index ? { ...offer, [field]: value } : offer
      ),
    }));

    // Update preview if it's a banner file
    if (field === "banner" && value instanceof File) {
      setOfferPreviews((prev) => {
        const newPreviews = [...prev];
        newPreviews[index] = URL.createObjectURL(value);
        return newPreviews;
      });
    }
  };

  const handleRemoveImage = async (id, index) => {
    try {
      const res = await apiCall("delete", ENDPOINTS.DELETE_OPTIONAL_IMAGE(id));
      setGalleryImages((prev) => prev.filter((_, i) => i !== index));
      toast.success("Image removed successfully");
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Failed to remove image");
    }
  };

  const addPackage = () => {
    setFormData((prev) => ({
      ...prev,
      packages: [...prev.packages, { title: "", price: "", banner: null }],
    }));
    // Add null to preview array for new package
    setPackagePreviews((prev) => [...prev, null]);
  };

  const addOffer = () => {
    setFormData((prev) => ({
      ...prev,
      offers: [...prev.offers, { title: "", description: "", banner: null }],
    }));
    // Add null to preview array for new offer
    setOfferPreviews((prev) => [...prev, null]);
  };

  const removePackage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== index),
    }));
    // Remove preview from array
    setPackagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeOffer = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      offers: prev.offers.filter((_, i) => i !== index),
    }));
    // Remove preview from array
    setOfferPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter service title");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Please enter description");
      return;
    }

    if (!formData.categoryId) {
      toast.error("Please select a service category");
      return;
    }

    if (!formData.banner && !isEditMode) {
      toast.error("Please select a banner image");
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append("title", formData.title);
      submitData.append("description", formData.description);
      submitData.append(
        "longDescription",
        addAnonymousToImages(formData.longDescription)
      );
      submitData.append("categoryId", formData.categoryId);
      submitData.append("isActive", formData.isActive.toString());
      submitData.append("metaTitle", formData.metaTitle);
      submitData.append("metaKeywords", formData.metaKeywords);
      submitData.append("metaDescription", formData.metaDescription);

      if (formData.banner) {
        submitData.append("banner", formData.banner);
      }

      // Add packages
      formData.packages.forEach((pkg, index) => {
        submitData.append(`packages[${index}][title]`, pkg.title);
        submitData.append(`packages[${index}][price]`, pkg.price);
        if (pkg.banner) {
          submitData.append(`package_banner_${index}`, pkg.banner);
        }
      });

      // Add offers
      formData.offers.forEach((offer, index) => {
        submitData.append(`offers[${index}][title]`, offer.title);
        submitData.append(`offers[${index}][description]`, offer.description);
        if (offer.banner) {
          submitData.append(`offer_banner_${index}`, offer.banner);
        }
      });

      // Add gallery images
      galleryImages.forEach((img) => {
        if (img.type === "new") {
          submitData.append("service_gallery", img.data);
        }
      });

      const editingService = localStorage.getItem("editingService");
      let response;

      if (isEditMode && editingService) {
        const service = JSON.parse(editingService);
        response = await apiCall(
          "put",
          ENDPOINTS.ADMIN_SERVICE_UPDATE(service.id),
          submitData
        );
      } else {
        response = await apiCall(
          "post",
          ENDPOINTS.ADMIN_SERVICE_CREATE,
          submitData
        );
      }

      if (response.success) {
        toast.success(
          isEditMode
            ? "Service updated successfully"
            : "Service created successfully"
        );
        localStorage.removeItem("editingService");
        navigate("/admin/services");
      }
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem("editingService");
    navigate("/admin/services");
  };

  return (
    <div className="space-y-6">
      {loading && <Loader />}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? "Edit Service" : "Create New Service"}
        </h1>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
              placeholder="Enter service title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
              placeholder="Enter description"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Category *
            </label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
              required
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                No categories available. Please create a service category first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Long Description
            </label>
            <div style={{ minHeight: "200px" }}>
              <Ckeditor
                text={formData.longDescription}
                setText={(text: string) =>
                  setFormData((prev) => ({ ...prev, longDescription: text }))
                }
              />
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner Image *
            </label>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  disabled={loading}
                  onChange={(e) => handleImageChange(e, "banner")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required={!isEditMode}
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
            <ImageDimensionNote type="serviceBanner" />
          </div>

          {/* Gallery Images Section */}
          {isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gallery Images (Optional)
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span>{" "}
                        gallery images
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG or JPEG (MAX. 5MB each)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={loading}
                      onChange={(e) => {
                        const selected = Array.from(e.target.files);

                        // Check current total images (existing + new files)
                        const currentImages = galleryImages.length;
                        const totalImages = currentImages + selected.length;

                        const newFiles = selected.map((file) => ({
                          type: "new",
                          data: file,
                        }));

                        setGalleryImages((prev) => [...prev, ...newFiles]);
                        e.target.value = null;
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {galleryImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                          <ClickableImage
                            src={
                              img.type === "existing"
                                ? img.data
                                : URL.createObjectURL(img.data)
                            }
                            alt={`Gallery preview ${index + 1}`}
                            className="w-full h-full object-cover hover:shadow-md transition-shadow cursor-pointer"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            img.type === "existing"
                              ? handleRemoveImage(img.id, index)
                              : setGalleryImages((prev) =>
                                  prev.filter((_, i) => i !== index)
                                )
                          }
                          className={`absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 ${
                            loading ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Packages Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Packages</h3>
              <button
                type="button"
                onClick={addPackage}
                disabled={loading}
                className={`bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Add Package
              </button>
            </div>
            {formData.packages.map((pkg, index) => (
              <div key={index} className="border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    Package {index + 1}
                  </h4>
                  {formData.packages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePackage(index)}
                      disabled={loading}
                      className={`text-primaryRed hover:text-red-900 ${
                        loading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Package Title
                    </label>
                    <input
                      type="text"
                      value={pkg.title}
                      onChange={(e) =>
                        handlePackageChange(index, "title", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                      placeholder="Enter package title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      value={pkg.price}
                      onChange={(e) =>
                        handlePackageChange(index, "price", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                      placeholder="Enter price"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Package Banner
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={loading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePackageChange(index, "banner", file);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    {packagePreviews[index] && (
                      <div className="flex-shrink-0">
                        <ClickableImage
                          src={packagePreviews[index]}
                          alt={`Package ${index + 1} Preview`}
                          className="w-20 h-12 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                        />
                      </div>
                    )}
                  </div>
                  <ImageDimensionNote type="servicePackage" />
                </div>
              </div>
            ))}
          </div>

          {/* Offers Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Offers</h3>
              <button
                type="button"
                onClick={addOffer}
                disabled={loading}
                className={`bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Add Offer
              </button>
            </div>
            {formData.offers.map((offer, index) => (
              <div key={index} className="border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    Offer {index + 1}
                  </h4>
                  {formData.offers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOffer(index)}
                      disabled={loading}
                      className={`text-primaryRed hover:text-red-900 ${
                        loading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Offer Title
                    </label>
                    <input
                      type="text"
                      value={offer.title}
                      onChange={(e) =>
                        handleOfferChange(index, "title", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                      placeholder="Enter offer title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Offer Description
                    </label>
                    <textarea
                      value={offer.description}
                      onChange={(e) =>
                        handleOfferChange(index, "description", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                      placeholder="Enter offer description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Offer Banner
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          disabled={loading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleOfferChange(index, "banner", file);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      {offerPreviews[index] && (
                        <div className="flex-shrink-0">
                          <ClickableImage
                            src={offerPreviews[index]}
                            alt={`Offer ${index + 1} Preview`}
                            className="w-20 h-12 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                          />
                        </div>
                      )}
                    </div>
                    <ImageDimensionNote type="serviceOffer" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="active"
                  name="isActive"
                  value="1"
                  checked={
                    formData.isActive == "true" || formData.isActive == "1"
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isActive: e.target.value,
                    }))
                  }
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <label
                  htmlFor="active"
                  className="ml-2 block text-sm text-gray-900 cursor-pointer"
                >
                  Active
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="inactive"
                  name="isActive"
                  value="0"
                  checked={
                    formData.isActive == "false" || formData.isActive == "0"
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isActive: e.target.value,
                    }))
                  }
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <label
                  htmlFor="inactive"
                  className="ml-2 block text-sm text-gray-900 cursor-pointer"
                >
                  Inactive
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className={`px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primaryRed text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Saving..."
                : isEditMode
                ? "Update Service"
                : "Create Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminServicesCreate;
