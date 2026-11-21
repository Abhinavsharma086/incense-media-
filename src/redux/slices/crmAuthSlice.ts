import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import crmApi from '../../api/crmApi';

interface CrmAuthState {
  user: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: CrmAuthState = {
  user: null,
  loading: false,
  error: null,
};

export const crmLoginUser = createAsyncThunk(
  'crmAuth/login',
  async (credentials: { email: string; password: string }) => {
    const response = await crmApi.post('/auth/login', credentials);
    if (response.data && response.data.token) {
      const u = response.data.user || {};
      const token = response.data.token;
      localStorage.setItem('token', token);
      localStorage.setItem('crm_token', token);
      localStorage.setItem('role', u.role || 'Employee');
      if (u.id) localStorage.setItem('current_admin_id', u.id);
      localStorage.setItem('user', JSON.stringify({
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email || 'User',
        email: u.email,
        phone: u.phone || '',
        role: u.role || 'Employee',
        designation: u.role || 'Employee',
        adminId: u.adminId || u.id,
        companyName: u.companyName || 'Incense Media',
      }));
      return response.data;
    }
    throw new Error('Login failed');
  }
);

const crmAuthSlice = createSlice({
  name: 'crmAuth',
  initialState,
  reducers: {
    crmLogout: (state) => {
      state.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('crm_token');
      localStorage.removeItem('role');
    },
    clearCrmError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(crmLoginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(crmLoginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(crmLoginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      });
  },
});

export const { crmLogout, clearCrmError } = crmAuthSlice.actions;
export default crmAuthSlice.reducer;
