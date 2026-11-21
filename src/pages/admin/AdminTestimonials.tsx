import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, Upload, Star } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import ClickableImage from '../../components/common/ClickableImage';
import ImageDimensionNote from '../../lib/ImageDimensionNote';

interface Testimonial {
  id: string;
  name: string;
  designation: string;
  image_url: string;
  description: string;
  rating: number;
  isActive: boolean;
}

const AdminTestimonials: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [testimonialToDelete, setTestimonialToDelete] = useState<string | null>(null);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [formData, setFormData] = useState<any>({
    name: '',
    designation: '',
    description: '',
    rating: 5,
    isActive: '1',
    image_url: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  
  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [editingTestimonial]);


  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      setDataLoading(true);
      const response = await apiCall('get', ENDPOINTS.TESTIMONIALS);
      if (response.success) {
        setTestimonials(response.data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      toast.error('Failed to fetch testimonials');
    } finally {
      setDataLoading(false);
    }
  };

  const filteredTestimonials = testimonials.filter(testimonial =>
    testimonial.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    testimonial.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Prevent numbers in name field
    if (name === 'name' && /\d/.test(value)) {
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

    if (!formData.name.trim()) {
      toast.error('Please enter name');
      return;
    }

    if (!formData.designation.trim()) {
      toast.error('Please enter designation');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter description');
      return;
    }

    if (!formData.image_url && !isEditMode) {
      toast.error('Please select an image');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('designation', formData.designation);
      submitData.append('description', formData.description);
      submitData.append('rating', formData.rating.toString());

      if (formData.image_url) {
        submitData.append('image', formData.image_url);
      }

      const endpoint = isEditMode && editingTestimonial
        ? ENDPOINTS.ADMIN_TESTIMONIAL_UPDATE(editingTestimonial.id)
        : ENDPOINTS.ADMIN_TESTIMONIAL_CREATE;

      const method = isEditMode ? 'put' : 'post';
      const response = await apiCall(method, endpoint, submitData);

      if (response.success) {
        toast.success(isEditMode ? 'Testimonial updated successfully' : 'Testimonial created successfully');
        setShowAddForm(false);
        resetForm();
        fetchTestimonials();
      }
    } catch (error) {
      console.error('Error saving testimonial:', error);
      toast.error('Failed to save testimonial');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setIsEditMode(true);
    setFormData({
      name: testimonial.name,
      designation: testimonial.designation,
      description: testimonial.description,
      rating: testimonial.rating,
      isActive: testimonial.isActive ? '1' : '0',
      image_url: null,
    });
    setImagePreview(testimonial.image_url);
    setShowAddForm(true);
  };

  const handleDeleteClick = (testimonialId: string) => {
    setTestimonialToDelete(testimonialId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!testimonialToDelete) return;

    try {
      setLoading(true);
      const response = await apiCall('delete', ENDPOINTS.ADMIN_TESTIMONIAL_DELETE(testimonialToDelete));
      if (response.success) {
        toast.success('Testimonial deleted successfully');
        fetchTestimonials();
      }
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      toast.error('Failed to delete testimonial');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setTestimonialToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setTestimonialToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      designation: '',
      description: '',
      rating: 5,
      isActive: '1',
      image_url: null,
    });
    setImagePreview(null);
    setEditingTestimonial(null);
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Testimonials Management</h1>
        <button
          onClick={handleAddClick}
          className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Testimonial
        </button>
      </div>

      {/* Add/Edit Testimonial Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Testimonial' : 'Add New Testimonial'}
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
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Designation *
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter designation/position"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating *
              </label>
              <select
                name="rating"
                value={formData.rating}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                required
              >
                <option value={1}>1 Star</option>
                <option value={2}>2 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={5}>5 Stars</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter testimonial description..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Image *
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> profile image
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      // required={!isEditMode}
                    />
                  </label>
                </div>

                {imagePreview && (
                  <div className="flex justify-center">
                    <ClickableImage
                      src={imagePreview}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-full border border-gray-300"
                    />
                  </div>
                )}
              </div>
              <ImageDimensionNote type="testimonial" />
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
                {loading ? 'Saving...' : (isEditMode ? 'Update Testimonial' : 'Create Testimonial')}
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
              placeholder="Search testimonials..."
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
          ) : filteredTestimonials.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Testimonial Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTestimonials.map((testimonial) => (
                  <tr key={testimonial.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                        <ClickableImage
                          src={testimonial.image_url}
                          alt={testimonial.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">{testimonial.name}</div>
                        <div className="text-sm text-gray-500 mb-2">{testimonial.designation}</div>
                        <div className="text-sm text-gray-600 line-clamp-2">{testimonial.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {renderStars(testimonial.rating)}
                        <span className="ml-2 text-sm text-gray-500">
                          ({testimonial.rating}/5)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClick(testimonial)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Testimonial"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(testimonial.id)}
                          className="text-primaryRed hover:text-red-900"
                          title="Delete Testimonial"
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
                <Star className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Testimonials Found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'No testimonials match your search criteria.' : 'Get started by creating your first testimonial.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleAddClick}
                  className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Testimonial
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
        title="Delete Testimonial"
        message="Are you sure you want to delete this testimonial? This action will permanently remove the testimonial from your system."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
      />
    </div>
  );
};

export default AdminTestimonials;