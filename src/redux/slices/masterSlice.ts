import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';

interface Master {
  id: string;
  name: string;
  description?: string;
  image?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface MasterState {
  masters: Master[];
  loading: boolean;
  error: string | null;
  currentMaster: Master | null;
}

const initialState: MasterState = {
  masters: [],
  loading: false,
  error: null,
  currentMaster: null,
};

export const fetchMasters = createAsyncThunk(
  'master/fetchMasters',
  async () => {
    const response = await apiCall('get', ENDPOINTS.ADMIN_MASTERS);
    if (response.success) {
      // Handle paginated response structure
      return response.data || [];
    }
    throw new Error('Failed to fetch masters');
  }
);

export const createMaster = createAsyncThunk(
  'master/createMaster',
  async (masterData: Partial<Master>) => {
    const response = await apiCall('post', ENDPOINTS.ADMIN_MASTER_CREATE, masterData);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to create master');
  }
);

export const updateMaster = createAsyncThunk(
  'master/updateMaster',
  async ({ id, ...masterData }: { id: string } & Partial<Master>) => {
    const response = await apiCall('put', ENDPOINTS.ADMIN_MASTER_UPDATE(id), masterData);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to update master');
  }
);

export const deleteMaster = createAsyncThunk(
  'master/deleteMaster',
  async (id: string) => {
    const response = await apiCall('delete', ENDPOINTS.ADMIN_MASTER_DELETE(id));
    if (response.success) {
      return id;
    }
    throw new Error('Failed to delete master');
  }
);

export const fetchMasterById = createAsyncThunk(
  'master/fetchMasterById',
  async (id: string) => {
    const response = await apiCall('get', ENDPOINTS.ADMIN_MASTER_UPDATE(id));
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to fetch master');
  }
);

const masterSlice = createSlice({
  name: 'master',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentMaster: (state) => {
      state.currentMaster = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Masters
      .addCase(fetchMasters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMasters.fulfilled, (state, action) => {
        state.loading = false;
        state.masters = action.payload;
      })
      .addCase(fetchMasters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch masters';
      })
      
      // Create Master
      .addCase(createMaster.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMaster.fulfilled, (state, action) => {
        state.loading = false;
        state.masters.push(action.payload);
      })
      .addCase(createMaster.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create master';
      })
      
      // Update Master
      .addCase(updateMaster.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMaster.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.masters.findIndex(master => master.id === action.payload.id);
        if (index !== -1) {
          state.masters[index] = action.payload;
        }
        if (state.currentMaster?.id === action.payload.id) {
          state.currentMaster = action.payload;
        }
      })
      .addCase(updateMaster.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update master';
      })
      
      // Delete Master
      .addCase(deleteMaster.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMaster.fulfilled, (state, action) => {
        state.loading = false;
        state.masters = state.masters.filter(master => master.id !== action.payload);
        if (state.currentMaster?.id === action.payload) {
          state.currentMaster = null;
        }
      })
      .addCase(deleteMaster.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete master';
      })
      
      // Fetch Master by ID
      .addCase(fetchMasterById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMasterById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMaster = action.payload;
      })
      .addCase(fetchMasterById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch master';
      });
  },
});

export const { clearError, clearCurrentMaster } = masterSlice.actions;
export default masterSlice.reducer;
