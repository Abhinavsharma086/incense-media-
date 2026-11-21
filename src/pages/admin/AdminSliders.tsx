import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, Upload, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import ClickableImage from '../../components/common/ClickableImage';
import ImageDimensionNote from '../../lib/ImageDimensionNote';

interface Slider {
  id: string;
  heading: string;
  subHeading: string;
  isActive: boolean;
  image_url: string;
  slug: string;
  eventId: string;
  eventType?: string;
  awardId?: string;
  order?: number;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  address: string;
  isActive: boolean;
}

const AdminSliders: React.FC = () => {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [awards, setAwards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sliderToDelete, setSliderToDelete] = useState<string | null>(null);
  const [editingSlider, setEditingSlider] = useState<Slider | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [formData, setFormData] = useState<any>({
    heading: '',
    subHeading: '',
    isActive: '1',
    image_url: null as File | null,
    slug: 'home-page',
    eventId: '',
    eventType: 'event',
    awardId: ''
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  
  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [editingSlider]);

  useEffect(() => {
    fetchSliders();
    fetchEvents();
    fetchAwards();
  }, []);

  const fetchSliders = async () => {
    try {
      setDataLoading(true);
      const response = await apiCall('get', ENDPOINTS.ADMIN_SLIDER + '?slug=home-page');
      if (response.success) {
        const slidersData = response.data?.data || [];
        // Keep eventType as is (don't set default)
        const processedSliders = slidersData.map((slider: any) => ({
          ...slider,
          eventType: slider.eventType
        }));
        setSliders(processedSliders);
      }
    } catch (error) {
      console.error('Error fetching sliders:', error);
      toast.error('Failed to fetch sliders');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await apiCall('get', ENDPOINTS.ADMIN_EVENTS);
      if (response.success) {
        setEvents(response.data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
    }
  };

  const fetchAwards = async () => {
    const response = await apiCall('get', ENDPOINTS.ADMIN_AWARDS);
    if (response.success) {
      setAwards(response.data?.data || []);
    }
  };

  const filteredSliders = sliders.filter(slider =>
    slider.heading.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    // Clear eventId/awardId when eventType changes
    if (name === 'eventType') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        eventId: '',
        awardId: ''
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        image_url: file
      }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.heading.trim()) {
      toast.error('Please enter heading');
      return;
    }

    if (!formData.image_url && !isEditMode) {
      toast.error('Please select an image');
      return;
    }

    // Validate eventType selection
    if (formData.eventType === 'event' && !formData.eventId) {
      toast.error('Please select an event');
      return;
    }

    if (formData.eventType === 'award' && (!formData.eventId && !formData.awardId)) {
      toast.error('Please select an award');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('name', "");
      submitData.append('heading', formData.heading);
      submitData.append('subHeading', formData.subHeading);
      submitData.append('isActive', formData.isActive === '1' ? 'true' : 'false');
      submitData.append('slug', formData.slug);
      if (formData.eventId || formData.awardId) {
        submitData.append('eventId', formData.eventId ? formData.eventId : formData.awardId);
      } else {
        submitData.append('eventId', 0);
      }
      if (formData.eventType) {
        submitData.append('eventType', formData.eventType);
      } else {
        submitData.append('eventType', "null");
      }

      if (formData.image_url) {
        submitData.append('slider_image', formData.image_url);
      }

      const endpoint = isEditMode && editingSlider
        ? ENDPOINTS.ADMIN_SLIDER_UPDATE(editingSlider.id)
        : ENDPOINTS.ADMIN_SLIDER_CREATE;

      const method = isEditMode ? 'put' : 'post';
      const response = await apiCall(method, endpoint, submitData);

      if (response.success) {
        toast.success(isEditMode ? 'Slider updated successfully' : 'Slider created successfully');
        setShowAddForm(false);
        resetForm();
        fetchSliders();
      }
    } catch (error) {
      console.error('Error saving slider:', error);
      toast.error('Failed to save slider');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (slider: Slider) => {
    setEditingSlider(slider);
    setIsEditMode(true);
    setFormData({
      heading: slider.heading,
      subHeading: slider.subHeading,
      isActive: slider.isActive ? '1' : '0',
      image_url: null,
      slug: slider.slug,
      eventId: slider.eventId,
      eventType: slider.eventType,
      awardId: slider.awardId
    });
    setImagePreview(slider.image_url);
    setShowAddForm(true);
  };

  const handleDeleteClick = (sliderId: string) => {
    setSliderToDelete(sliderId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sliderToDelete) return;

    try {
      setLoading(true);
      const response = await apiCall('delete', ENDPOINTS.ADMIN_SLIDER_DELETE(sliderToDelete));
      if (response.success) {
        toast.success('Slider deleted successfully');
        fetchSliders();
      }
    } catch (error) {
      console.error('Error deleting slider:', error);
      toast.error('Failed to delete slider');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setSliderToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSliderToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      heading: '',
      subHeading: '',
      isActive: '1',
      image_url: null,
      slug: 'home-page',
      eventId: '',
      eventType: 'event',
      awardId: ''
    });
    setImagePreview(null);
    setEditingSlider(null);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    resetForm();
  };

  const handleAddClick = () => {
    resetForm();
    setShowAddForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Slider Management</h1>
        <button
          onClick={handleAddClick}
          className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Slider
        </button>
      </div>

      {/* Add/Edit Slider Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Slider' : 'Add New Slider'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Heading *
              </label>
              <input
                type="text"
                name="heading"
                value={formData.heading}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter main heading"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sub Heading
              </label>
              <input
                type="text"
                name="subHeading"
                value={formData.subHeading}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter sub heading"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Event Type
              </label>
              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
              >
                <option value="">Select an event type (optional)</option>
                <option value="event">Event</option>
                <option value="award">Award</option>
              </select>
            </div>
            {/* Conditionally show Award dropdown */}
            {formData.eventType === 'award' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Award *
                </label>
                <select
                  name="eventId"
                  value={formData.eventId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  required
                >
                  <option value="">Select an award</option>
                  {awards.map((award) => (
                    <option key={award.id} value={award.id}>
                      {award.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Conditionally show Event dropdown */}
            {formData.eventType === 'event' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Event *
                </label>
                <select
                  name="eventId"
                  value={formData.eventId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  required
                >
                  <option value="">Select an event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slider Image *
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> slider image
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      required={!isEditMode}
                    />
                  </label>
                </div>

                {imagePreview && (
                  <div className="flex justify-center">
                    <ClickableImage
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-20 object-cover rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>
              <ImageDimensionNote type="slider" />
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
                    checked={formData.isActive === '1' || formData.isActive === 1 || formData.isActive === true}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      isActive: e.target.value
                    }))}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                    Active
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="inactive"
                    name="isActive"
                    value="0"
                    checked={formData.isActive === '0' || formData.isActive === 0 || formData.isActive === false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      isActive: e.target.value
                    }))}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <label htmlFor="inactive" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                    Inactive
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primaryRed text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (isEditMode ? 'Update Slider' : 'Create Slider')}
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
              placeholder="Search sliders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full max-w-md focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {dataLoading ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primaryRed"></div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading...</h3>
            </div>
          ) : filteredSliders.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slider Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Association
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
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
                {filteredSliders.map((slider) => (
                  <tr key={slider.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-200">
                        <ClickableImage
                          src={slider.image_url}
                          alt={slider.heading}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">{slider.heading}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{slider.subHeading}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {slider.eventType === 'event' && slider.eventId
                        ? events.find(e => e.id === slider.eventId)?.title || 'Event not found'
                        : slider.eventType === 'award' && slider.eventId
                          ? awards.find(a => a.id === slider.eventId)?.title || 'Award not found'
                          : (slider.eventType == null || slider.eventType === "null") ? "-" : "-"
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {slider.eventType == null || slider.eventType === "null" ? "-" : slider.eventType === 'event' ? 'Event' : slider.eventType === "award" ? "Award" : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${slider.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {slider.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClick(slider)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Slider"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(slider.id)}
                          className="text-primaryRed hover:text-red-900"
                          title="Delete Slider"
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Sliders Found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'No sliders match your search criteria.' : 'Get started by creating your first slider.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleAddClick}
                  className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Slider
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
        title="Delete Slider"
        message="Are you sure you want to delete this slider? This action will permanently remove the slider from your system."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
      />
    </div>
  );
};

export default AdminSliders;