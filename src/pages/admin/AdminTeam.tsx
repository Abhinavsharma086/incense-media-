import { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import { toast } from 'sonner';
import Loader from '../../components/common/Loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type TeamMember = {
  id: number;
  name: string;
  position: string;
  description?: string;
  image_url?: string;
  isActive?: boolean | number | string;
};

const toBoolean = (v: unknown) => v === true || v === 1 || v === '1';

const AdminTeam: React.FC = () => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<{ name: string; position: string; description: string; isActive: boolean; file: File | null }>({
    name: '',
    position: '',
    description: '',
    isActive: true,
    file: null,
  });

  const fetchTeam = async () => {
    setLoading(true);
    const response = await apiCall('get', ENDPOINTS.TEAM);
    if (response.success) {
      setTeam(response.data?.data || []);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', position: '', description: '', isActive: true, file: null });
    setIsOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditingId(m.id);
    setForm({
      name: m.name || '',
      position: m.position || '',
      description: m.description || '',
      isActive: toBoolean(m.isActive),
      file: null,
    });
    setIsOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((f) => ({ ...f, file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('position', form.position);
      fd.append('description', form.description);
      fd.append('isActive', String(form.isActive));
      if (form.file) fd.append('team_image', form.file);

      const url = editingId ? `${ENDPOINTS.TEAM}/${editingId}` : ENDPOINTS.TEAM;
      const method = editingId ? 'put' : 'post';
      const res = await apiCall(method, url, fd);

      if (res.success) {
        toast.success(`Team member ${editingId ? 'updated' : 'created'} successfully`);
        setIsOpen(false);
        await fetchTeam();
      }
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteTeamMember = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this team member?')) {
      setLoading(true);
      const response = await apiCall('delete', `${ENDPOINTS.TEAM}/${id}`);
      if (response.success) {
        toast.success('Team member deleted successfully');
        fetchTeam();
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const filteredTeam = team.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <Button onClick={openCreate} className="flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Team Member
          </Button>
        </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredTeam.map((member) => (
              <div key={member.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    crossOrigin="anonymous"
                    src={member.image_url}
                    alt={member.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${toBoolean(member.isActive)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {toBoolean(member.isActive) ? 'active' : 'inactive'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{member.name}</h3>
                  <p className="text-primaryRed text-sm font-medium mb-2">{member.position}</p>
                  <div className="flex items-center justify-between">
                    <div />
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="icon" onClick={() => openEdit(member)} className="h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteTeamMember(String(member.id))}
                        className="h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Image</Label>
              <Input id="image" type="file" accept="image/*" onChange={handleFileChange} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch id="active" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{editingId ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminTeam;