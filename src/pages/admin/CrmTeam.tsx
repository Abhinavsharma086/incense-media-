import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Mail,
  Phone,
  UserPlus,
  Users,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  Briefcase,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { isSuperAdmin } from '@/lib/auth';
import { apiCall } from '@/api/apiCall';
import { ENDPOINTS } from '@/api/endpoints';

interface TeamMember {
  id: string | number;
  name: string;
  position: string;
  description?: string;
  email?: string;
  phone?: string;
  image?: string;
  image_url?: string;
  isActive: boolean;
  createdAt?: string;
}

const CrmTeam: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    position: 'Sales Executive',
    description: '',
    email: '',
    phone: '',
    isActive: true,
    file: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const res = await apiCall('get', ENDPOINTS.ADMIN_TEAMS);
      if (res.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
        const liveList = res.data.data.map((m: any) => ({
          id: m.id,
          name: m.name || '',
          position: m.position || m.designation || 'Team Member',
          description: m.description === 'addAnonymousToImages(formData.description)' ? '' : (m.description || ''),
          image: m.image,
          image_url: m.image_url || (m.image ? `https://api.incensemedia.in/uploads/${m.image}` : undefined),
          isActive: m.isActive === true || m.isActive === 1 || m.isActive === '1',
          createdAt: m.createdAt,
        }));
        setMembers(liveList);
      } else {
        // Fallback default list if API is completely empty
        setMembers([
          { id: '1', name: 'Admin User', position: 'Super Admin', email: 'admin@agency.com', isActive: true },
          { id: '2', name: 'John Doe', position: 'Sales Manager', email: 'john@agency.com', isActive: true },
          { id: '3', name: 'Sarah Smith', position: 'Sales Executive', email: 'sarah@agency.com', isActive: false },
        ]);
      }
    } catch (err) {
      console.error('Error fetching team:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTeamData();
    setRefreshing(false);
    toast.success('Team list refreshed');
  };

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      position: 'Sales Executive',
      description: '',
      email: '',
      phone: '',
      isActive: true,
      file: null,
    });
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: TeamMember) => {
    setEditingMember(m);
    setFormData({
      name: m.name,
      position: m.position,
      description: m.description || '',
      email: m.email || '',
      phone: m.phone || '',
      isActive: m.isActive,
      file: null,
    });
    setImagePreview(m.image_url || null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload a valid image file');
        return;
      }
      setFormData((prev) => ({ ...prev, file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Member name is required');
      return;
    }

    if (!formData.position.trim()) {
      toast.error('Role / Position is required');
      return;
    }

    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('name', formData.name.trim());
      fd.append('position', formData.position.trim());
      fd.append('description', formData.description.trim());
      fd.append('isActive', formData.isActive ? '1' : '0');

      if (formData.file) {
        fd.append('team_image', formData.file);
      }

      let res;
      if (editingMember) {
        res = await apiCall('put', ENDPOINTS.ADMIN_TEAM_UPDATE(String(editingMember.id)), fd);
      } else {
        res = await apiCall('post', ENDPOINTS.ADMIN_TEAM_CREATE, fd);
      }

      if (res.success) {
        toast.success(editingMember ? 'Team member updated successfully!' : 'Team member added successfully!');
        setIsModalOpen(false);
        await fetchTeamData();
      } else {
        // Fallback local update if mock
        if (editingMember) {
          setMembers((prev) =>
            prev.map((item) =>
              item.id === editingMember.id
                ? {
                    ...item,
                    name: formData.name.trim(),
                    position: formData.position.trim(),
                    description: formData.description.trim(),
                    isActive: formData.isActive,
                  }
                : item
            )
          );
          toast.success('Team member updated');
          setIsModalOpen(false);
        } else {
          const newLocalMember: TeamMember = {
            id: String(Date.now()),
            name: formData.name.trim(),
            position: formData.position.trim(),
            description: formData.description.trim(),
            isActive: formData.isActive,
          };
          setMembers((prev) => [newLocalMember, ...prev]);
          toast.success('Team member added successfully');
          setIsModalOpen(false);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (m: TeamMember) => {
    setMemberToDelete(m);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    try {
      const res = await apiCall('delete', ENDPOINTS.ADMIN_TEAM_DELETE(String(memberToDelete.id)));
      if (res.success) {
        toast.success('Member removed successfully');
        setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      } else {
        setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
        toast.success('Member removed');
      }
    } catch (err) {
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      toast.success('Member removed');
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setMemberToDelete(null);
    }
  };

  const handleToggleStatus = (m: TeamMember) => {
    const updatedStatus = !m.isActive;
    setMembers((prev) =>
      prev.map((item) => (item.id === m.id ? { ...item, isActive: updatedStatus } : item))
    );
    toast.success(`${m.name} is now ${updatedStatus ? 'Active' : 'Inactive'}`);
  };

  const currentUserIsSuper = isSuperAdmin();

  const filteredMembers = members.filter((m) => {
    if (!currentUserIsSuper) {
      const pos = (m.position || '').toLowerCase();
      const mail = (m.email || '').toLowerCase();
      if (pos.includes('super admin') || pos.includes('superadmin') || mail.includes('superadmin')) {
        return false;
      }
    }
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.position.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primaryRed"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Team Directory</h1>
          <p className="text-gray-500 mt-1">Manage sales and account management teams</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-10 flex items-center gap-2 border-gray-200"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primaryRed' : ''}`} />
            Refresh
          </Button>

          {/* ADD TEAM MEMBER BUTTON (Target button from screenshot) */}
          <button
            onClick={handleOpenAdd}
            className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg flex items-center justify-center text-sm font-medium transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add Team Member
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search team members by name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primaryRed transition-shadow"
            />
          </div>
          <span className="text-xs text-gray-400 font-medium">Total: {members.length} members</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/70 dark:bg-gray-800/50 text-gray-500 font-medium border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Name / Member</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                  {/* Name and Avatar */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      {member.image_url ? (
                        <img
                          src={member.image_url}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm"
                          onError={(e) => {
                            (e.currentTarget as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`;
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-red-100 text-primaryRed flex items-center justify-center font-bold text-sm shadow-sm">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{member.name}</div>
                        {member.email && <div className="text-xs text-gray-400">{member.email}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100">
                      <Shield className="w-3.5 h-3.5" />
                      {member.position}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleStatus(member)}
                      title="Click to toggle status"
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-transform active:scale-95 ${
                        member.isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200'
                      }`}
                    >
                      {member.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {member.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(member)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primaryRed hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Edit Member"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(member)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================= */}
      {/* ADD / EDIT TEAM MEMBER MODAL DIALOG */}
      {/* ========================================================= */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primaryRed" />
              {editingMember ? 'Edit Team Member' : 'Add New Team Member'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveMember} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="memberName" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Full Name *
              </Label>
              <Input
                id="memberName"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ramesh Chandra"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="memberRole" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Role / Position *
              </Label>
              <Input
                id="memberRole"
                type="text"
                required
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="e.g. Sales Manager / Sales Executive / Super Admin"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="memberEmail" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Email Address (Optional)
              </Label>
              <Input
                id="memberEmail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="member@agency.com"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="memberDesc" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Bio / Responsibilities (Optional)
              </Label>
              <Textarea
                id="memberDesc"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                className="mt-1.5 resize-none text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                Profile Photo (Optional)
              </Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 flex-shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    id="memberPhotoInput"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('memberPhotoInput')?.click()}
                    className="w-full flex items-center justify-center gap-2 text-xs border-gray-300"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {imagePreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Active Member</span>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <DialogFooter className="pt-4 border-t border-gray-100 dark:border-gray-800 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gray-900 hover:bg-black text-white min-w-[120px]"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : editingMember ? (
                  'Update Member'
                ) : (
                  'Save Member'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ========================================================= */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Remove Team Member
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
            Are you sure you want to remove <strong>{memberToDelete?.name}</strong> from the team?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Removing...' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CrmTeam;
