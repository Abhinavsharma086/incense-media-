import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { fetchCMSPages } from '@/redux/slices/cmsSlice';

export const useCMSPages = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { pages, loading, error, lastFetched } = useSelector((state: RootState) => state.cms);

  useEffect(() => {
    // Fetch CMS pages if not already loaded or if data is older than 5 minutes
    const shouldFetch = pages.length === 0 || 
      (lastFetched && Date.now() - lastFetched > 5 * 60 * 1000); // 5 minutes

    if (shouldFetch && !loading) {
      dispatch(fetchCMSPages());
    }
  }, [dispatch, pages.length, loading, lastFetched]);

  return {
    pages,
    loading,
    error,
    lastFetched,
  };
};

export default useCMSPages;
