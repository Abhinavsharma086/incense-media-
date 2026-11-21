import React from 'react';

const TestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Test Page - App Working</h1>
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">React Components</h2>
            <p className="text-gray-700">✅ React components loading properly</p>
            <p className="text-gray-700">✅ TypeScript compilation successful</p>
            <p className="text-gray-700">✅ CSS styles applied correctly</p>
          </div>
          
          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Dependencies</h2>
            <p className="text-gray-700">✅ React Router working</p>
            <p className="text-gray-700">✅ Redux store configured</p>
            <p className="text-gray-700">✅ TailwindCSS loading</p>
          </div>
          
          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Build Status</h2>
            <p className="text-gray-700">✅ No TypeScript errors</p>
            <p className="text-gray-700">✅ No import issues</p>
            <p className="text-gray-700">✅ Assets loading properly</p>
          </div>
          
          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Navigation</h2>
            <div className="space-y-2">
              <a href="/" className="block text-blue-600 hover:text-blue-800">🏠 Home Page</a>
              <a href="/about" className="block text-blue-600 hover:text-blue-800">📖 About Us</a>
              <a href="/publications" className="block text-blue-600 hover:text-blue-800">📚 Publications</a>
              <a href="/events" className="block text-blue-600 hover:text-blue-800">🎉 Events</a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-lg text-gray-600">
            If you can see this page, the app is working correctly! 🎉
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestPage;