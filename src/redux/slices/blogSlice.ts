import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';

interface Blog {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  image: string;
  author: string;
  status: 'draft' | 'published';
  publishedAt: string;
  createdAt: string;
}

interface BlogState {
  blogs: Blog[];
  loading: boolean;
  error: string | null;
}

const initialState: BlogState = {
  blogs: [],
  loading: false,
  error: null,
};

export const fetchBlogs = createAsyncThunk(
  'blog/fetchBlogs',
  async () => {
    const response = await apiCall('get', ENDPOINTS.ADMIN_BLOGS);
    if (response.success) {
      // Handle the API response structure: { success: true, data: [...], page: 1, limit: 10, total: 1 }
      return response.data?.data || response.data || [];
    }
    throw new Error('Failed to fetch blogs');
  }
);

export const createBlog = createAsyncThunk(
  'blog/createBlog',
  async (blogData: Omit<Blog, 'id' | 'createdAt'>) => {
    const response = await apiCall('post', ENDPOINTS.BLOG_CREATE, blogData);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to create blog');
  }
);

export const updateBlog = createAsyncThunk(
  'blog/updateBlog',
  async ({ id, ...blogData }: Partial<Blog> & { id: string }) => {
    const response = await apiCall('put', `${ENDPOINTS.BLOG_UPDATE}/${id}`, blogData);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to update blog');
  }
);

export const deleteBlog = createAsyncThunk(
  'blog/deleteBlog',
  async (id: string) => {
    const response = await apiCall('delete', `${ENDPOINTS.BLOG_DELETE}/${id}`);
    if (response.success) {
      return id;
    }
    throw new Error('Failed to delete blog');
  }
);

const blogSlice = createSlice({
  name: 'blog',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlogs.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBlogs.fulfilled, (state, action) => {
        state.loading = false;
        state.blogs = action.payload;
      })
      .addCase(fetchBlogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch blogs';
      })
      .addCase(createBlog.fulfilled, (state, action) => {
        state.blogs.push(action.payload);
      })
      .addCase(updateBlog.fulfilled, (state, action) => {
        const index = state.blogs.findIndex(blog => blog.id === action.payload.id);
        if (index !== -1) {
          state.blogs[index] = action.payload;
        }
      })
      .addCase(deleteBlog.fulfilled, (state, action) => {
        state.blogs = state.blogs.filter(blog => blog.id !== action.payload);
      });
  },
});

export const { clearError } = blogSlice.actions;
export default blogSlice.reducer;