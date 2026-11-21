import { useState } from 'react';
import { Search, Plus, Edit, Trash2, Building } from 'lucide-react';
import ClickableImage from '../../components/common/ClickableImage';

interface Partner {
  id: string;
  name: string;
  logo: string;
  website: string;
  category: 'titanium' | 'principal' | 'associate' | 'community' | 'brand_design' | 'association' | 'media';
  description: string;
  status: 'active' | 'inactive';
  order: number;
}

const AdminPartners: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterCategory === 'all' || partner.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const categoryColors = {
    titanium: 'bg-gray-100 text-gray-800',
    principal: 'bg-blue-100 text-blue-800',
    associate: 'bg-green-100 text-green-800',
    community: 'bg-purple-100 text-purple-800',
    brand_design: 'bg-yellow-100 text-yellow-800',
    association: 'bg-indigo-100 text-indigo-800',
    media: 'bg-pink-100 text-pink-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
        <button className="bg-primaryRed text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Partner
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search partners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
            >
              <option value="all">All Categories</option>
              <option value="titanium">Titanium</option>
              <option value="principal">Principal</option>
              <option value="associate">Associate</option>
              <option value="community">Community</option>
              <option value="brand_design">Brand Design</option>
              <option value="association">Association</option>
              <option value="media">Media</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
          {filteredPartners.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No partners found. Add your first partner!</p>
            </div>
          ) : (
            filteredPartners.map((partner) => (
              <div key={partner.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative bg-gray-50 p-4 h-32 flex items-center justify-center">
                  <ClickableImage
                    src={partner.logo}
                    alt={partner.name}
                    className="max-w-full max-h-full object-contain"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${partner.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {partner.status}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{partner.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{partner.description}</p>
                  <div className="flex justify-between items-center mb-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryColors[partner.category]}`}>
                      {partner.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">Order: {partner.order}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Visit Website
                    </a>
                    <div className="flex items-center space-x-2">
                      <button className="text-indigo-600 hover:text-indigo-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-primaryRed hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPartners;