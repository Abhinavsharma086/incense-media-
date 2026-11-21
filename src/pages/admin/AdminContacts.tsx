import React, { useState, useEffect } from 'react';
import { Save, Mail, Building2, Image, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall } from '../../api/apiCall';
import { ENDPOINTS } from '../../api/endpoints';
import ClickableImage from '../../components/common/ClickableImage';
import Ckeditor from '../../components/common/Ckeditor';
import ImageDimensionNote from '../../lib/ImageDimensionNote';
import { addAnonymousToImages } from '../../lib/utils';

interface ContactInfo {
  id?: string;
  email: string;
  phone: string;
  address: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  twitter: string;
  youtube: string;
  script: string;
  companyName: string;
  title: string;
  copyright: string;
  faviconIcon?: string | File;
  frontLogo?: string | File;
  adminLogo?: string | File;
}

const AdminContacts: React.FC = () => {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: '',
    phone: '',
    address: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    twitter: '',
    youtube: '',
    script: '',
    companyName: '',
    title: '',
    copyright: '',
  });
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [filePreviews, setFilePreviews] = useState<{
    faviconIcon: string | null;
    frontLogo: string | null;
    adminLogo: string | null;
  }>({
    faviconIcon: null,
    frontLogo: null,
    adminLogo: null,
  });

  const contactTabs = [
    { key: 'basic', label: 'Basic Information', icon: Mail },
    { key: 'company', label: 'Company Details', icon: Building2 },
    { key: 'social', label: 'Social Media', icon: Share2 },
    { key: 'assets', label: 'Logos & Assets', icon: Image },
  ];

  useEffect(() => {
    fetchContactInfo();
  }, []); // Only fetch once on component mount

  const fetchContactInfo = async () => {
    try {
      setLoading(true);
      const response = await apiCall('get', ENDPOINTS.ADMIN_CONTACT_GET);
      if (response.success) {
        const data = response.data?.data || response.data;
        setContactInfo({
          id: data.id,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          instagram: data.instagram || '',
          facebook: data.facebook || '',
          linkedin: data.linkedin || '',
          twitter: data.twitter || '',
          youtube: data.youtube || '',
          script: data.script || '',
          companyName: data.companyName || '',
          title: data.title || '',
          copyright: data.copyright || '',
          faviconIcon: data.faviconIcon,
          frontLogo: data.frontLogo,
          adminLogo: data.adminLogo,
        });
        setFilePreviews({
          faviconIcon: data.faviconIconUrl || null,
          frontLogo: data.frontLogoUrl || null,
          adminLogo: data.adminLogoUrl || null,
        });
      }
    } catch (error) {
      console.error('Error fetching contact info:', error);
      toast.error('Failed to fetch contact information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setContactInfo(prev => ({
        ...prev,
        [field]: file
      }));
      setFilePreviews(prev => ({
        ...prev,
        [field]: URL.createObjectURL(file)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();


    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('email', contactInfo.email);
      submitData.append('phone', contactInfo.phone);
      submitData.append('address', contactInfo.address);
      submitData.append('instagram', contactInfo.instagram);
      submitData.append('facebook', contactInfo.facebook);
      submitData.append('linkedin', contactInfo.linkedin);
      submitData.append('twitter', contactInfo.twitter);
      submitData.append('youtube', contactInfo.youtube);
      submitData.append('script', addAnonymousToImages(contactInfo.script));
      submitData.append('companyName', contactInfo.companyName);
      submitData.append('title', contactInfo.title);
      submitData.append('copyright', contactInfo.copyright);

      // Append files if they exist
      if (contactInfo.faviconIcon instanceof File) {
        submitData.append('fevicon_icon', contactInfo.faviconIcon);
      }
      if (contactInfo.frontLogo instanceof File) {
        submitData.append('front_logo', contactInfo.frontLogo);
      }
      if (contactInfo.adminLogo instanceof File) {
        submitData.append('admin_logo', contactInfo.adminLogo);
      }

      const response = await apiCall('post', ENDPOINTS.ADMIN_CONTACT_UPDATE, submitData);

      if (response.success) {
        toast.success('Contact information updated successfully');
        fetchContactInfo(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating contact info:', error);
      toast.error('Failed to update contact information');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={contactInfo.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter email address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={contactInfo.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter phone number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={contactInfo.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter company address"
                rows={4}
              />
            </div>
          </div>
        );

      case 'company':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={contactInfo.companyName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={contactInfo.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter company title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Copyright
              </label>
              <input
                type="text"
                name="copyright"
                value={contactInfo.copyright}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter copyright text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Script Content
              </label>
              <textarea
                name="script"
                value={contactInfo.script}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                placeholder="Enter script content"
                rows={6}
              />
            </div>
          </div>
        );

      case 'social':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram
                </label>
                <input
                  type="url"
                  name="instagram"
                  value={contactInfo.instagram}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="https://instagram.com/username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook
                </label>
                <input
                  type="url"
                  name="facebook"
                  value={contactInfo.facebook}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="https://facebook.com/username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn
                </label>
                <input
                  type="url"
                  name="linkedin"
                  value={contactInfo.linkedin}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="https://linkedin.com/company/username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  X
                </label>
                <input
                  type="url"
                  name="twitter"
                  value={contactInfo.twitter}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="https://twitter.com/username"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube
                </label>
                <input
                  type="url"
                  name="youtube"
                  value={contactInfo.youtube}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder="https://youtube.com/channel/username"
                />
              </div>
            </div>
          </div>
        );

      case 'assets':
        return (
          <div className="space-y-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Favicon Icon
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'faviconIcon')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {filePreviews.faviconIcon && (
                    <div className="flex-shrink-0">
                      <ClickableImage
                        src={filePreviews.faviconIcon}
                        alt="Favicon Preview"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                      />
                    </div>
                  )}
                </div>
                <ImageDimensionNote type="favicon" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Front Logo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'frontLogo')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {filePreviews.frontLogo && (
                    <div className="flex-shrink-0">
                      <ClickableImage
                        src={filePreviews.frontLogo}
                        alt="Front Logo Preview"
                        className="w-20 h-12 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                      />
                    </div>
                  )}
                </div>
                <ImageDimensionNote type="frontLogo" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Logo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'adminLogo')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {filePreviews.adminLogo && (
                    <div className="flex-shrink-0">
                      <ClickableImage
                        src={filePreviews.adminLogo}
                        alt="Admin Logo Preview"
                        className="w-20 h-12 object-cover rounded-lg border border-gray-300 hover:shadow-md transition-shadow"
                      />
                    </div>
                  )}
                </div>
                <ImageDimensionNote type="adminLogo" />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contact Information</h1>
        <div className="text-sm text-gray-500">
          Manage company contact details and social media links
        </div>
      </div>
      {/* Contact Type Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {contactTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tab.key
                  ? 'border-primaryRed text-primaryRed'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">


        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>

        {/* Submit Button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primaryRed text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Contact Information'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminContacts;