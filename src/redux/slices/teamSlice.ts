import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';

interface TeamMember {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  image: string;
  bio: string;
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  status: 'active' | 'inactive';
  createdAt: string;
}

interface TeamState {
  team: TeamMember[];
  loading: boolean;
  error: string | null;
}

const initialState: TeamState = {
  team: [],
  loading: false,
  error: null,
};

export const fetchTeam = createAsyncThunk(
  'team/fetchTeam',
  async () => {
    const response = await apiCall('get', ENDPOINTS.TEAM);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to fetch team');
  }
);

export const createTeamMember = createAsyncThunk(
  'team/createTeamMember',
  async (memberData: Omit<TeamMember, 'id' | 'createdAt'>) => {
    const response = await apiCall('post', ENDPOINTS.TEAM_CREATE, memberData);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to create team member');
  }
);

export const updateTeamMember = createAsyncThunk(
  'team/updateTeamMember',
  async ({ id, ...memberData }: Partial<TeamMember> & { id: string }) => {
    const response = await apiCall('put', `${ENDPOINTS.TEAM_UPDATE}/${id}`, memberData);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to update team member');
  }
);

export const deleteTeamMember = createAsyncThunk(
  'team/deleteTeamMember',
  async (id: string) => {
    const response = await apiCall('delete', `${ENDPOINTS.TEAM_DELETE}/${id}`);
    if (response.success) {
      return id;
    }
    throw new Error('Failed to delete team member');
  }
);

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeam.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.team = action.payload;
      })
      .addCase(fetchTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch team';
      })
      .addCase(createTeamMember.fulfilled, (state, action) => {
        state.team.push(action.payload);
      })
      .addCase(updateTeamMember.fulfilled, (state, action) => {
        const index = state.team.findIndex(member => member.id === action.payload.id);
        if (index !== -1) {
          state.team[index] = action.payload;
        }
      })
      .addCase(deleteTeamMember.fulfilled, (state, action) => {
        state.team = state.team.filter(member => member.id !== action.payload);
      });
  },
});

export const { clearError } = teamSlice.actions;
export default teamSlice.reducer;