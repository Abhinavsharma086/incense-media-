import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Filter, Eye, Trash2, Package, ChevronUp, ChevronDown } from 'lucide-react';
import { RootState, AppDispatch } from '../../redux/store';
import { fetchOrders, updateOrderStatus, deleteOrder } from '../../redux/slices/orderSlice';
import OrderDetailsModal from '../../components/admin/OrderDetailsModal';

const AdminOrders: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { orders, loading, error } = useSelector((state: RootState) => state.order);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const handleStatusChange = (orderId: number, newStatus: any) => {
    dispatch(updateOrderStatus({ id: orderId.toString(), status: newStatus }));
  };

  const handleDeleteOrder = (id: number) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      dispatch(deleteOrder(id.toString()));
    }
  };

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Ensure orders is always an array to prevent filter errors
  const ordersArray = Array.isArray(orders) ? orders : [];

  const filteredOrders = ordersArray.filter(order => {
    const userName = order.User?.name || 'Unknown User';
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'customer':
        aValue = (a.User?.name || 'Unknown User').toLowerCase();
        bValue = (b.User?.name || 'Unknown User').toLowerCase();
        break;
      case 'magazine':
        aValue = a.OrderItems.length > 0 ? a.OrderItems[0]?.Magazine?.title.toLowerCase() : '';
        bValue = b.OrderItems.length > 0 ? b.OrderItems[0]?.Magazine?.title.toLowerCase() : '';
        break;
      case 'date':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primaryRed"></div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Loading...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">
            <strong>Error:</strong> {error}
          </div>
          <button
            onClick={() => dispatch(fetchOrders())}
            className="mt-2 px-4 py-2 bg-primaryRed text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <div className="text-sm text-gray-500">
          Total: {ordersArray.length} orders
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
              />
            </div>
            {/* <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div> */}
          </div>
        </div>

        {sortedOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {ordersArray.length === 0
                ? "No orders have been placed yet."
                : "No orders match your current search criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('customer')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Customer</span>
                      {sortField === 'customer' ? (
                        sortDirection === 'asc' ? 
                          <ChevronUp className="w-4 h-4 text-primaryRed" /> : 
                          <ChevronDown className="w-4 h-4 text-primaryRed" />
                      ) : (
                        <div className="flex flex-col">
                          <ChevronUp className="w-3 h-3 text-gray-300" />
                          <ChevronDown className="w-3 h-3 text-gray-300 -mt-1" />
                        </div>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('magazine')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Magazine</span>
                      {sortField === 'magazine' ? (
                        sortDirection === 'asc' ? 
                          <ChevronUp className="w-4 h-4 text-primaryRed" /> : 
                          <ChevronDown className="w-4 h-4 text-primaryRed" />
                      ) : (
                        <div className="flex flex-col">
                          <ChevronUp className="w-3 h-3 text-gray-300" />
                          <ChevronDown className="w-3 h-3 text-gray-300 -mt-1" />
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      {sortField === 'date' ? (
                        sortDirection === 'asc' ? 
                          <ChevronUp className="w-4 h-4 text-primaryRed" /> : 
                          <ChevronDown className="w-4 h-4 text-primaryRed" />
                      ) : (
                        <div className="flex flex-col">
                          <ChevronUp className="w-3 h-3 text-gray-300" />
                          <ChevronDown className="w-3 h-3 text-gray-300 -mt-1" />
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.orderId}</div>
                          <div className="text-sm text-gray-500">{order.OrderItems?.length} items</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{order.User?.name || 'Unknown User'}</div>
                        <div className="text-sm text-gray-500">User ID: {order.User?.id || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.OrderItems.length > 0 ? order.OrderItems[0]?.Magazine?.title : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.OrderItems[0]?.MagazinePlan?.duration} YEARS
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{parseFloat(order.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status.toLowerCase() === 'processing' ? 'bg-blue-100 text-blue-800' :
                        order.status.toLowerCase() === 'shipped' ? 'bg-purple-100 text-purple-800' :
                        order.status.toLowerCase() === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                      {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleViewOrder(order)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-primaryRed hover:text-red-900"
                          title="Delete Order"
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
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default AdminOrders;