import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ENDPOINTS } from '@/api/endpoints';
import { apiCall } from '@/api/apiCall';
import ClickableImage from '@/components/common/ClickableImage';
import { formatMediaUrl } from '@/lib/utils';

interface CMSPage {
  id: number;
  name: string;
  banner_url: string | null;
  slug: string;
}

const AdminBannerImages: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [cmsPages, setCmsPages] = useState<CMSPage[]>([]);
  const [uploadingImages, setUploadingImages] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchCMSPages();
  }, []);

  const fetchCMSPages = async () => {
    setLoading(true);
    try {
      const response = await apiCall('get', ENDPOINTS.ADMIN_CMS);
      
      if (response.success && response.data?.data) {
        setCmsPages(response.data.data);
      } else {
        toast.error('Failed to fetch CMS pages');
      }
    } catch (error) {
      console.error('Error fetching CMS pages:', error);
      toast.error('Failed to fetch CMS pages');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (pageId: number, file: File, pageName: string) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }


    setUploadingImages(prev => new Set(prev).add(pageId));

    try {
      const formData = new FormData();
      formData.append('banner', file);
      formData.append('title', pageName);

      const response = await apiCall('put', ENDPOINTS.ADMIN_CMS_UPDATE(pageId.toString()), formData);

      if (response.success) {
        toast.success('Banner image updated successfully');
        // Refresh the data to get updated banner URLs
        await fetchCMSPages();
      } 
    } catch (error) {
      console.error('Error updating banner image:', error);
    } finally {
      setUploadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(pageId);
        return newSet;
      });
    }
  };

  const handleFileChange = (pageId: number, pageName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(pageId, file, pageName);
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  const formatSlug = (slug: string) => {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading CMS pages...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Banner Images Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage banner images for all CMS pages dynamically
          </p>
        </div>
        <Button
          onClick={fetchCMSPages}
          variant="outline"
          size="sm"
          disabled={loading}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {cmsPages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No CMS Pages Found</h3>
            <p className="text-sm text-muted-foreground text-center">
              There are no CMS pages available to manage banner images.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cmsPages.filter(page => page.slug !== "home").map((page) => (
            <Card key={page.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">
                    {formatSlug(page.slug)}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    ID: {page.id}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Slug: {page.slug}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Current Banner Image */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    Current Banner
                  </Label>
                  <div className="mt-2">
                    {page.banner_url ? (
                      <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                        <ClickableImage
                          src={page.banner_url || (page.banner ? formatMediaUrl(page.banner, 'page-banner') : null)}
                          alt={`${page.name} banner`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
                        <div className="text-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">No banner image</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload New Banner */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    Update Banner Image
                  </Label>
                  <div className="mt-2">
                     <Input
                       type="file"
                       accept="image/*"
                       onChange={(e) => handleFileChange(page.id, formatSlug(page.slug), e)}
                       disabled={uploadingImages.has(page.id)}
                       className="text-xs"
                     />
                    <p className="text-xs text-muted-foreground mt-1">
                      Supported formats: JPG, PNG, GIF (Max 5MB)
                    </p>
                  </div>
                </div>

                {/* Upload Status */}
                {uploadingImages.has(page.id) && (
                  <div className="flex items-center space-x-2 text-xs text-blue-600">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBannerImages;
