import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
  contactUs: any | null;
}

const initialState: UserState = {
  user: null,
  loading: false,
  error: null,
  contactUs: null,
};

export const fetchProfile = createAsyncThunk(
  'user/fetchProfile',
  async () => {
    const response = await apiCall('get', ENDPOINTS.PROFILE);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to fetch profile');
  }
);

export const fetchContactUs = createAsyncThunk(
  'user/fetchContactUs',
  async () => {
    const response = await apiCall('get', ENDPOINTS.CONTACT_US);
    if (response.success) {
      return response.data.data;
    }
    throw new Error('Failed to fetch contact us');
  }
);

export const loginUser = createAsyncThunk(
  'user/login',
  async (credentials: { email: string; password: string; type?: string; userType?: string }) => {
    const payload = { ...credentials, type: credentials.type ?? 'adminRefreshToken', userType: credentials.userType ?? 'admin' };
    const response = await apiCall('post', ENDPOINTS.LOGIN, payload);
    if (response.success) {
      const accessToken = response.data.accessToken || response.data.token;
      if (!accessToken) throw new Error('Login failed: token missing');
      localStorage.setItem('token', accessToken);
      const userRole = response.data.user?.role || response.data.role || credentials.userType || 'Admin';
      localStorage.setItem('role', userRole);
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    }
    throw new Error('Login failed');
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('role');
    },
    clearError: (state) => {
      state.error = null;
    },
    setContactUs: (state, action) => {
      state.contactUs = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch profile';
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      .addCase(fetchContactUs.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchContactUs.fulfilled, (state, action) => {
        state.loading = false;
        state.contactUs = action.payload;
      })
      .addCase(fetchContactUs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contact us';
      });
  },
});

export const { logout, clearError, setContactUs } = userSlice.actions;
export default userSlice.reducer;