import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, BookOpen, Calendar, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import ClickableImage from '../../components/common/ClickableImage';
import Ckeditor from '../../components/common/Ckeditor';
import ImageDimensionNote from '../../lib/ImageDimensionNote';
import { addAnonymousToImages, formatMagazineUrl } from '../../lib/utils';

interface PublicationPlan {
  id?: number;
  PublicationId?: number;
  planName?: string | null;
  duration: number | string;
  price: number | string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface Publication {
  id: string | number;
  title: string;
  publishDate: string;
  description: string;
  coverImageUrl: string;
  pdfFileUrl: string;
  plans?: PublicationPlan[];
  PublicationPlans?: PublicationPlan[];
  MagazinePlans?: PublicationPlan[];
  type: string;
  featured: string;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
}

const AdminPublications: React.FC = () => {
  const [Publications, setPublications] = useState<Publication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [PublicationToDelete, setPublicationToDelete] = useState<string | null>(null);
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    publishDate: '',
    description: '',
    coverImage: null as File | null,
    pdfFile: null as File | null,
    plans: [{ price: '', duration: '' }] as PublicationPlan[],
    type: '',
    featured: '',
    metaTitle: '',
    metaKeywords: '',
    metaDescription: ''
  });
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchPublications();
  }, []);

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [editingPublication]);


  const fetchPublications = async () => {
    try {
      setDataLoading(true);
      const response = await apiCall('get', ENDPOINTS.ADMIN_MAGAZINES);
      if (response.success) {
        const rawList = response.data?.data || response.data || [];
        const normalizedList = (Array.isArray(rawList) ? rawList : []).map((pub: any) => {
          const cover = formatMagazineUrl(pub.coverImageUrl || pub.cover_image_url || pub.coverImage);
          const pdf = formatMagazineUrl(pub.pdfFileUrl || pub.pdf_url || pub.pdfFile);
          const plans = pub.plans || pub.PublicationPlans || pub.MagazinePlans || [];
          return {
            ...pub,
            coverImageUrl: cover,
            cover_image_url: cover,
            pdfFileUrl: pdf,
            pdf_url: pdf,
            plans: Array.isArray(plans) && plans.length > 0 ? plans : [{ price: '', duration: '' }],
          };
        });
        setPublications(normalizedList);
      }
    } catch (error) {
      console.error('Error fetching Publications:', error);
      toast.error('Failed to fetch Publications');
    } finally {
      setDataLoading(false);
    }
  };


  const filteredPublications = Publications.filter(Publication =>
    Publication.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    Publication.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    Publication.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (field === 'coverImage') {
        if (!file.type.startsWith('image/')) {
          toast.error('Please select a valid image file');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image size should be less than 5MB');
          return;
        }
        setCoverPreview(URL.createObjectURL(file));
      }

      setFormData(prev => ({
        ...prev,
        [field]: file
      }));
    }
  };

  const handlePlanChange = (index: number, field: keyof PublicationPlan, value: string) => {
    setFormData(prev => ({
      ...prev,
      plans: prev.plans.map((plan, i) =>
        i === index ? { ...plan, [field]: value } : plan
      )
    }));
  };

  const addPlan = () => {
    setFormData(prev => ({
      ...prev,
      plans: [...prev.plans, { price: '', duration: '' }]
    }));
  };

  const removePlan = (index: number) => {
    if (formData.plans.length <= 1) {
      toast.error('At least one plan is required');
      return;
    }

    setFormData(prev => ({
      ...prev,
      plans: prev.plans.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter Publication title');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter description');
      return;
    }

    if (!formData.coverImage && !isEditMode) {
      toast.error('Please select a cover image');
      return;
    }

    if (!formData.pdfFile && !isEditMode) {
      toast.error('Please select a PDF file');
      return;
    }

    for (let i = 0;i < formData.plans.length;i++) {
      const plan = formData.plans[i];

      if (!plan.price || isNaN(Number(plan.price))) {
        toast.error(`Please enter a valid price for plan ${i + 1}`);
        return;
      }

      if (!plan.duration || isNaN(Number(plan.duration))) {
        toast.error(`Please enter a valid duration for plan ${i + 1}`);
        return;
      }
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('publishDate', formData.publishDate);
      submitData.append('description', addAnonymousToImages(formData.description));
      submitData.append('type', formData.type);
      submitData.append('featured', formData.featured);
      submitData.append('metaTitle', formData.metaTitle);
      submitData.append('metaKeywords', formData.metaKeywords);
      submitData.append('metaDescription', formData.metaDescription);

      // Add plans
      formData.plans.forEach((plan, index) => {
        submitData.append(`plans[${index}][price]`, plan.price.toString());
        submitData.append(`plans[${index}][duration]`, plan.duration.toString());
      });

      if (formData.coverImage) {
        submitData.append('coverImage', formData.coverImage);
      }
      if (formData.pdfFile) {
        submitData.append('pdfFile', formData.pdfFile);
      }

      const endpoint = isEditMode && editingPublication
        ? ENDPOINTS.ADMIN_MAGAZINE_UPDATE(editingPublication.id.toString())
        : ENDPOINTS.ADMIN_MAGAZINE_CREATE;

      const method = isEditMode ? 'put' : 'post';
      const response = await apiCall(method, endpoint, submitData);

      if (response.success) {
        toast.success(isEditMode ? 'Publication updated successfully' : 'Publication created successfully');
        setShowAddForm(false);
        resetForm();
        fetchPublications();
      }
    } catch (error) {
      console.error('Error saving Publication:', error);
      toast.error(error?.response?.data?.errors);
    } finally {
      setLoading(false);
    }
  };

  const decodeHTML = (html: string) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  const handleEditClick = (Publication: Publication) => {
    setEditingPublication(Publication);
    setIsEditMode(true);

    // Format the date for HTML date input (YYYY-MM-DD)
    const formattedDate = Publication.publishDate ?
      new Date(Publication.publishDate).toISOString().split('T')[0] : '';

    // Get plans from MagazinePlans (API response), PublicationPlans, or plans field
    const magazinePlans = Publication.MagazinePlans || Publication.PublicationPlans || Publication.plans || [];
    const formattedPlans = magazinePlans.length > 0 ?
      magazinePlans.map(plan => ({ price: plan.price.toString(), duration: plan.duration.toString() })) :
      [{ price: '', duration: '' }];

    setFormData({
      title: Publication.title,
      publishDate: formattedDate,
      description: decodeHTML(Publication.description),
      coverImage: null,
      pdfFile: null,
      plans: formattedPlans,
      type: Publication.type,
      featured: Publication.featured,
      metaTitle: Publication.metaTitle || '',
      metaKeywords: Publication.metaKeywords || '',
      metaDescription: Publication.metaDescription || ''
    });
    const coverUrl = formatMagazineUrl(Publication.coverImageUrl || Publication.cover_image_url || Publication.coverImage);
    setCoverPreview(coverUrl || null);
    setShowAddForm(true);
  };

  const handleDeleteClick = (PublicationId: string) => {
    setPublicationToDelete(PublicationId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!PublicationToDelete) return;

    try {
      setLoading(true);
      const response = await apiCall('delete', ENDPOINTS.ADMIN_MAGAZINE_DELETE(PublicationToDelete));
      if (response.success) {
        toast.success('Publication deleted successfully');
        fetchPublications();
      }
    } catch (error) {
      console.error('Error deleting Publication:', error);
      toast.error('Failed to delete Publication');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setPublicationToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setPublicationToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      publishDate: '',
      description: '',
      coverImage: null,
      pdfFile: null,
      plans: [{ price: '', duration: '' }],
      type: '',
      featured: '',
      metaTitle: '',
      metaKeywords: '',
      metaDescription: ''
    });
    setCoverPreview(null);
    setEditingPublication(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Publication Management</h1>
        <button
          onClick={handleAddClick}
          className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Publication
        </button>
      </div>

      {/* Add/Edit Publication Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Publication' : 'Add New Publication'}
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
                Publication Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter Publication title"
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
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publish Date
                </label>
                <input
                  type="date"
                  name="publishDate"
                  value={formData.publishDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                >
                  <option value="">Select Type</option>
                  <option value="incense media">Incense Media</option>
                  <option value="soap-detergent">Soap & Detergent</option>
                  <option value="stone-tiles">Stone & Tiles</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Featured
              </label>
              <select
                name="featured"
                value={formData.featured}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
              >
                <option value="">Select Featured</option>
                <option value="today">Today</option>
                <option value="full-time">Full Time</option>
              </select>
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
                  Cover Image *
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'coverImage')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required={!isEditMode}
                    />
                  </div>
                  {coverPreview && (
                    <div className="flex-shrink-0">
                      <ClickableImage
                        src={coverPreview}
                        alt="Cover Preview"
                        className="w-20 h-12 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                      />
                    </div>
                  )}
                </div>
                <ImageDimensionNote type="magazineCover" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF File *
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileChange(e, 'pdfFile')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required={!isEditMode}
                    />
                  </div>
                  {(isEditMode && (editingPublication?.pdfFileUrl || (editingPublication as any)?.pdf_url)) && (
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center p-2 bg-gray-50 rounded-lg border">
                        <a
                          href={formatMagazineUrl(editingPublication.pdfFileUrl || (editingPublication as any)?.pdf_url || editingPublication.pdfFile)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center"
                          title="View PDF"
                        >
                          <BookOpen className="w-4 h-4 mr-1" />
                          View PDF
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Publication Plans */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Publication Plans
                </label>
                <button
                  type="button"
                  onClick={addPlan}
                  className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Plan
                </button>
              </div>

              {formData.plans.map((plan, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price
                    </label>
                    <input
                      type="number"
                      value={plan.price}
                      onChange={(e) => handlePlanChange(index, 'price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                      placeholder="Enter price"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (Years)
                    </label>
                    <input
                      type="number"
                      value={plan.duration}
                      onChange={(e) => handlePlanChange(index, 'duration', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                      placeholder="Enter duration"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removePlan(index)}
                      className={`px-3 py-2 rounded-lg transition-colors flex items-center ${formData.plans.length === 1
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-primaryRed text-white hover:bg-red-700'
                        }`}
                      disabled={formData.plans.length === 1}
                      title={formData.plans.length === 1 ? 'At least one plan is required' : 'Remove plan'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
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
                {loading ? 'Saving...' : (isEditMode ? 'Update Publication' : 'Create Publication')}
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
              placeholder="Search Publications..."
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
          ) : filteredPublications.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cover
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Publication Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Publish Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Featured
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPublications.map((Publication) => (
                  <tr key={Publication.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                          <ClickableImage
                            src={formatMagazineUrl(Publication.coverImageUrl || Publication.cover_image_url || Publication.coverImage)}
                            fallbackSrc="/assets/img/banner-images/publications.jpg"
                            alt={Publication.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <a
                            href={formatMagazineUrl(Publication.pdfFileUrl || Publication.pdf_url || Publication.pdfFile)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center"
                            title="View PDF"
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            View PDF
                          </a>
                          <span className="text-xs text-gray-500">Click cover to preview</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">{Publication.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-2">{Publication.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {Publication.publishDate ? new Date(Publication.publishDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Publication.type || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${Publication.featured === 'today' ? 'bg-blue-100 text-blue-800' :
                        Publication.featured === 'full-time' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {Publication.featured.toUpperCase() || 'None'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClick(Publication)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Publication"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(Publication.id.toString())}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Publication"
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
                <BookOpen className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Publications Found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'No Publications match your search criteria.' : 'Get started by creating your first Publication.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleAddClick}
                  className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Publication
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
        title="Delete Publication"
        message="Are you sure you want to delete this Publication? This action will permanently remove the Publication from your system."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
      />
    </div>
  );
};

export default AdminPublications;