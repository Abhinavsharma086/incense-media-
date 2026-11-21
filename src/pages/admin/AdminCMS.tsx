import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash2 } from 'lucide-react';
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
  optionalData: AdditionalContentItem[];
  createdAt?: string;
  updatedAt?: string;
}

interface OptionalImage {
  id: number;
  image_url: string;
}

const AdminCMS: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [cmsData, setCmsData] = useState<CMSData>({
    title: '',
    page: 'about-us',
    description: '',
    content: '',
    banner: null,
    optional_images: [],
    optionalData: []
  });

  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [imagesPreviews, setImagesPreviews] = useState<Array<{ id: string | number, image_url: string }>>([]);

  useEffect(() => {
    fetchCMSData();
  }, []);

  const fetchCMSData = async () => {
    const response = await apiCall('get', ENDPOINTS.ADMIN_CMS_DETAIL(cmsData.page));

    if (response.data?.success && response.data?.data) {

      const data = response.data.data;
      setCmsData({
        id: data.id,
        title: data.title || '',
        page: data.page || 'about-us',
        description: data.description || '',
        content: data.content || '',
        banner: data.banner || null,
        optional_images: [],
        optionalData: (data.optionalData != "undefined" && data.optionalData != "null" && data.optionalData.length > 0) ? JSON.parse(data.optionalData) : []
      });

      if (data.banner_url) {
        setBannerPreview(data.banner_url);
      }

      if (data.OptionalImages && Array.isArray(data.OptionalImages)) {
        setImagesPreviews(data.OptionalImages.map((img: OptionalImage) => ({ id: img.id, image_url: img.image_url })));
      }
      setLoading(false);
    }
    else {
      setLoading(false);
    }
  };


  const handleInputChange = (field: keyof CMSData, value: any) => {
    setCmsData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCmsData(prev => ({ ...prev, banner: file }));
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleOptionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (imagesPreviews.length + files.length > 3) {
      toast.error('Maximum 3 images allowed');
      return;
    }

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

  const addAdditionalContent = () => {
    const newItem: AdditionalContentItem = {
      id: Date.now().toString(),
      content: ''
    };
    setCmsData(prev => ({
      ...prev,
      optionalData: [...prev.optionalData, newItem] // ✅ use optionalData
    }));
  };
  const removeAdditionalContent = (id: string) => {
    setCmsData(prev => ({
      ...prev,
      optionalData: prev.optionalData.filter(item => item.id !== id) // ✅ use optionalData
    }));
  };

  const updateAdditionalContent = (id: string, content: string) => {
    setCmsData(prev => ({
      ...prev,
      optionalData: prev.optionalData.map(item =>
        item.id === id ? { ...item, content } : item
      ) // ✅ use optionalData
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cmsData.title.trim() || !cmsData.description.trim() || !cmsData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // setLoading(true);

    const formData = new FormData();
    formData.append('title', cmsData.title);
    formData.append('page', cmsData.page);
    formData.append('description', cmsData.description);
    formData.append('content', cmsData.content);
    formData.append('optional_data', JSON.stringify(cmsData.optionalData));


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

    const res = await apiCall('put', ENDPOINTS.ADMIN_CMS_UPDATE(cmsData.id), formData);

    if (res.data?.success) {
      toast.success('CMS content updated successfully');
      await fetchCMSData();
    } else {
      toast.error('Failed to update CMS content');
    }

  };


  return (

    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-foreground">About Us Content Management</h1>
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

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-xs font-medium">Description *</Label>
              <Textarea
                id="description"
                value={cmsData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter description"
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Content */}
            <div>
              <Label htmlFor="content" className="text-xs font-medium">Main Content *</Label>
              <Textarea
                id="content"
                value={cmsData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Enter main content"
                rows={4}
                className="text-xs"
              />
            </div>

            {/* Banner Image */}
            <div>
              <Label className="text-xs font-medium">Banner Image</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="text-xs"
                />
                {bannerPreview && (
                  <div className="relative w-32 h-20">
                    <ClickableImage
                      src={bannerPreview}
                      alt="Banner preview"
                      className="w-full h-full object-cover rounded border"
                    />
                  </div>
                )}
              </div>
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

            {/* Additional Content Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">Additional Content</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAdditionalContent}
                  className="text-xs h-6 px-2"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {cmsData.optionalData.map((item, index) => (
                  <div key={item.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        value={item.content}
                        onChange={(e) => updateAdditionalContent(item.id, e.target.value)}
                        placeholder={`Additional content ${index + 1}`}
                        className="text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeAdditionalContent(item.id)}
                      className="text-xs h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                {cmsData.optionalData.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-xs">
                    No additional content items. Click "Add Item" to create one.
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

export default AdminCMS;