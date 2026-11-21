import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Package, CreditCard, Clock, MapPin } from "lucide-react";

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
  MagazinePlan: {
    id: number;
    magazineId: number;
    planName: string | null;
    duration: number;
    price: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    Magazine: {
      id: number;
      title: string;
      slug: string;
      featured: string;
      coverImage: string;
      coverImageUrl: string;
      pdfFileUrl: string;
      type: string;
      description: string;
      publishDate: string;
      pdfFile: string;
      isActive: boolean;
      metaTitle: string;
      metaDescription: string;
      metaKeywords: string;
      createdAt: string;
      updatedAt: string;
    };
  };
}

interface Order {
  id: number;
  userId: number;
  orderId: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  OrderItems: OrderItem[];
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-600 bg-green-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "cancelled":
        return "text-red-600 bg-red-50";
      default:
        return "text-blue-600 bg-blue-50";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primaryRed">
            Order Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Header */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Order Information</h3>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primaryRed" />
                    <span className="font-medium">Order ID:</span>
                    <span className="text-gray-700">{order.orderId}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primaryRed" />
                    <span className="font-medium">Order Date:</span>
                    <span className="text-gray-700">{formatDate(order.createdAt)}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primaryRed" />
                    <span className="font-medium">Total Amount:</span>
                    <span className="text-gray-700 font-semibold">₹ {order.totalAmount}</span>
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Order Status</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Last updated: {formatDateTime(order.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Order Items</h3>
            {order.OrderItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 mb-4"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Magazine Cover */}
                  <div className="md:w-48">
                    <img
                      src={formatMagazineUrl(item.MagazinePlan.Magazine.coverImageUrl || item.MagazinePlan.Magazine.coverImage)}
                      alt={item.MagazinePlan.Magazine.title}
                      className="w-full h-64 md:h-48 object-cover rounded-lg"
                      crossOrigin="anonymous"
                    />
                  </div>

                  {/* Magazine Details */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-xl mb-2">
                      {item.MagazinePlan.Magazine.title}
                    </h4>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {item.MagazinePlan.Magazine.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-primaryRed mb-2">Subscription Details</h5>
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">Duration:</span>{" "}
                            {item.MagazinePlan.duration} Year{item.MagazinePlan.duration > 1 ? "s" : ""}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Quantity:</span> {item.quantity}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Unit Price:</span> ₹ {item.priceAtPurchase}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Total Price:</span> ₹ {item.price}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-primaryRed mb-2">Magazine Info</h5>
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">Type:</span> {item.MagazinePlan.Magazine.type}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Publish Date:</span>{" "}
                            {formatDate(item.MagazinePlan.Magazine.publishDate)}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Featured:</span> {item.MagazinePlan.Magazine.featured}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* PDF Download Button */}
                    {item.MagazinePlan.Magazine.pdfFileUrl && (
                      <div className="mt-4">
                        <Button
                          onClick={() => window.open(formatMagazineUrl(item.MagazinePlan.Magazine.pdfFileUrl || item.MagazinePlan.Magazine.pdfFile), '_blank')}
                          className="bg-primaryRed hover:bg-primaryRed/90 text-white"
                        >
                          Download PDF
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹ {order.totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>₹ 0</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>₹ {order.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;
