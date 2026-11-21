import { useState, useEffect } from 'react';
import { X, Upload, Link, File, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import ConfirmationModal from './ConfirmationModal';

interface EventLink {
  id?: string;
  title: string;
  isActive: boolean;
  image?: File | string | null;
  url: string;
  eventId: string;
  type: 'file' | 'url';
}

interface EventLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

const EventLinksModal: React.FC<EventLinksModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle
}) => {
  const [links, setLinks] = useState<EventLink[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventLink>({
    title: '',
    isActive: true,
    image: null,
    url: '',
    eventId: eventId,
    type: 'file'
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchLinks();
    }
  }, [isOpen, eventId]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      // Assuming there's an endpoint to fetch event links
      const response = await apiCall('get', ENDPOINTS.EVENT_LINK(eventId));
      if (response.success) {
        setLinks(response.data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a link title');
      return;
    }

    if (formData.type === 'file' && !formData.image) {
      toast.error('Please select a file');
      return;
    }

    if (formData.type === 'url' && !formData.url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('isActive', formData.isActive.toString());
      submitData.append('url', formData.url);
      submitData.append('eventId', eventId);

      if (formData.image && typeof formData.image === 'object' && 'name' in formData.image) {
        submitData.append('image', formData.image as File);
      }

      const response = await apiCall('post', ENDPOINTS.EVENT_LINK_CREATE, submitData);

      if (response.success) {
        toast.success('Link added successfully');
        setShowAddForm(false);
        resetForm();
        fetchLinks();
      }
    } catch (error) {
      console.error('Error adding link:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (linkId: string) => {
    setLinkToDelete(linkId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!linkToDelete) return;

    try {
      setLoading(true);
      const response = await apiCall('delete', ENDPOINTS.EVENT_LINK_DELETE(linkToDelete));
      if (response.success) {
        toast.success('Link deleted successfully');
        fetchLinks();
      }
    } catch (error) {
      console.error('Error deleting link:', error);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setLinkToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setLinkToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      isActive: true,
      image: null,
      url: '',
      eventId: eventId,
      type: 'file'
    });
    setImagePreview(null);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Event Links</h2>
            <p className="text-sm text-gray-500">{eventTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Links List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Current Links</h3>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </button>
          </div>

          {links.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URL/File
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
                  {links.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{link.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {link.type === 'file' ? (
                            <File className="w-4 h-4 text-blue-500 mr-2" />
                          ) : (
                            <Link className="w-4 h-4 text-green-500 mr-2" />
                          )}
                          <span className="text-sm text-gray-900">
                            {link.type === 'file' ? 'File Upload' : 'Direct URL'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {link.type === 'file' ? <a href={link.file_url} target="_blank" className='text-blue-600 hover:text-blue-900' rel="noopener noreferrer">View File</a> : <a href={link.url} target="_blank" className='text-blue-600 hover:text-blue-900' rel="noopener noreferrer">Visit Url</a>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${link.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {link.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteClick(link.id!)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Link className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No links added yet</p>
            </div>
          )}
        </div>

        {/* Add Link Form */}
        {showAddForm && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Link</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                    placeholder="Enter link title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                    required
                  >
                    <option value="file">File Upload</option>
                    <option value="url">Direct URL</option>
                  </select>
                </div>
              </div>

              {formData.type === 'url' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL *
                  </label>
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                    placeholder="https://example.com"
                    required={formData.type === 'url'}
                  />
                </div>
              )}

              {formData.type === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File *
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-3 pb-4">
                          <Upload className="w-6 h-6 mb-2 text-gray-400" />
                          <p className="mb-1 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> file
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, PDF, etc. (MAX. 5MB)</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={handleImageChange}
                          className="hidden"
                          required={formData.type === 'file'}
                        />
                      </label>
                    </div>

                    {imagePreview && (
                      <div className="flex justify-center">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          crossOrigin="anonymous"
                          className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primaryRed focus:ring-primaryRed border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Active Link
                </label>
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
                  {loading ? 'Adding...' : 'Add Link'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Event Link"
        message="Are you sure you want to delete this event link? This action will permanently remove the link from your system."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
      />
    </div>
  );
};

export default EventLinksModal;
