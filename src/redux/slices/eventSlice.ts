import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  image: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  createdAt: string;
}

interface EventState {
  events: Event[];
  loading: boolean;
  error: string | null;
}

const initialState: EventState = {
  events: [],
  loading: false,
  error: null,
};

export const fetchEvents = createAsyncThunk(
  'event/fetchEvents',
  async () => {
    const response = await apiCall('get', ENDPOINTS.EVENTS);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to fetch events');
  }
);

export const createEvent = createAsyncThunk(
  'event/createEvent',
  async (eventData: Omit<Event, 'id' | 'createdAt'>) => {
    const response = await apiCall('post', ENDPOINTS.EVENT_CREATE, eventData);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to create event');
  }
);

export const updateEvent = createAsyncThunk(
  'event/updateEvent',
  async ({ id, ...eventData }: Partial<Event> & { id: string }) => {
    const response = await apiCall('put', `${ENDPOINTS.EVENT_UPDATE}/${id}`, eventData);
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to update event');
  }
);

export const deleteEvent = createAsyncThunk(
  'event/deleteEvent',
  async (id: string) => {
    const response = await apiCall('delete', `${ENDPOINTS.EVENT_DELETE}/${id}`);
    if (response.success) {
      return id;
    }
    throw new Error('Failed to delete event');
  }
);

const eventSlice = createSlice({
  name: 'event',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch events';
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.events.push(action.payload);
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(event => event.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(event => event.id !== action.payload);
      });
  },
});

export const { clearError } = eventSlice.actions;
export default eventSlice.reducer;