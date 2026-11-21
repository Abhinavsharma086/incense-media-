import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import ClickableImage from '../../components/common/ClickableImage';
import Ckeditor from '../../components/common/Ckeditor';
import ImageDimensionNote from '../../lib/ImageDimensionNote';
import { addAnonymousToImages } from '../../lib/utils';

interface Team {
  id: string;
  name: string;
  position: string;
  description: string;
  image_url: string;
  isActive: boolean;
}

const AdminTeams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    description: 'description',
    team_image: null as File | null,
    isActive: true
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setDataLoading(true);
      const response = await apiCall('get', ENDPOINTS.ADMIN_TEAMS);
      if (response.success) {
        const teamsData = response.data?.data || [];
        // Map API response to match our interface
        const mappedTeams = teamsData.map((team: any) => ({
          ...team,
          position: team.position || team.designation || '', // Handle both field names
          description: team.description === 'addAnonymousToImages(formData.description)' ? '' : (team.description || '') // Ensure description field exists
        }));
        setTeams(mappedTeams);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to fetch teams');
    } finally {
      setDataLoading(false);
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
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
        team_image: file
      }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error('Please enter team member name');
      return;
    }

    if (!formData.position?.trim()) {
      toast.error('Please enter position');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name.trim());
      submitData.append('position', formData.position.trim());
      submitData.append('description', (formData.description || '').trim());
      submitData.append('isActive', formData.isActive ? '1' : '0');

      if (formData.team_image) {
        submitData.append('team_image', formData.team_image);
      }

      const endpoint = isEditMode && editingTeam
        ? ENDPOINTS.ADMIN_TEAM_UPDATE(editingTeam.id)
        : ENDPOINTS.ADMIN_TEAM_CREATE;

      const method = isEditMode ? 'put' : 'post';
      const response = await apiCall(method, endpoint, submitData);

      if (response.success) {
        toast.success(isEditMode ? 'Team member updated successfully' : 'Team member created successfully');
        setShowAddForm(false);
        resetForm();
        fetchTeams();
      }
    } catch (error) {
      console.error('Error saving team member:', error);
      toast.error('Failed to save team member');
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [editingTeam]);

  const handleEditClick = (team: Team) => {
    setEditingTeam(team);
    setIsEditMode(true);
    window.scrollTo(0, 0);
    setFormData({
      name: team.name,
      position: team.position,
      description: team.description,
      team_image: null,
      isActive: team.isActive
    });
    setImagePreview(team.image_url);
    setShowAddForm(true);
  };

  const handleDeleteClick = (teamId: string) => {
    setTeamToDelete(teamId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;

    try {
      setLoading(true);
      const response = await apiCall('delete', ENDPOINTS.ADMIN_TEAM_DELETE(teamToDelete));
      if (response.success) {
        toast.success('Team member deleted successfully');
        fetchTeams();
      }
    } catch (error) {
      console.error('Error deleting team member:', error);
      toast.error('Failed to delete team member');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setTeamToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setTeamToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      description: '',
      team_image: null,
      isActive: true
    });
    setImagePreview(null);
    setEditingTeam(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <button
          onClick={handleAddClick}
          className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Team Member
        </button>
      </div>

      {/* Add/Edit Team Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Team Member' : 'Add New Team Member'}
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
                Team Member Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter team member name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position *
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter position"
                required
              />
            </div>

            {/* <div>
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
            </div> */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Member Image *
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required={!isEditMode}
                  />
                </div>
                {imagePreview && (
                  <div className="flex-shrink-0">
                    <ClickableImage
                      src={imagePreview}
                      alt="Team Member Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                    />
                  </div>
                )}
              </div>
              <ImageDimensionNote type="teamMember" />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-primaryRed focus:ring-primaryRed border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Active Team Member
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
                {loading ? 'Saving...' : (isEditMode ? 'Update Team Member' : 'Create Team Member')}
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
              placeholder="Search team members..."
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
          ) : filteredTeams.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Member Details
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
                {filteredTeams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                        <ClickableImage
                          src={team.image_url}
                          alt={team.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">{team.name}</div>
                        <div className="text-sm text-gray-500 mb-1">{team.position}</div>
                        <div className="text-xs text-gray-400 line-clamp-2">{team.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${team.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {team.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClick(team)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Team Member"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(team.id)}
                          className="text-primaryRed hover:text-red-900"
                          title="Delete Team Member"
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
                <Users className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members Found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'No team members match your search criteria.' : 'Get started by adding your first team member.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleAddClick}
                  className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Team Member
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
        title="Delete Team Member"
        message="Are you sure you want to delete this team member? This action will permanently remove the team member from your system."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
      />
    </div>
  );
};

export default AdminTeams;
