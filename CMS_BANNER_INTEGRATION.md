# CMS Banner Integration Guide

This guide shows how to integrate the new CMS banner system into your web pages.

## Overview

The CMS banner system automatically fetches banner images from the `/web/cms-pages` endpoint and stores them in Redux. You can then display banners on any page using the provided components.

## Components Available

### 1. DynamicBanner
A simple banner component that automatically shows the banner for the current page.

```tsx
import DynamicBanner from '@/components/common/DynamicBanner';

// Basic usage
<DynamicBanner />

// With custom styling
<DynamicBanner 
  height="h-80"
  className="rounded-lg"
  showTitle={true}
  titleClassName="text-white text-4xl font-bold"
/>
```

### 2. EnhancedMainBanner
An enhanced version of the existing MainBanner that integrates with CMS data.

```tsx
import EnhancedMainBanner from '@/components/common/EnhancedMainBanner';

// Replace existing MainBanner
<EnhancedMainBanner 
  title={["About", "INCENSE MEDIA"]} 
  useCMSBanner={true} // This will use CMS banner if available
  fallbackImage={aboutus?.banner_url} // Fallback to existing image
/>
```

### 3. PageBanner
A more basic banner component with loading states.

```tsx
import PageBanner from '@/components/common/PageBanner';

<PageBanner 
  height="h-64"
  fallbackImage="/default-banner.jpg"
/>
```

## Integration Examples

### Example 1: Replace existing MainBanner in AboutUs.tsx

```tsx
// Before
<MainBanner title={["About", "INCENSE MEDIA"]} image={aboutus?.banner_url} />

// After
<EnhancedMainBanner 
  title={["About", "INCENSE MEDIA"]} 
  useCMSBanner={true}
  fallbackImage={aboutus?.banner_url}
/>
```

### Example 2: Add banner to any page

```tsx
import DynamicBanner from '@/components/common/DynamicBanner';

const MyPage = () => {
  return (
    <div>
      <DynamicBanner height="h-96" showTitle={true} />
      {/* Rest of your page content */}
    </div>
  );
};
```

### Example 3: Use the hook for custom logic

```tsx
import { useCMSPages } from '@/hooks/useCMSPages';

const MyPage = () => {
  const { pages, loading } = useCMSPages();
  
  const currentPage = pages.find(page => page.slug === 'about-us');
  
  return (
    <div>
      {currentPage?.banner_url && (
        <img 
          src={currentPage.banner_url} 
          alt="Banner" 
          className="w-full h-64 object-cover"
        />
      )}
    </div>
  );
};
```

## How It Works

1. **Automatic Data Fetching**: The App component automatically fetches CMS pages data when the app loads (for non-admin pages).

2. **Redux Storage**: CMS pages data is stored in Redux with the following structure:
   ```typescript
   interface CMSPage {
     id: number;
     name: string;
     slug: string;
     banner_url: string | null;
   }
   ```

3. **Automatic Page Detection**: Components automatically detect the current page slug from the URL and find the corresponding banner.

4. **Fallback System**: If no CMS banner is found, components fall back to provided images or default placeholders.

## API Endpoints Used

- `GET /web/cms-pages` - Fetches all CMS pages with banner data
- `GET /web/cms-pages/{slug}` - Fetches specific CMS page by slug

## Redux Actions Available

```tsx
import { useDispatch } from 'react-redux';
import { fetchCMSPages, fetchCMSPageBySlug } from '@/redux/slices/cmsSlice';

const dispatch = useDispatch();

// Fetch all CMS pages
dispatch(fetchCMSPages());

// Fetch specific page by slug
dispatch(fetchCMSPageBySlug('about-us'));
```

## Selectors Available

```tsx
import { useSelector } from 'react-redux';
import { 
  selectCMSPages, 
  selectCMSPageBySlug, 
  selectCMSLoading, 
  selectCMSError 
} from '@/redux/slices/cmsSlice';

const pages = useSelector(selectCMSPages);
const aboutPage = useSelector(selectCMSPageBySlug('about-us'));
const loading = useSelector(selectCMSLoading);
const error = useSelector(selectCMSError);
```

## Benefits

1. **Centralized Management**: All banner images are managed through the admin panel
2. **Automatic Updates**: Banners update automatically when changed in admin
3. **Fallback Support**: Graceful fallbacks if CMS data is unavailable
4. **Performance**: Data is cached in Redux and only refetched when needed
5. **Flexibility**: Multiple component options for different use cases
