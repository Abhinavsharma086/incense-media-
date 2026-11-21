import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Package, User, Calendar, CreditCard, MapPin } from 'lucide-react';

interface OrderItem {
  id: number;
  orderId: number;
  magazineId: number;
  magazinePlanId: number;
  quantity: number;
  price: string;
  priceAtPurchase: string;
  createdAt: string;
  updatedAt: string;
  Magazine: {
    id: number;
    title: string;
  };
  MagazinePlan: {
    id: number;
    planName: string | null;
    duration: number;
    price: number;
  };
}

interface User {
  id: number;
  name: string;
}

interface Order {
  id: number;
  userId: number;
  orderId: string;
  totalAmount: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
  OrderItems: OrderItem[];
  User: User;
}

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  if (!order) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Details - {order.orderId}
          </DialogTitle>
          <DialogDescription>
            Complete information about this order and its items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer Information
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Name:</span>
                  <p className="font-medium">{order.User.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">User ID:</span>
                  <p className="font-medium">{order.User.id}</p>
                </div>
              </div>
            </div>

            {/* Order Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Order Information
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Order ID:</span>
                  <p className="font-medium">{order.orderId}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <p className="font-medium text-lg text-green-600">₹{parseFloat(order.totalAmount).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Dates */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Order Timeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Order Created:</span>
                <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Last Updated:</span>
                <p className="font-medium">{new Date(order.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Order Items ({order.OrderItems.length})
            </h3>
            <div className="space-y-4">
              {order.OrderItems.map((item, index) => (
                <div key={item.id} className="bg-white rounded-lg p-4 border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Magazine Information */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Magazine:</span>
                        <p className="font-medium text-lg">{item.Magazine.title}</p>
                        <p className="text-sm text-gray-500">Magazine ID: {item.Magazine.id}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Plan Details:</span>
                        <p className="font-medium">
                          {item.MagazinePlan.planName || `Duration: ${item.MagazinePlan.duration} months`}
                        </p>
                        <p className="text-sm text-gray-500">Plan ID: {item.MagazinePlan.id}</p>
                        <p className="text-sm text-gray-500">Duration: {item.MagazinePlan.duration} months</p>
                      </div>
                    </div>
                    
                    {/* Order Details */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Quantity:</span>
                        <p className="font-medium text-lg">{item.quantity}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Price:</span>
                        <p className="font-medium text-green-600 text-lg">₹{parseFloat(item.price).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">At Purchase: ₹{parseFloat(item.priceAtPurchase).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Plan Price: ₹{item.MagazinePlan.price}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Order Item ID:</span> {item.id}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Updated:</span> {new Date(item.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total Items: {order.OrderItems.length}</p>
                <p className="text-sm text-gray-600">Total Quantity: {order.OrderItems.reduce((sum, item) => sum + item.quantity, 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">₹{parseFloat(order.totalAmount).toFixed(2)}</p>
                <p className="text-sm text-gray-600">Total Amount</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;
