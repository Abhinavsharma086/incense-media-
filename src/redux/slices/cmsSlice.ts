import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';

interface CMSPage {
  id: number;
  name: string;
  slug: string;
  banner_url: string | null;
}

interface CMSState {
  pages: CMSPage[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: CMSState = {
  pages: [],
  loading: false,
  error: null,
  lastFetched: null,
};

// Fetch all CMS pages
export const fetchCMSPages = createAsyncThunk(
  'cms/fetchCMSPages',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiCall('get', ENDPOINTS.CMS_PAGES);
      if (response.success && response.data?.data) {
        return response.data.data;
      }
      return rejectWithValue('Failed to fetch CMS pages');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch CMS pages');
    }
  }
);

// Fetch specific CMS page by slug
export const fetchCMSPageBySlug = createAsyncThunk(
  'cms/fetchCMSPageBySlug',
  async (slug: string, { rejectWithValue }) => {
    try {
      const response = await apiCall('get', ENDPOINTS.CMS_PAGE_DETAIL(slug));
      if (response.success && response.data?.data) {
        return response.data.data;
      }
      return rejectWithValue('Failed to fetch CMS page');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch CMS page');
    }
  }
);

const cmsSlice = createSlice({
  name: 'cms',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCMSPages: (state) => {
      state.pages = [];
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch CMS Pages
      .addCase(fetchCMSPages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCMSPages.fulfilled, (state, action) => {
        state.loading = false;
        state.pages = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchCMSPages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch CMS Page by Slug
      .addCase(fetchCMSPageBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCMSPageBySlug.fulfilled, (state, action) => {
        state.loading = false;
        // Update or add the specific page to the pages array
        const existingIndex = state.pages.findIndex(page => page.id === action.payload.id);
        if (existingIndex !== -1) {
          state.pages[existingIndex] = action.payload;
        } else {
          state.pages.push(action.payload);
        }
        state.error = null;
      })
      .addCase(fetchCMSPageBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCMSPages } = cmsSlice.actions;

// Selectors
export const selectCMSPages = (state: { cms: CMSState }) => state.cms.pages;
export const selectCMSPageBySlug = (slug: string) => (state: { cms: CMSState }) => {
  // Special slug mappings
  const slugMappings: { [key: string]: string } = {
    'contact': 'contacts',
    'stories': 'blogs'
  };
  
  const mappedSlug = slugMappings[slug] || slug;
  return state.cms.pages.find(page => page.slug === mappedSlug);
};
export const selectCMSLoading = (state: { cms: CMSState }) => state.cms.loading;
export const selectCMSError = (state: { cms: CMSState }) => state.cms.error;
export const selectCMSLastFetched = (state: { cms: CMSState }) => state.cms.lastFetched;

export default cmsSlice.reducer;
