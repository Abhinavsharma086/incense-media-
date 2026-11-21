import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import ConfirmationModal from '../../components/common/ConfirmationModal';

interface Coupon {
  id: string;
  name: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  packageId: number[];
  partnerId: number;
  partnerCommission: number;
  numberOfUsage: boolean;
  maxUsage: number;
  minAmount: number;
  isActiveDates: boolean;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'percent' as 'percent' | 'flat',
    value: 0,
    packageId: [] as number[],
    partnerId: 0,
    partnerCommission: 0,
    numberOfUsage: false,
    maxUsage: 0,
    minAmount: 0,
    isActiveDates: false,
    startDate: '',
    endDate: '',
    isActive: true
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await apiCall('get', ENDPOINTS.ADMIN_COUPONS);
      if (response.success) {
        setCoupons(response.data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
        type === 'number' ? Number(value) : value
    }));
  };

  const handlePackageIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const packageIds = value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    setFormData(prev => ({
      ...prev,
      packageId: packageIds
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter coupon name');
      return;
    }

    if (!formData.code.trim()) {
      toast.error('Please enter coupon code');
      return;
    }

    if (formData.value <= 0) {
      toast.error('Please enter a valid value');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        name: formData.name,
        code: formData.code,
        type: formData.type,
        value: formData.value,
        packageId: formData.packageId,
        partnerId: formData.partnerId,
        partnerCommission: formData.partnerCommission,
        numberOfUsage: formData.numberOfUsage,
        maxUsage: formData.maxUsage,
        minAmount: formData.minAmount,
        isActiveDates: formData.isActiveDates,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive
      };

      const endpoint = isEditMode && editingCoupon
        ? ENDPOINTS.ADMIN_COUPON_UPDATE(editingCoupon.id)
        : ENDPOINTS.ADMIN_COUPON_CREATE;

      const method = isEditMode ? 'put' : 'post';
      const response = await apiCall(method, endpoint, submitData);

      if (response.success) {
        toast.success(isEditMode ? 'Coupon updated successfully' : 'Coupon created successfully');
        setShowAddForm(false);
        resetForm();
        fetchCoupons();
      }
    } catch (error) {
      console.error('Error saving coupon:', error);
      toast.error('Failed to save coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsEditMode(true);
    setFormData({
      name: coupon.name,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      packageId: coupon.packageId,
      partnerId: coupon.partnerId,
      partnerCommission: coupon.partnerCommission,
      numberOfUsage: coupon.numberOfUsage,
      maxUsage: coupon.maxUsage,
      minAmount: coupon.minAmount,
      isActiveDates: coupon.isActiveDates,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      isActive: coupon.isActive
    });
    setShowAddForm(true);
  };

  const handleDeleteClick = (couponId: string) => {
    setCouponToDelete(couponId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!couponToDelete) return;

    try {
      setLoading(true);
      const response = await apiCall('delete', ENDPOINTS.ADMIN_COUPON_DELETE(couponToDelete));
      if (response.success) {
        toast.success('Coupon deleted successfully');
        fetchCoupons();
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setCouponToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setCouponToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'percent',
      value: 0,
      packageId: [],
      partnerId: 0,
      partnerCommission: 0,
      numberOfUsage: false,
      maxUsage: 0,
      minAmount: 0,
      isActiveDates: false,
      startDate: '',
      endDate: '',
      isActive: true
    });
    setEditingCoupon(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Coupons Management</h1>
        <button
          onClick={handleAddClick}
          className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Coupon
        </button>
      </div>

      {/* Add/Edit Coupon Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Coupon' : 'Add New Coupon'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter coupon name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter coupon code"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  required
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Value *
                </label>
                <input
                  type="number"
                  name="value"
                  value={formData.value}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter value"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Amount
                </label>
                <input
                  type="number"
                  name="minAmount"
                  value={formData.minAmount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Minimum amount"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package IDs
                </label>
                <input
                  type="text"
                  value={formData.packageId.join(', ')}
                  onChange={handlePackageIdChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter package IDs (comma separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partner ID
                </label>
                <input
                  type="number"
                  name="partnerId"
                  value={formData.partnerId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Enter partner ID"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partner Commission (%)
                </label>
                <input
                  type="number"
                  name="partnerCommission"
                  value={formData.partnerCommission}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Commission percentage"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Usage
                </label>
                <input
                  type="number"
                  name="maxUsage"
                  value={formData.maxUsage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="Maximum usage count"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primaryRed focus:ring-primaryRed border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Active Coupon
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActiveDates"
                  checked={formData.isActiveDates}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primaryRed focus:ring-primaryRed border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Use Date Range
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="numberOfUsage"
                  checked={formData.numberOfUsage}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primaryRed focus:ring-primaryRed border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Track Usage Count
                </label>
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
                {loading ? 'Saving...' : (isEditMode ? 'Update Coupon' : 'Create Coupon')}
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
              placeholder="Search coupons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full max-w-md focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredCoupons.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coupon Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage Limits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Validity
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
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">{coupon.name}</div>
                        <div className="text-sm text-gray-500">Code: {coupon.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {coupon.type === 'percent' ? `${coupon.value}%` : `₹${coupon.value}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        Min: ₹{coupon.minAmount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Max: {coupon.maxUsage || 'Unlimited'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coupon.isActiveDates ? (
                        <div>
                          <div>{coupon.startDate ? new Date(coupon.startDate).toLocaleDateString() : 'N/A'}</div>
                          <div>{coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : 'N/A'}</div>
                        </div>
                      ) : (
                        'Always Valid'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClick(coupon)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Coupon"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(coupon.id)}
                          className="text-primaryRed hover:text-red-900"
                          title="Delete Coupon"
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
                <Tag className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Coupons Found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'No coupons match your search criteria.' : 'Get started by creating your first coupon.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleAddClick}
                  className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Coupon
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
        title="Delete Coupon"
        message="Are you sure you want to delete this coupon? This action will permanently remove the coupon from your system."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
      />
    </div>
  );
};

export default AdminCoupons;
