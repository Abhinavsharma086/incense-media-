import React, { useState, useEffect, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import ClickableImage from '../../components/common/ClickableImage';
import Ckeditor from '../../components/common/Ckeditor';
import ImageDimensionNote from '../../lib/ImageDimensionNote';
import AwardOptionalData from '../../components/common/AwardOptionalData';

const AdminAwardsCreate: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const galleryInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [brochureImagePreview, setBrochureImagePreview] = useState<string | null>(null);
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
    brochureImage: null as File | null,
    bannerImage: null as File | null,
    metaTitle: '',
    metaKeywords: '',
    metaDescription: '',
    optionalData: {
      ceremony: '',
      takeaways: [''],
      achievers: [{
        category: '',
        reservedOpen: '',
        awardee: '',
        runnerUp: ''
      }],
      mapLink: '',
      registrationLink: ''
    }
  });

  useEffect(() => {
    // Check if we're editing an award from localStorage
    const editingAward = localStorage.getItem('editingAward');
    if (editingAward) {
      const award = JSON.parse(editingAward);
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
        brochureImage: award?.brochureImage,
        bannerImage: award?.bannerImage,
        metaTitle: award.metaTitle || '',
        metaKeywords: award.metaKeywords || '',
        metaDescription: award.metaDescription || '',
        optionalData: award.optionalData ?
          (() => {
            try {
              return typeof award.optionalData === 'string' ? JSON.parse(award.optionalData) : award.optionalData;
            } catch (error) {
              console.error('Error parsing optionalData:', error);
              return {
                ceremony: '',
                takeaways: [''],
                achievers: [{
                  category: '',
                  reservedOpen: '',
                  awardee: '',
                  runnerUp: ''
                }],
                mapLink: '',
                registrationLink: ''
              };
            }
          })() :
          {
            ceremony: '',
            takeaways: [''],
            achievers: [{
              category: '',
              reservedOpen: '',
              awardee: '',
              runnerUp: ''
            }],
            mapLink: '',
            registrationLink: ''
          }
      });
      setImagePreview(award.image_url);
      setBannerPreview(award.banner_image_url);
      setBrochureImagePreview(award.brochureImageUrl);

      // Format existing optional images for display
      const optionalImages = award.OptionalImages || award.optionalImages || award.galleryImages || [];
      const formattedOptionalImages = optionalImages.map(img => ({
        type: "existing",
        data: img.image_url || img.imageUrl || img.url,
        id: img.id
      }));
      setGalleryImages(formattedOptionalImages);
    }
  }, []);

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
      } else if (field === 'brochureImage') {
        setBrochureImagePreview(URL.createObjectURL(file));
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
      submitData.append('longDescription', formData.longDescription);
      submitData.append('isActive', formData.isActive);
      submitData.append('date', formData.date);
      submitData.append('time', formData.time);
      submitData.append('address', formData.address);
      submitData.append('awardType', formData.awardType);
      submitData.append('metaTitle', formData.metaTitle);
      submitData.append('metaKeywords', formData.metaKeywords);
      submitData.append('metaDescription', formData.metaDescription);

      // Only send optional data if it has actual values
      const optionalDataToSend = {
        ceremony: formData.optionalData?.ceremony?.trim() || null,
        takeaways: formData.optionalData?.takeaways?.filter(takeaway => takeaway.trim() !== ''),
        achievers: formData.optionalData?.achievers?.filter(achiever =>
          achiever.category?.trim() !== '' ||
          achiever.reservedOpen?.trim() !== '' ||
          achiever.awardee?.trim() !== '' ||
          achiever.runnerUp?.trim() !== ''
        ),
        mapLink: formData.optionalData?.mapLink?.trim() || null,
        registrationLink: formData.optionalData?.registrationLink?.trim() || null
      };

      // Only append optional data if it has meaningful content
      if (optionalDataToSend.ceremony ||
        optionalDataToSend.takeaways?.length > 0 ||
        optionalDataToSend.achievers?.length > 0 ||
        optionalDataToSend.mapLink ||
        optionalDataToSend.registrationLink) {
        submitData.append('optionalData', JSON.stringify(optionalDataToSend));
      } else {
        submitData.append('optionalData', JSON.stringify({}));
      }

      if (formData.image_url) {
        submitData.append('image', formData.image_url);
      }
      if (formData.brochureFile) {
        submitData.append('brochureFile', formData.brochureFile);
      }
      if (formData.brochureImage) {
        submitData.append('brochureImage', formData.brochureImage);
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

      const editingAward = localStorage.getItem('editingAward');
      let response;

      if (isEditMode && editingAward) {
        const award = JSON.parse(editingAward);
        response = await apiCall('put', ENDPOINTS.ADMIN_AWARD_UPDATE(award.id), submitData);
      } else {
        response = await apiCall('post', ENDPOINTS.ADMIN_AWARD_CREATE, submitData);
      }

      if (response.success) {
        toast.success(isEditMode ? 'Award updated successfully' : 'Award created successfully');
        localStorage.removeItem('editingAward');
        navigate('/admin/awards');
      }
    } catch (error) {
      console.error('Error saving award:', error);
      toast.error('Failed to save award');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('editingAward');
    navigate('/admin/awards');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Award' : 'Create New Award'}
        </h1>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Map Link
              </label>
              <input
                type="url"
                value={formData.optionalData?.mapLink}
                onChange={(e) => setFormData(prev => ({ ...prev, optionalData: { ...prev.optionalData, mapLink: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter map link (e.g., Google Maps URL)..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registration Link
              </label>
              <input
                type="url"
                value={formData.optionalData?.registrationLink}
                onChange={(e) => setFormData(prev => ({ ...prev, optionalData: { ...prev.optionalData, registrationLink: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter registration link..."
              />
            </div>
          </div>
          {/* Award Optional Data Section - Only show in edit mode */}
          {isEditMode && (
            <div>
              <AwardOptionalData
                optionalData={formData.optionalData}
                onDataChange={(data) => setFormData(prev => ({ ...prev, optionalData: data }))}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                Brochure Image
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'brochureImage')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                {brochureImagePreview && (
                  <div className="flex-shrink-0">
                    <ClickableImage
                      src={brochureImagePreview}
                      alt="Brochure Image Preview"
                      className="w-20 h-12 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                    />
                  </div>
                )}
              </div>
              <ImageDimensionNote type="award" />
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
<p className='italic font-semibold text-[14px]'>Note: Please select max 4 images at a time</p>
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
                  disabled={loading}
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
    </div>
  );
};

export default AdminAwardsCreate;
