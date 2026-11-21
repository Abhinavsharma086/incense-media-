import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { ENDPOINTS } from '@/api/endpoints';
import { apiCall } from '@/api/apiCall';
import ClickableImage from '@/components/common/ClickableImage';

interface AdditionalContentItem {
  id: string;
  content: string;
}

interface CMSData {
  id?: number;
  title: string;
  page: string;
  description: string;
  content: string;
  banner: File | string | null;
  optional_images: (File | string)[];
  optional_data: AdditionalContentItem[];
  createdAt?: string;
  updatedAt?: string;
}

interface OptionalImage {
  id: number;
  image_url: string;
}

const AdminHomeContent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [cmsData, setCmsData] = useState<CMSData>({
    title: '',
    page: 'home-content',
    description: '',
    content: '',
    banner: null,
    optional_images: [],
    optional_data: []
  });

  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [imagesPreviews, setImagesPreviews] = useState<Array<{ id: string | number, image_url: string }>>([]);

  useEffect(() => {
    fetchCMSData();
  }, []);

  const fetchCMSData = async () => {
    try {
      setLoading(true);
      const response = await apiCall('get', ENDPOINTS.ADMIN_CMS_DETAIL('home'));
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setCmsData({
          id: data.id,
          title: data.title || '',
          page: data.page || 'home',
          description: data.description || '',
          content: data.content || '',
          banner: data.banner || null,
          optional_images: [],
        });

        // Set banner preview
        if (data.banner_url) {
          setBannerPreview(data.banner_url);
        }

        // Set optional images previews
        if (data.OptionalImages && Array.isArray(data.OptionalImages)) {
          setImagesPreviews(data.OptionalImages.map((img: OptionalImage) => ({ id: img.id, image_url: img.image_url })));
        }
      }
    } catch (error) {
      console.error('Error fetching CMS data:', error);
      toast.error('Failed to fetch CMS data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CMSData, value: any) => {
    setCmsData(prev => ({
      ...prev,
      [field]: value
    }));
  };


const handleOptionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files ?? []);
  if (!files.length) return;


    setCmsData(prev => ({
      ...prev,
      optional_images: [
        ...(Array.isArray(prev.optional_images) ? prev.optional_images : []),
        ...files, // store Files only
      ],
    }));

    // Create preview objects with temporary IDs for new uploads
    const newPreviews = files.map((f, index) => ({
      id: `temp_${Date.now()}_${index}`,
      image_url: URL.createObjectURL(f)
    }));

    setImagesPreviews(prev => [...prev, ...newPreviews]);
  };


  const removeOptionalImage = async (id: string | number) => {
    if (typeof id === 'string' && id.startsWith('temp_')) {
      setCmsData(prev => ({
        ...prev,
        optional_images: prev.optional_images.filter((_, index) => {
          const tempIndex = imagesPreviews.findIndex(img => img.id === id);
          return index !== tempIndex;
        })
      }));
      setImagesPreviews(prev => prev.filter(img => img.id !== id));
      return;
    }

    // If it's an existing image, delete from server
    if (typeof id === 'number') {
      await apiCall('delete', ENDPOINTS.ADMIN_CMS_OPTIONAL_IMAGE_DELETE(id.toString()));
      setCmsData(prev => ({
        ...prev,
        optional_images: prev.optional_images.filter((img) => (img as any).id !== id)
      }));
      setImagesPreviews(prev => prev.filter((img) => img.id !== id));
      toast.success('Optional image removed successfully');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cmsData.title.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('title', cmsData.title);
      formData.append('page', cmsData.page);
      formData.append('description', cmsData.description);
      formData.append('content', cmsData.content);
      formData.append('optional_data', JSON.stringify(cmsData.optional_data));

      // banner (single)
      if (cmsData.banner instanceof File) {
        formData.append('banner', cmsData.banner);
      }

      // optional_image (repeat key for each file)
      const images = Array.isArray(cmsData.optional_images) ? cmsData.optional_images : [];
      images.forEach((img) => {
        if (img instanceof File) {
          formData.append('optional_image', img);
        }
      });

      const res = await apiCall('put', ENDPOINTS.ADMIN_CMS_UPDATE(cmsData?.id), formData);
      if (res.data?.success) {
        toast.success('Home content updated successfully');
        await fetchCMSData();
      } else {
        toast.error('Failed to update home content');
      }
    } catch (error) {
      console.error('Error updating home content:', error);
      toast.error('Failed to update home content');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-foreground">Home Content Management</h1>
        <Badge variant="outline">Page: {cmsData.page}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-xs font-medium">Title *</Label>
              <Input
                id="title"
                value={cmsData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter title"
                className="text-xs"
              />
            </div>

            {/* Optional Images */}
            <div>
              <Label className="text-xs font-medium">Additional Images</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleOptionalImagesChange}
                  className="text-xs"
                />
                {imagesPreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {imagesPreviews.map((preview, index) => (
                      <div key={preview.id} className="relative">
                        <ClickableImage
                          src={preview.image_url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-16 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeOptionalImage(preview.id)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs z-10"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="text-xs"
              >
                {loading ? 'Updating...' : 'Update Content'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminHomeContent;
