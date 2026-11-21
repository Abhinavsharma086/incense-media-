import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit, Trash2, Calendar, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import ClickableImage from '../../components/common/ClickableImage';
import Ckeditor from '../../components/common/Ckeditor';
import ImageDimensionNote from '../../lib/ImageDimensionNote';
import AwardOptionalData from '../../components/common/AwardOptionalData';
import { addAnonymousToImages } from '../../lib/utils';

interface Award {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  isActive: string;
  date: string;
  time: string;
  address: string;
  awardType: string;
  image_url: string;
  brochureFile?: string;
  bannerImage?: string;
}

const AdminAwards: React.FC = () => {
  const [awards, setAwards] = useState<Award[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [awardToDelete, setAwardToDelete] = useState<string | null>(null);
  const [editingAward, setEditingAward] = useState<Award | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    longDescription: '',
    isActive: '1',
    date: '',
    time: '',
    address: '',
    awardType: 'incense media',
    image_url: null as File | null,
    brochureFile: null as File | null,
    bannerImage: null as File | null,
    optionalData: {
      ceremony: '',
      takeaways: [''],
      achievers: [{
        category: '',
        reservedOpen: '',
        awardee: '',
        runnerUp: ''
      }]
    }
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    fetchAwards();
  }, []);

  const fetchAwards = async () => {
    try {
      setLoading(true);
      const response = await apiCall('get', ENDPOINTS.ADMIN_AWARDS);
      if (response.success) {
        setAwards(response.data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching awards:', error);
      toast.error('Failed to fetch awards');
    } finally {
      setLoading(false);
    }
  };

  const filteredAwards = awards.filter(award =>
    award.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    award.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
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
        [field]: file
      }));

      if (field === 'image_url') {
        setImagePreview(URL.createObjectURL(file));
      } else if (field === 'bannerImage') {
        setBannerPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        [field]: file
      }));
    }
  };

  const handleRemoveImage = async (id, index) => {
    try {
      const res = await apiCall('delete', ENDPOINTS.DELETE_OPTIONAL_IMAGE(id));
      setGalleryImages((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      toast.error(error.response.data.error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter award title');
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
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('longDescription', addAnonymousToImages(formData.longDescription));
      submitData.append('isActive', formData.isActive);
      submitData.append('date', formData.date);
      submitData.append('time', formData.time);
      submitData.append('address', formData.address);
      submitData.append('awardType', formData.awardType);
      submitData.append('optionalData', JSON.stringify(formData.optionalData));

      if (formData.image_url) {
        submitData.append('image', formData.image_url);
      }
      if (formData.brochureFile) {
        submitData.append('brochureFile', formData.brochureFile);
      }
      if (formData.bannerImage) {
        submitData.append('bannerImage', formData.bannerImage);
      }

      // Add gallery images
      galleryImages.forEach((img) => {
        if (img.type === "new") {
          submitData.append("optional_image", img.data);
        }
      });

      const endpoint = isEditMode && editingAward
        ? ENDPOINTS.ADMIN_AWARD_UPDATE(editingAward.id)
        : ENDPOINTS.ADMIN_AWARD_CREATE;

      const method = isEditMode ? 'put' : 'post';
      const response = await apiCall(method, endpoint, submitData);

      if (response.success) {
        toast.success(isEditMode ? 'Award updated successfully' : 'Award created successfully');
        setShowAddForm(false);
        resetForm();
        fetchAwards();
      }
    } catch (error) {
      console.error('Error saving award:', error);
      toast.error('Failed to save award');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (award: any) => {
    setEditingAward(award);
    setIsEditMode(true);
    setFormData({
      title: award.title,
      description: award.description,
      longDescription: award.longDescription,
      isActive: award.isActive ? '1' : '0',
      date: award.date,
      time: award.time,
      address: award.address,
      awardType: award.awardType || 'incense media',
      image_url: award.image_url,
      brochureFile: award?.brochureFile,
      bannerImage: award?.bannerImage,
      optionalData: award.optionalData || {
        ceremony: '',
        takeaways: [''],
        achievers: [{
          category: '',
          reservedOpen: '',
          awardee: '',
          runnerUp: ''
        }]
      }

    });
    setImagePreview(award.image_url);
    setBannerPreview(award.banner_image_url);

    // Format existing optional images for display
    // Check different possible field names for gallery images
    const optionalImages = award.OptionalImages || award.optionalImages || award.galleryImages || [];

    const formattedOptionalImages = optionalImages.map(img => ({
      type: "existing",
      data: img.image_url || img.imageUrl || img.url,
      id: img.id
    }));

    setGalleryImages(formattedOptionalImages);
    setShowAddForm(true);
  };
  const handleDeleteClick = (awardId: string) => {
    setAwardToDelete(awardId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!awardToDelete) return;

    try {
      setLoading(true);
      const response = await apiCall('delete', ENDPOINTS.ADMIN_AWARD_DELETE(awardToDelete));
      if (response.success) {
        toast.success('Award deleted successfully');
        fetchAwards();
      }
    } catch (error) {
      console.error('Error deleting award:', error);
      toast.error('Failed to delete award');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setAwardToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setAwardToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      longDescription: '',
      isActive: '1',
      date: '',
      time: '',
      address: '',
      awardType: 'incense media',
      image_url: null,
      brochureFile: null,
      bannerImage: null,
      optionalData: {
        ceremony: '',
        takeaways: [''],
        achievers: [{
          category: '',
          reservedOpen: '',
          awardee: '',
          runnerUp: ''
        }]
      }
    });
    setImagePreview(null);
    setBannerPreview(null);
    setGalleryImages([]);
    setEditingAward(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Awards Management</h1>
        <button
          onClick={handleAddClick}
          className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Award
        </button>
      </div>

      {/* Add/Edit Award Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Award' : 'Add New Award'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Award Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter award title"
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
                Long Description
              </label>
              <div style={{ minHeight: '200px' }}>
                <Ckeditor
                  text={formData.longDescription}
                  setText={(text: string) => setFormData(prev => ({ ...prev, longDescription: text }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Award Image *
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'image_url')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required={!isEditMode}
                  />
                </div>
                {imagePreview && (
                  <div className="flex-shrink-0">
                    <ClickableImage
                      src={imagePreview}
                      alt="Award Preview"
                      className="w-20 h-12 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                    />
                  </div>
                )}
              </div>
              <ImageDimensionNote type="award" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brochure File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFileChange(e, 'brochureFile')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                />
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
                      onChange={(e) => handleImageChange(e, 'bannerImage')}
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
                <ImageDimensionNote type="awardBanner" />
              </div>
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
                          <span className="font-semibold">Click to upload</span> gallery images
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 5MB each)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        ref={galleryInputRef}
                        multiple
                        onChange={(e) => {
                          const selected = Array.from(e.target.files);
                          
                          // Check current total images (existing + new files)
                          const currentImages = galleryImages.length;
                          const totalImages = currentImages + selected.length;

                          if (totalImages > 20) {
                            toast.error('Maximum 20 images allowed');
                            return;
                          }

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

            {/* Award Optional Data Section */}
            {isEditMode && (<div>
              <AwardOptionalData
                optionalData={formData.optionalData}
                onDataChange={(data) => setFormData(prev => ({ ...prev, optionalData: data }))}
              />
            </div>)}
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
                    checked={formData.isActive === '1'}
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
                    checked={formData.isActive === '0'}
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
                {loading ? 'Saving...' : (isEditMode ? 'Update Award' : 'Create Award')}
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
              placeholder="Search awards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full max-w-md focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredAwards.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Award Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
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
                {filteredAwards.map((award) => (
                  <tr key={award.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                        <ClickableImage
                          src={award.image_url}
                          alt={award.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">{award.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-2">{award.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center mb-1">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {award.date ? new Date(award.date).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">{award.time || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {award.address || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${award.isActive == '1' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {award.isActive == '1' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClick(award)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Award"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(award.id)}
                          className="text-primaryRed hover:text-red-900"
                          title="Delete Award"
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Awards Found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'No awards match your search criteria.' : 'Get started by creating your first award.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleAddClick}
                  className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Award
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
        title="Delete Award"
        message="Are you sure you want to delete this award? This action will permanently remove the award from your system."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
      />
    </div>
  );
};

export default AdminAwards;
