import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, Newspaper, Clock, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import BreakingNewsComponent from '../../components/common/BreakingNews';

interface BreakingNews {
  id: string | number;
  title: string;
  message: string;
  time: string;
  status: 'NEW' | 'LIVE' | 'ARCHIVED';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const AdminBreakingNews: React.FC = () => {
  const [breakingNews, setBreakingNews] = useState<BreakingNews[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState<string | number | null>(null);
  const [editingNews, setEditingNews] = useState<BreakingNews | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    time: '',
    status: 'NEW' as 'NEW' | 'LIVE' | 'ARCHIVED',
    isActive: true
  });

  useEffect(() => {
    fetchBreakingNews();
  }, []);

  const fetchBreakingNews = async () => {
    try {
      setLoading(true);
      const response = await apiCall('get', ENDPOINTS.ADMIN_BREAKING_NEWS);
      if (response.success) {
        setBreakingNews(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching breaking news:', error);
      toast.error('Failed to fetch breaking news');
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = breakingNews.filter(news =>
    news.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    news.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter news title');
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Please enter news message');
      return;
    }

    if (!formData.time) {
      toast.error('Please enter news time');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        title: formData.title,
        message: formData.message,
        time: formData.time,
        status: formData.status,
        isActive: formData.isActive
      };

      const endpoint = isEditMode && editingNews
        ? ENDPOINTS.ADMIN_BREAKING_NEWS_UPDATE(editingNews.id)
        : ENDPOINTS.ADMIN_BREAKING_NEWS_CREATE;

      const method = isEditMode ? 'put' : 'post';
      const response = await apiCall(method, endpoint, submitData);

      if (response.success) {
        toast.success(isEditMode ? 'Breaking news updated successfully' : 'Breaking news created successfully');
        setShowAddForm(false);
        resetForm();
        fetchBreakingNews();
      }
    } catch (error) {
      console.error('Error saving breaking news:', error);
      toast.error('Failed to save breaking news');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (news: BreakingNews) => {
    setEditingNews(news);
    setIsEditMode(true);

    setFormData({
      title: news.title,
      message: news.message,
      time: news.time || '',
      status: news.status || 'NEW',
      isActive: news.isActive !== undefined ? news.isActive : true
    });
    setShowAddForm(true);
  };

  const handleDeleteClick = (newsId: string | number) => {
    setNewsToDelete(newsId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!newsToDelete) return;

    try {
      setLoading(true);
      const response = await apiCall('delete', ENDPOINTS.ADMIN_BREAKING_NEWS_DELETE(newsToDelete));
      if (response.success) {
        toast.success('Breaking news deleted successfully');
        fetchBreakingNews();
      }
    } catch (error) {
      console.error('Error deleting breaking news:', error);
      toast.error('Failed to delete breaking news');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setNewsToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setNewsToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      time: '',
      status: 'NEW' as 'NEW' | 'LIVE' | 'ARCHIVED',
      isActive: true
    });
    setEditingNews(null);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    resetForm();
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setBreakingNews(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    toast.success('News item moved up');
  };

  const handleMoveDown = (index: number) => {
    if (index === breakingNews.length - 1) return;
    setBreakingNews(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    toast.success('News item moved down');
  };

  const handleAddClick = () => {
    resetForm();
    setShowAddForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Breaking News Management</h1>
        <button
          onClick={handleAddClick}
          className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Breaking News
        </button>
      </div>

      {/* Live Preview of Moving & Adjustable Breaking News Banner */}
      <div className="bg-gradient-to-r from-red-50/50 via-white to-slate-50 border border-red-100 rounded-xl p-3 shadow-xs">
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-red-600">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            Live Ticker Preview (Moving & Adjustable Controls)
          </span>
          <span className="text-[11px] text-gray-400 font-normal lowercase">Adjust speed, pause, or switch modes in real-time</span>
        </div>
        <BreakingNewsComponent key={breakingNews.length} />
      </div>

      {/* Add/Edit Breaking News Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Breaking News' : 'Add New Breaking News'}
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
                News Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter news title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                News Message *
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter news message"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                News Time *
              </label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                required
              />
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                required
              >
                <option value="NEW">New</option>
              </select>
            </div> */}

<div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="active-status"
                    name="isActive"
                    value="true"
                    checked={formData.isActive === true}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      isActive: e.target.value === 'true'
                    }))}
                    className="h-4 w-4 text-primaryRed focus:ring-primaryRed border-gray-300"
                  />
                  <label htmlFor="active-status" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                    Active
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="inactive-status"
                    name="isActive"
                    value="false"
                    checked={formData.isActive === false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      isActive: e.target.value === 'true'
                    }))}
                    className="h-4 w-4 text-primaryRed focus:ring-primaryRed border-gray-300"
                  />
                  <label htmlFor="inactive-status" className="ml-2 block text-sm text-gray-900 cursor-pointer">
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
                {loading ? 'Saving...' : (isEditMode ? 'Update Breaking News' : 'Create Breaking News')}
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
              placeholder="Search breaking news..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full max-w-md focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredNews.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    News Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNews.map((news, index) => (
                  <tr key={news.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">{news.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-2">{news.message}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center mb-1">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          {news.time}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center mb-1">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          {news.createdAt ? new Date(news.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        news.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                        news.status === 'LIVE' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {news.status}
                      </span>
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${news.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {news.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === filteredNews.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(news)}
                          className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
                          title="Edit Breaking News"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(news.id)}
                          className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                          title="Delete Breaking News"
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
                <Newspaper className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Breaking News Found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'No breaking news match your search criteria.' : 'Get started by creating your first breaking news.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleAddClick}
                  className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Breaking News
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
        title="Delete Breaking News"
        message="Are you sure you want to delete this breaking news? This action will permanently remove the news from your system."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
      />
    </div>
  );
};

export default AdminBreakingNews;
