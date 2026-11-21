import { configureStore } from '@reduxjs/toolkit';
import userSlice from './slices/userSlice';
import clientSlice from './slices/clientSlice';
import eventSlice from './slices/eventSlice';
import blogSlice from './slices/blogSlice';
import orderSlice from './slices/orderSlice';
import teamSlice from './slices/teamSlice';
import masterSlice from './slices/masterSlice';
import cmsSlice from './slices/cmsSlice';
import crmAuthReducer from './slices/crmAuthSlice';

export const store = configureStore({
  reducer: {
    user: userSlice,
    client: clientSlice,
    event: eventSlice,
    blog: blogSlice,
    order: orderSlice,
    team: teamSlice,
    master: masterSlice,
    cms: cmsSlice,
    crmAuth: crmAuthReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;