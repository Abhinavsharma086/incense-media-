import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface ClientState {
  clients: Client[];
  loading: boolean;
  error: string | null;
}

const initialState: ClientState = {
  clients: [],
  loading: false,
  error: null,
};

export const fetchClients = createAsyncThunk(
  'client/fetchClients',
  async () => {
    const response = await apiCall('get', ENDPOINTS.CLIENTS);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to fetch clients');
  }
);

export const createClient = createAsyncThunk(
  'client/createClient',
  async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const response = await apiCall('post', ENDPOINTS.CLIENT_CREATE, clientData);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to create client');
  }
);

export const updateClient = createAsyncThunk(
  'client/updateClient',
  async ({ id, ...clientData }: Partial<Client> & { id: string }) => {
    const response = await apiCall('put', `${ENDPOINTS.CLIENT_UPDATE}/${id}`, clientData);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to update client');
  }
);

export const deleteClient = createAsyncThunk(
  'client/deleteClient',
  async (id: string) => {
    const response = await apiCall('delete', `${ENDPOINTS.CLIENT_DELETE}/${id}`);
    if (response.success) {
      return id;
    }
    throw new Error('Failed to delete client');
  }
);

const clientSlice = createSlice({
  name: 'client',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.clients = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch clients';
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.clients.push(action.payload);
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        const index = state.clients.findIndex(client => client.id === action.payload.id);
        if (index !== -1) {
          state.clients[index] = action.payload;
        }
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.clients = state.clients.filter(client => client.id !== action.payload);
      });
  },
});

export const { clearError } = clientSlice.actions;
export default clientSlice.reducer;