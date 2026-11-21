import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';

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
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed' | 'Delivered' | 'Completed';
  createdAt: string;
  updatedAt: string;
  OrderItems: OrderItem[];
  User: User | null;
}

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  orders: [],
  loading: false,
  error: null,
};

export const fetchOrders = createAsyncThunk(
  'order/fetchOrders',
  async () => {
    const response = await apiCall('get', ENDPOINTS.ORDERS);
    if (response.success) {
      // Handle paginated response structure - data is nested under response.data.data
      return response.data.data || [];
    }
    throw new Error('Failed to fetch orders');
  }
);

export const updateOrderStatus = createAsyncThunk(
  'order/updateOrderStatus',
  async ({ id, status }: { id: string; status: Order['status'] }) => {
    const response = await apiCall('put', `${ENDPOINTS.ORDER_UPDATE_STATUS}/${id}`, { status });
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to update order status');
  }
);

export const deleteOrder = createAsyncThunk(
  'order/deleteOrder',
  async (id: string) => {
    const response = await apiCall('delete', `${ENDPOINTS.ORDER_DELETE}/${id}`);
    if (response.success) {
      return id;
    }
    throw new Error('Failed to delete order');
  }
);

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch orders';
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
      })
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.orders = state.orders.filter(order => order.id.toString() !== action.payload);
      });
  },
});

export const { clearError } = orderSlice.actions;
export default orderSlice.reducer;