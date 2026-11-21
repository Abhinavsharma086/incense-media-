import { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Upload,
  X,
  Link,
  Loader2,
} from "lucide-react";
import { apiCall } from "../../api/apiCall";
import { ENDPOINTS } from "../../api/endpoints";
import { toast } from "sonner";
import Loader from "../../components/common/Loader";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import EventLinksModal from "../../components/common/EventLinksModal";
import ClickableImage from "../../components/common/ClickableImage";
import Ckeditor from "../../components/common/Ckeditor";
import ImageDimensionNote from "../../lib/ImageDimensionNote";
import { addAnonymousToImages } from "../../lib/utils";

const formatTimeForInput = (t: any): string => {
  if (!t) return "";
  const s = String(t).trim();
  if (s.includes(":")) {
    const parts = s.split(":");
    if (parts.length >= 2) {
      const hh = parts[0].padStart(2, "0");
      const mm = parts[1].slice(0, 2).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }
  return s;
};

const normalizeEventType = (val: any): string => {
  if (!val) return "";
  const s = String(val).trim().toLowerCase();
  if (s.includes("stone")) return "stone-tiles";
  if (s.includes("soap") || s.includes("detergent")) return "soap-detergent";
  if (s.includes("incense")) return "incense-media";
  return String(val).trim();
};

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "eventDateDesc" | "eventDateAsc">("newest");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    longDescription: "",
    isActive: "1",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    address: "",
    city: "",
    state: "",
    mapLink: "",
    eventType: "",
    image: null as File | null,
    bannerImage: null as File | null,
    icon: null as File | null,
    visitorRegistrationLink: "",
    homeFeatured: "false",
    parentEventId: "",
    metaTitle: "",
    metaKeywords: "",
    metaDescription: "",
  });
  const galleryInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    const response = await apiCall("get", ENDPOINTS.ADMIN_EVENTS);
    if (response.success) {
      setEvents(response.data?.data || []);
    }
    setLoading(false);
  };

  const handleDeleteClick = (id: string) => {
    setEventToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    const response = await apiCall(
      "delete",
      ENDPOINTS.ADMIN_EVENT_DELETE(eventToDelete)
    );
    if (response.success) {
      toast.success("Event deleted successfully");
      fetchEvents();
    }
    setShowDeleteModal(false);
    setEventToDelete(null);
  };

  const handleRemoveImage = async (id, index) => {
    try {
      const res = await apiCall("delete", ENDPOINTS.DELETE_OPTIONAL_IMAGE(id));
      setGalleryImages((prev) => prev.filter((_, i) => i !== index));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to remove image");
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setEventToDelete(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [field]: file,
      }));

      if (field === "image") {
        setImagePreview(URL.createObjectURL(file));
      } else if (field === "bannerImage") {
        setBannerPreview(URL.createObjectURL(file));
      } else if (field === "icon") {
        setIconPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!isEditMode) {
      if (
        !formData.title.trim() ||
        !formData.description.trim() ||
        !formData.startDate ||
        !formData.endDate ||
        !formData.startTime ||
        !formData.endTime
      ) {
        toast.error("Please fill in all required fields");
        return;
      }
      if (!formData.address.trim()) {
        toast.error("Please enter venue");
        return;
      }
      if (!formData.image) {
        toast.error("Please select an event image");
        return;
      }
    }

    setLoading(true);

    try {
      setIsSubmitting(true);

      const submitData = new FormData();

      if (isEditMode && editingEvent && initialFormData) {
        // Selective column update: ONLY send fields that actually changed
        let changedCount = 0;

        if (formData.title !== initialFormData.title) {
          if (!formData.title.trim()) {
            toast.error("Event title cannot be empty");
            setIsSubmitting(false);
            setLoading(false);
            return;
          }
          submitData.append("title", formData.title.trim());
          changedCount++;
        }
        if (formData.description !== initialFormData.description) {
          submitData.append("description", formData.description);
          changedCount++;
        }
        if (formData.longDescription !== initialFormData.longDescription) {
          submitData.append(
            "longDescription",
            addAnonymousToImages(formData.longDescription)
          );
          changedCount++;
        }
        if (formData.isActive !== initialFormData.isActive) {
          submitData.append("isActive", formData.isActive);
          changedCount++;
        }
        if (formData.startDate !== initialFormData.startDate) {
          submitData.append("date", formData.startDate);
          changedCount++;
        }
        if (formData.endDate !== initialFormData.endDate) {
          submitData.append("endDate", formData.endDate);
          changedCount++;
        }
        if (formData.startTime !== initialFormData.startTime) {
          submitData.append("time", formData.startTime);
          changedCount++;
        }
        if (formData.endTime !== initialFormData.endTime) {
          submitData.append("endTime", formData.endTime);
          changedCount++;
        }
        if (formData.address !== initialFormData.address) {
          submitData.append("address", formData.address.trim());
          changedCount++;
        }
        if (formData.city !== initialFormData.city) {
          submitData.append("city", formData.city.trim());
          changedCount++;
        }
        if (formData.state !== initialFormData.state) {
          submitData.append("state", formData.state.trim());
          changedCount++;
        }
        if (formData.mapLink !== initialFormData.mapLink) {
          submitData.append("mapLink", formData.mapLink);
          changedCount++;
        }
        if (formData.eventType !== initialFormData.eventType) {
          submitData.append("eventType", formData.eventType);
          changedCount++;
        }
        if (formData.visitorRegistrationLink !== initialFormData.visitorRegistrationLink) {
          submitData.append(
            "visitorRegistrationLink",
            formData.visitorRegistrationLink
          );
          changedCount++;
        }
        if (formData.homeFeatured !== initialFormData.homeFeatured) {
          submitData.append("homeFeatured", formData.homeFeatured);
          changedCount++;
        }
        if (formData.parentEventId !== initialFormData.parentEventId) {
          submitData.append("parentId", formData.parentEventId || "");
          changedCount++;
        }
        if (formData.metaTitle !== initialFormData.metaTitle) {
          submitData.append("metaTitle", formData.metaTitle);
          changedCount++;
        }
        if (formData.metaKeywords !== initialFormData.metaKeywords) {
          submitData.append("metaKeywords", formData.metaKeywords);
          changedCount++;
        }
        if (formData.metaDescription !== initialFormData.metaDescription) {
          submitData.append("metaDescription", formData.metaDescription);
          changedCount++;
        }

        if (formData.image) {
          submitData.append("image", formData.image);
          changedCount++;
        }
        if (formData.bannerImage) {
          submitData.append("bannerImage", formData.bannerImage);
          changedCount++;
        }
        if (formData.icon) {
          submitData.append("icon", formData.icon);
          changedCount++;
        }

        galleryImages.forEach((img: any) => {
          if (img && img.type === "new" && img.data) {
            submitData.append("optional_image", img.data);
            changedCount++;
          }
        });

        if (changedCount === 0) {
          toast.info("Koi badlaav nahi kiya gaya (No changes made)");
          setShowAddForm(false);
          setIsEditMode(false);
          setEditingEvent(null);
          setInitialFormData(null);
          resetForm();
          return;
        }

        const response = await apiCall(
          "put",
          ENDPOINTS.ADMIN_EVENT_UPDATE(editingEvent.id),
          submitData
        );

        if (response.success) {
          toast.success("Event updated successfully");
          setShowAddForm(false);
          setIsEditMode(false);
          setEditingEvent(null);
          setInitialFormData(null);
          resetForm();
          fetchEvents();
        } else {
          toast.error(response?.error || response?.data?.message || "Failed to update event");
        }
      } else {
        // Create Mode: Send all required fields
        submitData.append("title", formData.title);
        submitData.append("description", formData.description);
        submitData.append(
          "longDescription",
          addAnonymousToImages(formData.longDescription)
        );
        submitData.append("isActive", formData.isActive);
        submitData.append("date", formData.startDate);
        submitData.append("endDate", formData.endDate);
        submitData.append("time", formData.startTime);
        submitData.append("endTime", formData.endTime);
        submitData.append("address", formData.address);
        submitData.append("city", formData.city);
        submitData.append("state", formData.state);
        submitData.append("mapLink", formData.mapLink);
        submitData.append("eventType", formData.eventType);
        submitData.append(
          "visitorRegistrationLink",
          formData.visitorRegistrationLink
        );
        submitData.append("homeFeatured", formData.homeFeatured);
        submitData.append("metaTitle", formData.metaTitle);
        submitData.append("metaKeywords", formData.metaKeywords);
        submitData.append("metaDescription", formData.metaDescription);

        if (formData.image) {
          submitData.append("image", formData.image);
        }
        if (formData.bannerImage) {
          submitData.append("bannerImage", formData.bannerImage);
        }
        if (formData.icon) {
          submitData.append("icon", formData.icon);
        }

        galleryImages.forEach((img: any) => {
          if (img && img.type === "new" && img.data) {
            submitData.append("optional_image", img.data);
          }
        });

        submitData.append("parentId", formData.parentEventId || "");

        const response = await apiCall(
          "post",
          ENDPOINTS.ADMIN_EVENT_CREATE,
          submitData
        );

        if (response.success) {
          toast.success("Event created successfully");
          setShowAddForm(false);
          setIsEditMode(false);
          setEditingEvent(null);
          setInitialFormData(null);
          resetForm();
          fetchEvents();
        }
      }
    } catch (error) {
      console.error("Error saving event:", error);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      longDescription: "",
      isActive: "1",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      address: "",
      city: "",
      state: "",
      mapLink: "",
      eventType: "",
      image: null,
      bannerImage: null,
      icon: null,
      visitorRegistrationLink: "",
      homeFeatured: "false",
      parentEventId: "",
      metaTitle: "",
      metaKeywords: "",
      metaDescription: "",
    });
    setInitialFormData(null);
    setImagePreview(null);
    setBannerPreview(null);
    setIconPreview(null);
    setGalleryImages([]);
  };

  const handleEditClick = (event: any) => {
    setEditingEvent(event);
    setIsEditMode(true);
    const initial = {
      title: event.title || "",
      description: event.description || "",
      longDescription: event.longDescription || "",
      isActive: event.isActive ? "1" : "0",
      startDate: event.startDate ? String(event.startDate).split("T")[0] : (event.date ? String(event.date).split("T")[0] : ""),
      endDate: event.endDate ? String(event.endDate).split("T")[0] : (event.startDate ? String(event.startDate).split("T")[0] : (event.date ? String(event.date).split("T")[0] : "")),
      startTime: formatTimeForInput(event.startTime || event.time),
      endTime: formatTimeForInput(event.endTime || event.time),
      address: event.address || "",
      city: event.city || "",
      state: event.state || "",
      mapLink: event.mapLink || "",
      eventType: normalizeEventType(event.eventType),
      image: null,
      bannerImage: null,
      icon: null,
      visitorRegistrationLink: event.visitorRegistrationLink || "",
      homeFeatured: event.homeFeatured ? "true" : "false",
      parentEventId: event.parentId || "",
      metaTitle: event.metaTitle || "",
      metaKeywords: event.metaKeywords || "",
      metaDescription: event.metaDescription || "",
    };
    setFormData(initial);
    setInitialFormData(initial);

    // Format existing optional images for display
    const formattedOptionalImages = (event.OptionalImages || []).map((img: any) => ({
      type: "existing",
      data: img.image_url,
      id: img.id,
    }));

    setGalleryImages(formattedOptionalImages);
    setImagePreview(event.image_url || null);
    setBannerPreview(event.banner_image_url || null);
    setIconPreview(event.icon_url || null);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    setShowAddForm(false);
    setIsEditMode(false);
    setEditingEvent(null);
    setInitialFormData(null);
    setGalleryImages([]);
    resetForm();
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = events
    .filter((event: any) =>
      (event.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.city || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.address || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: any, b: any) => {
      if (sortBy === "newest") {
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      }
      if (sortBy === "eventDateDesc") {
        const da = new Date(a.date || a.startDate || 0).getTime();
        const db = new Date(b.date || b.startDate || 0).getTime();
        return db - da;
      }
      if (sortBy === "eventDateAsc") {
        const da = new Date(a.date || a.startDate || 0).getTime();
        const db = new Date(b.date || b.startDate || 0).getTime();
        return da - db;
      }
      return 0;
    });

  const handleLinksClick = (event: any) => {
    window.scrollTo(0, 0);
    setSelectedEvent(event);
    setShowLinksModal(true);
  };

  const handleLinksModalClose = () => {
    setShowLinksModal(false);
    setSelectedEvent(null);
  };

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [editingEvent]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </button>
      </div>

      {/* Add Event Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? "Edit Event" : "Add New Event"}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter event title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type
                </label>
                <select
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                >
                  <option value="">Select Type</option>
                  <option value="incense-media">Incense Media</option>
                  <option value="soap-detergent">Soap & Detergent</option>
                  <option value="stone-tiles">Stone & Tiles</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  name="endDate"
                  disabled={formData.startDate === ""}
                  value={formData.endDate}
                  onChange={handleInputChange}
                  min={formData.startDate || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter short description"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Venue
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter city"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter state"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Map Link
                </label>
                <input
                  type="url"
                  name="mapLink"
                  value={formData.mapLink}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter Google Maps link"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visitor Registration Link
                </label>
                <input
                  type="url"
                  name="visitorRegistrationLink"
                  value={formData.visitorRegistrationLink}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter registration link"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Long Description
                </label>
                <div style={{ minHeight: "200px" }}>
                  <Ckeditor
                    text={formData.longDescription}
                    setText={(text: string) =>
                      setFormData((prev) => ({
                        ...prev,
                        longDescription: text,
                      }))
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
                  Parent Event
                </label>
                <select
                  name="parentEventId"
                  value={formData.parentEventId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                >
                  <option value="">Select parent event (optional)</option>
                  {events
                    .filter(
                      (event) => !isEditMode || event.id !== editingEvent?.id
                    )
                    .map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} -{" "}
                        {new Date(event.date).toLocaleDateString()}
                      </option>
                    ))}
                </select>
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
                      checked={formData.isActive === "1"}
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
                      checked={formData.isActive === "0"}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home Featured
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="homeFeatured"
                    name="homeFeatured"
                    checked={formData.homeFeatured === "true"}
                    onChange={(e) => {
                      const isChecked = e.target.checked;

                      // Count existing featured events (excluding current event if editing)
                      const existingFeaturedCount = events.filter((event) => {
                        if (
                          isEditMode &&
                          editingEvent &&
                          event.id === editingEvent.id
                        ) {
                          return false; // Exclude current event being edited
                        }
                        return (
                          event.homeFeatured === true ||
                          event.homeFeatured === "true"
                        );
                      }).length;

                      // If trying to check and already have 2 featured events, show warning
                      if (isChecked && existingFeaturedCount >= 2) {
                        toast.error(
                          "You can only feature maximum 2 events on the home page"
                        );
                        return;
                      }

                      setFormData((prev) => ({
                        ...prev,
                        homeFeatured: isChecked ? "true" : "false",
                      }));
                    }}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="homeFeatured"
                    className="ml-2 block text-sm text-gray-900 cursor-pointer"
                  >
                    Feature on Home Page
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum 2 events can be featured on home page
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Image *
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, "image")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required={!isEditMode}
                  />
                </div>
                {imagePreview && (
                  <div className="flex-shrink-0">
                    <ClickableImage
                      src={imagePreview}
                      alt="Event Preview"
                      className="w-20 h-20 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                    />
                  </div>
                )}
              </div>
              <ImageDimensionNote type="event" />
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
                    onChange={(e) => handleImageChange(e, "bannerImage")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                {bannerPreview && (
                  <div className="flex-shrink-0">
                    <ClickableImage
                      src={bannerPreview}
                      alt="Banner Preview"
                      className="w-20 h-20 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                    />
                  </div>
                )}
              </div>
              <ImageDimensionNote type="eventBanner" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Icon
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, "icon")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                {iconPreview && (
                  <div className="flex-shrink-0">
                    <ClickableImage
                      src={iconPreview}
                      alt="Icon Preview"
                      className="w-20 h-20 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                    />
                  </div>
                )}
              </div>
              <ImageDimensionNote type="eventLogo" />
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
                        ref={galleryInputRef}
                        multiple
                        onChange={(e) => {
                          const selected = Array.from(e.target.files || []);
                          const newFiles = selected.map((file) => ({
                            type: "new",
                            data: file,
                            previewUrl: URL.createObjectURL(file),
                          }));

                          setGalleryImages((prev) => [...prev, ...newFiles]);
                          e.target.value = "";
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
                                img?.type === "existing"
                                  ? img?.data
                                  : img?.previewUrl || (img?.data instanceof Blob || img?.data instanceof File ? URL.createObjectURL(img.data) : img?.data || "")
                              }
                              alt={`Gallery preview ${index + 1}`}
                              className="w-full h-full object-cover hover:shadow-md transition-shadow cursor-pointer"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              img.type === "existing"
                                ? handleRemoveImage(img.id, index)
                                : setGalleryImages((prev) =>
                                    prev.filter((_, i) => i !== index)
                                  )
                            }
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
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
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className={`px-4 py-2 text-gray-700 bg-gray-200 rounded-lg transition-colors ${
                  isSubmitting
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-300"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 bg-primaryRed text-white rounded-lg transition-colors ${
                  isSubmitting
                    ? "opacity-75 cursor-not-allowed"
                    : "hover:bg-red-700"
                }`}
              >
                {isSubmitting
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                  ? "Update Event"
                  : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search events by title, city, venue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-primaryRed focus:border-primaryRed text-sm"
            />
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase">Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 font-medium focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
            >
              <option value="newest">Newest Created First (Default)</option>
              <option value="eventDateDesc">Event Date (Latest to Oldest)</option>
              <option value="eventDateAsc">Event Date (Oldest to Latest)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Loading...
              </h3>
            </div>
          ) : filteredEvents.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                        <ClickableImage
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                            #{event.id}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {event.title}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 line-clamp-2">
                          {event.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center mb-1">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {new Date(event.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {event.time}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          event.isActive === true || event.isActive === "1"
                            ? "bg-green-100 text-green-800"
                            : event.isActive === false || event.isActive === "0"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {event.isActive === true || event.isActive === "1"
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleLinksClick(event)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Manage Links"
                        >
                          <Link className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            window.scrollTo(0, 0);
                            handleEditClick(event);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Event"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(event.id)}
                          className="text-primaryRed hover:text-red-900"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Events Found
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm
                  ? "No events match your search criteria."
                  : "Get started by creating your first event."}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Event
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action will permanently remove the event from your system."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
      />

      {/* Event Links Modal */}
      <EventLinksModal
        isOpen={showLinksModal}
        onClose={handleLinksModalClose}
        eventId={selectedEvent?.id || ""}
        eventTitle={selectedEvent?.title || ""}
      />
    </div>
  );
};

export default AdminEvents;
