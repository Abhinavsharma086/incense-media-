import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface Achiever {
  category: string;
  reservedOpen: string;
  awardee: string;
  runnerUp: string;
}

interface OptionalData {
  ceremony: string;
  takeaways: string[];
  achievers: Achiever[];
  mapLink: string;
  registrationLink: string;
}

interface AwardOptionalDataProps {
  optionalData?: OptionalData;
  onDataChange: (data: OptionalData) => void;
}

const AwardOptionalData: React.FC<AwardOptionalDataProps> = ({ optionalData, onDataChange }) => {
  const [localData, setLocalData] = useState<OptionalData>({
    ceremony: optionalData?.ceremony || '',
    takeaways: optionalData?.takeaways || [''],
    achievers: optionalData?.achievers || [{
      category: '',
      reservedOpen: '',
      awardee: '',
      runnerUp: ''
    }],
    mapLink: optionalData?.mapLink || '',
    registrationLink: optionalData?.registrationLink || ''
  });

  useEffect(() => {
    // Ensure we have at least one empty takeaway and one empty achiever
    const dataWithDefaults = {
      ceremony: optionalData?.ceremony || '',
      takeaways: (optionalData?.takeaways && optionalData.takeaways.length > 0) ? optionalData.takeaways : [''],
      achievers: (optionalData?.achievers && optionalData.achievers.length > 0) ? optionalData.achievers : [{
        category: '',
        reservedOpen: '',
        awardee: '',
        runnerUp: ''
      }],
      mapLink: optionalData?.mapLink || '',
      registrationLink: optionalData?.registrationLink || ''
    };
    setLocalData(dataWithDefaults);
  }, [optionalData]);

  const updateData = (newData: OptionalData) => {
    setLocalData(newData);
    onDataChange(newData);
  };

  const handleCeremonyChange = (value: string) => {
    updateData({
      ...localData,
      ceremony: value
    });
  };

  const handleTakeawayAdd = () => {
    updateData({
      ...localData,
      takeaways: [...localData.takeaways, '']
    });
  };

  const handleTakeawayChange = (index: number, value: string) => {
    const newTakeaways = [...localData.takeaways];
    newTakeaways[index] = value;
    updateData({
      ...localData,
      takeaways: newTakeaways
    });
  };

  const handleTakeawayRemove = (index: number) => {
    const newTakeaways = localData.takeaways.filter((_, i) => i !== index);
    updateData({
      ...localData,
      takeaways: newTakeaways
    });
  };

  const handleAchieverAdd = () => {
    updateData({
      ...localData,
      achievers: [...localData.achievers, {
        category: '',
        reservedOpen: '',
        awardee: '',
        runnerUp: ''
      }]
    });
  };

  const handleAchieverChange = (index: number, field: keyof Achiever, value: string) => {
    const newAchievers = [...localData.achievers];
    newAchievers[index] = {
      ...newAchievers[index],
      [field]: value
    };
    updateData({
      ...localData,
      achievers: newAchievers
    });
  };

  const handleAchieverRemove = (index: number) => {
    const newAchievers = localData.achievers.filter((_, i) => i !== index);
    updateData({
      ...localData,
      achievers: newAchievers
    });
  };

  const handleMapLinkChange = (value: string) => {
    updateData({
      ...localData,
      mapLink: value
    });
  };

  const handleRegistrationLinkChange = (value: string) => {
    updateData({
      ...localData,
      registrationLink: value
    });
  };

  return (
    <div className="space-y-6">
      {/* Ceremony Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          About the Award Ceremony
        </label>
        <textarea
          value={localData.ceremony}
          onChange={(e) => handleCeremonyChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
          placeholder="Enter ceremony description..."
          rows={4}
        />
      </div>

      {/* Key Takeaways Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Key Takeaways
          </label>
          <button
            type="button"
            onClick={handleTakeawayAdd}
            className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Takeaway
          </button>
        </div>

        <div className="space-y-3">
          {(localData.takeaways || []).map((takeaway, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                {index + 1}
              </div>
              <div className="flex-1">
                <textarea
                  value={takeaway}
                  onChange={(e) => handleTakeawayChange(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryRed focus:border-primaryRed"
                  placeholder={`Enter takeaway ${index + 1}...`}
                  rows={2}
                />
              </div>
              <button
                type="button"
                onClick={() => handleTakeawayRemove(index)}
                className="flex-shrink-0 text-red-600 hover:text-red-800"
                title="Remove takeaway"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Outstanding Achievers Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Celebrating Outstanding Achievers
          </label>
          <button
            type="button"
            onClick={handleAchieverAdd}
            className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Achiever
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 rounded-lg">
            <thead className="bg-orange-500 text-white">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">Category</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Reserved/Open</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Awardee</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Runner Up</th>
                <th className="px-4 py-2 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(localData.achievers || []).map((achiever, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={achiever.category}
                      onChange={(e) => handleAchieverChange(index, 'category', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primaryRed focus:border-primaryRed text-sm"
                      placeholder="Enter category..."
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={achiever.reservedOpen}
                      onChange={(e) => handleAchieverChange(index, 'reservedOpen', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primaryRed focus:border-primaryRed text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="Exhibitor">Exhibitor</option>
                      <option value="Jury">Jury</option>
                      <option value="Open to All">Open to All</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={achiever.awardee}
                      onChange={(e) => handleAchieverChange(index, 'awardee', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primaryRed focus:border-primaryRed text-sm"
                      placeholder="Enter awardee name..."
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={achiever.runnerUp}
                      onChange={(e) => handleAchieverChange(index, 'runnerUp', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primaryRed focus:border-primaryRed text-sm"
                      placeholder="Enter runner up name..."
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleAchieverRemove(index)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove achiever"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AwardOptionalData;
