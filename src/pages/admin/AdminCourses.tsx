import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, GraduationCap, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import ClickableImage from '../../components/common/ClickableImage';
import Ckeditor from '../../components/common/Ckeditor';
import ImageDimensionNote from '../../lib/ImageDimensionNote';
import { addAnonymousToImages } from '../../lib/utils';

interface Course {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  isActive: string;
  image: string;
  imageUrl: string;
  bannerImage: string;
  bannerImageUrl: string;
  fees: string;
  videoUrl: string;
  optionalData: string[];
  likes: number;
  readCount: number;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface PaginationMeta {
  total: number;
  page: number;
  pages: number;
}

interface CoursesResponse {
  items: Course[];
  meta: PaginationMeta;
}

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    pages: 1
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    description: '',
    isActive: '1',
    image: null as File | null,
    bannerImage: null as File | null,
    fees: '',
    videoUrl: '',
    optionalData: {} as any,
    metaTitle: '',
    metaKeywords: '',
    metaDescription: ''
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [initialFormData, setInitialFormData] = useState<any>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch courses when debounced search term or page changes
  useEffect(() => {
    fetchCourses(1, debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [editingCourse]);
  

  const fetchCourses = async (page: number = 1, search: string = '') => {
    try {
      // Use searchLoading for search operations, loading for other operations
      if (search) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search })
      });

      const response = await apiCall('get', `${ENDPOINTS.ADMIN_COURSES}?${params}`);
      if (response.success) {
        const raw = response.data?.data || response.data;
        const rawItems: any[] = Array.isArray(raw)
          ? raw
          : (Array.isArray(raw?.items) ? raw.items : (Array.isArray(response.data?.items) ? response.data.items : []));
        const meta = raw?.meta || response.data?.meta || { total: rawItems.length, page, pages: 1 };

        // Parse optionalData JSON strings for each course
        const parsedCourses = rawItems.map((course: any) => {
          let parsedOptionalData = [];
          if (course.optionalData) {
            if (typeof course.optionalData === 'string') {
              try {
                parsedOptionalData = JSON.parse(course.optionalData);
              } catch (error) {
                console.error('Error parsing optionalData for course:', course.id, error);
                parsedOptionalData = [];
              }
            } else {
              parsedOptionalData = course.optionalData;
            }
          }
          return {
            ...course,
            optionalData: parsedOptionalData
          };
        });
        setCourses(parsedCourses);
        setPagination(meta);
      } else {
        setCourses([]);
        setPagination({ total: 0, page: 1, pages: 1 });
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
      setCourses([]);
      setPagination({ total: 0, page: 1, pages: 1 });
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  // Remove client-side filtering since we're doing server-side search
  // const filteredCourses = Array.isArray(courses) ? courses.filter(course =>
  //   course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   course.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
  // ) : [];

  const handlePageChange = (newPage: number) => {
    fetchCourses(newPage, debouncedSearchTerm);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Reset to page 1 when searching (handled by debounced effect)
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

      if (field === 'image') {
        setImagePreview(URL.createObjectURL(file));
      } else if (field === 'bannerImage') {
        setBannerPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleOptionalDataAdd = (key: string) => {
    setFormData(prev => ({
      ...prev,
      optionalData: { ...prev.optionalData, [key]: '' }
    }));
  };

  const handleOptionalDataChange = (key: string, value: string) => {
    const newOptionalData = { ...formData.optionalData };
    newOptionalData[key] = value;
    setFormData(prev => ({
      ...prev,
      optionalData: newOptionalData
    }));
  };

  const handleOptionalDataRemove = (index: number) => {
    const newOptionalData = formData.optionalData.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      optionalData: newOptionalData
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditMode && !formData.title.trim()) {
      toast.error('Please enter academy title');
      return;
    }

    if (!isEditMode && !formData.shortDescription.trim()) {
      toast.error('Please enter short description');
      return;
    }

    if (!isEditMode && !formData.description.trim()) {
      toast.error('Please enter description');
      return;
    }

    if (!formData.image && !isEditMode) {
      toast.error('Please select an academy image');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();

      if (isEditMode) {
        if (!editingCourse) return;
        let changedCount = 0;

        const stringKeys = [
          'title',
          'shortDescription',
          'description',
          'isActive',
          'fees',
          'videoUrl',
          'metaTitle',
          'metaKeywords',
          'metaDescription',
        ];

        stringKeys.forEach((key) => {
          const currentVal = formData[key as keyof typeof formData] !== undefined && formData[key as keyof typeof formData] !== null ? String(formData[key as keyof typeof formData]).trim() : '';
          const initVal = initialFormData && initialFormData[key] !== undefined && initialFormData[key] !== null ? String(initialFormData[key]).trim() : '';

          if (currentVal !== initVal) {
            if (key === 'description') {
              submitData.append('description', addAnonymousToImages(formData.description));
            } else {
              submitData.append(key, String(formData[key as keyof typeof formData]));
            }
            changedCount++;
          }
        });

        // OptionalData check
        const currentOptStr = JSON.stringify(formData.optionalData || {});
        const initOptStr = JSON.stringify(initialFormData?.optionalData || {});
        if (currentOptStr !== initOptStr) {
          submitData.append('optionalData', currentOptStr);
          changedCount++;
        }

        // New Image check (only append if a new file was actually picked)
        if (formData.image instanceof File) {
          submitData.append('image', formData.image);
          changedCount++;
        }
        if (formData.bannerImage instanceof File) {
          submitData.append('bannerImage', formData.bannerImage);
          submitData.append('banner_image', formData.bannerImage);
          changedCount++;
        }

        if (changedCount === 0) {
          toast.info("Koi badlaav nahi kiya gaya");
          setShowAddForm(false);
          resetForm();
          return;
        }

        const endpoint = ENDPOINTS.ADMIN_COURSE_UPDATE(editingCourse.id);
        const response = await apiCall('put', endpoint, submitData);

        if (response.success) {
          toast.success('Academy updated successfully');
          setShowAddForm(false);
          resetForm();
          fetchCourses();
        } else {
          toast.error(response?.error || response?.data?.message || 'Failed to update academy');
        }
      } else {
        // Create Mode: Send full data
        submitData.append('title', formData.title.trim());
        submitData.append('shortDescription', formData.shortDescription.trim());
        submitData.append('description', addAnonymousToImages(formData.description));
        submitData.append('isActive', formData.isActive);
        submitData.append('fees', formData.fees || '0');
        submitData.append('videoUrl', formData.videoUrl || '');
        submitData.append('optionalData', JSON.stringify(formData.optionalData || {}));
        if (formData.metaTitle) submitData.append('metaTitle', formData.metaTitle);
        if (formData.metaKeywords) submitData.append('metaKeywords', formData.metaKeywords);
        if (formData.metaDescription) submitData.append('metaDescription', formData.metaDescription);

        if (formData.image instanceof File) {
          submitData.append('image', formData.image);
        }
        if (formData.bannerImage instanceof File) {
          submitData.append('bannerImage', formData.bannerImage);
          submitData.append('banner_image', formData.bannerImage);
        }

        const response = await apiCall('post', ENDPOINTS.ADMIN_COURSE_CREATE, submitData);

        if (response.success) {
          toast.success('Academy created successfully');
          setShowAddForm(false);
          resetForm();
          fetchCourses();
        } else {
          toast.error(response?.error || response?.data?.message || 'Failed to create academy');
        }
      }
    } catch (error: any) {
      console.error('Error saving academy:', error);
      toast.error(error?.message || 'Failed to save academy');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (course: any) => {
    setEditingCourse(course);
    setIsEditMode(true);

    // Parse optionalData if it's a JSON string
    let parsedOptionalData: any = {};
    if (course.optionalData) {
      if (typeof course.optionalData === 'string') {
        try {
          parsedOptionalData = JSON.parse(course.optionalData);
        } catch (error) {
          console.error('Error parsing optionalData:', error);
          parsedOptionalData = {};
        }
      } else {
        parsedOptionalData = course.optionalData;
      }
    }

    const initial = {
      title: course.title || '',
      shortDescription: course.shortDescription || '',
      description: course.description || '',
      isActive: course.isActive ? '1' : '0',
      image: null,
      bannerImage: null,
      fees: course.fees !== null && course.fees !== undefined ? String(course.fees) : '',
      videoUrl: course.videoUrl || '',
      optionalData: parsedOptionalData,
      metaTitle: course.metaTitle || '',
      metaKeywords: course.metaKeywords || '',
      metaDescription: course.metaDescription || ''
    };

    setFormData(initial);
    setInitialFormData(initial);
    setImagePreview(course.image_url || course.imageUrl || null);
    setBannerPreview(course.banner_image_url || course.bannerImageUrl || null);
    setShowAddForm(true);
  };

  const handleDeleteClick = (courseId: string) => {
    setCourseToDelete(courseId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    try {
      setLoading(true);
      const response = await apiCall('delete', ENDPOINTS.ADMIN_COURSE_DELETE(courseToDelete));
      if (response.success) {
        toast.success('Course deleted successfully');
        fetchCourses();
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setCourseToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setCourseToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      shortDescription: '',
      description: '',
      isActive: '1',
      image: null,
      bannerImage: null,
      fees: '',
      videoUrl: '',
      optionalData: {},
      metaTitle: '',
      metaKeywords: '',
      metaDescription: ''
    });
    setInitialFormData(null);
    setImagePreview(null);
    setBannerPreview(null);
    setEditingCourse(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Academy Management</h1>
        <button
          onClick={handleAddClick}
          className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Academy
        </button>
      </div>

      {/* Add/Edit Course Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Academy' : 'Add New Academy'}
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
                Academy Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter academy title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Description *
              </label>
              <input
                type="text"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter short description"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <div style={{ minHeight: '200px' }}>
                <Ckeditor
                  text={formData.description}
                  setText={(text: string) => setFormData(prev => ({ ...prev, description: text }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Fees
                </label>
                <input
                  type="number"
                  name="fees"
                  value={formData.fees}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter course fees"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account No
                </label>
                <input
                  type="number"
                  value={formData.optionalData.accountNo || ''}
                  onChange={(e) => handleOptionalDataChange('accountNo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter Account No"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.optionalData.bankName || ''}
                  onChange={(e) => handleOptionalDataChange('bankName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter Bank Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.optionalData.ifscCode || ''}
                  onChange={(e) => handleOptionalDataChange('ifscCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter IFSC Code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <select
                  value={formData.optionalData.rating || ''}
                  onChange={(e) => handleOptionalDataChange('rating', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                >
                  <option value="">Select Rating</option>
                  <option value="0">0 - Poor</option>
                  <option value="1">1 - Below Average</option>
                  <option value="2">2 - Average</option>
                  <option value="3">3 - Good</option>
                  <option value="4">4 - Very Good</option>
                  <option value="5">5 - Excellent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video URL
              </label>
              <input
                type="url"
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter video URL (e.g., https://youtube.com/watch?v=...)"
              />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academy Image *
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, 'image')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required={!isEditMode}
                    />
                  </div>
                  {imagePreview && (
                    <div className="flex-shrink-0">
                      <ClickableImage
                        src={imagePreview}
                        alt="Academy Preview"
                        className="w-20 h-12 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                      />
                    </div>
                  )}
                </div>
                <ImageDimensionNote type="academy" />
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
                <ImageDimensionNote type="academyBanner" />
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
                    id="active"
                    name="isActive"
                    value="1"
                    checked={formData.isActive === '1' || formData.isActive === '1'}
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
                    checked={formData.isActive === '0' || formData.isActive === '0'}
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
                {loading ? 'Saving...' : (isEditMode ? 'Update Academy' : 'Create Academy')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            {searchLoading ? (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primaryRed"></div>
              </div>
            ) : (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            )}
            <input
              type="text"
              placeholder="Search academy..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className={`pl-10 pr-4 py-2 border rounded-lg w-full max-w-md focus:ring-2 focus:ring-primaryRed focus:border-primaryRed ${searchLoading ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {courses.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academy Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fees
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
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                        <ClickableImage
                          src={course.imageUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">{course.title}</div>
                        <div className="text-sm text-gray-500 mb-1">{course.shortDescription}</div>

                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.fees ? `₹${course.fees}` : 'N/A'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${course.isActive == '1' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {course.isActive == '1' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClick(course)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Academy"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(course.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Academy"
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
                <GraduationCap className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Academy Found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'No academy match your search criteria.' : 'Get started by creating your first academy.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleAddClick}
                  className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Academy
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * 10) + 1} to {Math.min(pagination.page * 10, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const pageNum = Math.max(1, pagination.page - 2) + i;
                  if (pageNum > pagination.pages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${pageNum === pagination.page
                        ? 'bg-primaryRed text-white'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
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
        title="Delete Academy"
        message="Are you sure you want to delete this academy? This action will permanently remove the academy from your system."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
      />
    </div>
  );
};

export default AdminCourses;
