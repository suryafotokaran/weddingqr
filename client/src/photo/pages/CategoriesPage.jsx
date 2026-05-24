import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';

const CategoriesPage = () => {
  const [categoriesWithPhotos, setCategoriesWithPhotos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Static demo data - no database needed for user application
    const demoCategories = [
      {
        id: 1,
        name: "Wedding Photography",
        description: "Beautiful wedding moments captured forever",
        photoCount: 25,
        thumbnailUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: "Portrait Photography",
        description: "Professional portrait sessions",
        photoCount: 18,
        thumbnailUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        name: "Event Photography",
        description: "Special events and celebrations",
        photoCount: 32,
        thumbnailUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        created_at: new Date().toISOString()
      }
    ];

    setCategoriesWithPhotos(demoCategories);
  }, []);

  const handleCategoryClick = (categoryId, categoryName) => {
    navigate(`/category/${categoryId}`, { state: { categoryName } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Photo Categories</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explore our collection of professional photography across different categories
            </p>
          </div>
        </div>
      </div>

      {/* Categories Grid - Product Card Style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {categoriesWithPhotos.map((category) => (
            <div
              key={category.id}
              onClick={() => handleCategoryClick(category.id, category.name)}
              className="group bg-white rounded-3xl shadow-xl overflow-hidden cursor-pointer transform transition-all duration-700 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30 border border-gray-100"
            >
              {/* Category Image - Premium Product Card Style */}
              <div className="relative h-64 overflow-hidden">
                {category.thumbnailUrl ? (
                  <img
                    src={category.thumbnailUrl}
                    alt={category.name}
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400">
                    <div className="text-center text-white">
                      <Camera size={48} className="mx-auto mb-3 opacity-90" />
                      <span className="text-lg font-bold tracking-wide">{category.name}</span>
                    </div>
                  </div>
                )}

                {/* Premium Overlay Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                {/* Elegant Photo Count Badge */}
                <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-lg px-4 py-2 rounded-2xl border border-white/20">
                  <span className="text-sm font-bold text-white">
                    {category.photoCount}
                  </span>
                </div>

                {/* Floating Category Name */}
                <div className="absolute bottom-4 left-4 right-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="text-white font-bold text-2xl mb-1 drop-shadow-lg">
                    {category.name}
                  </h3>
                  <p className="text-white/90 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    Click to explore gallery →
                  </p>
                </div>
              </div>

              {/* Category Info */}
              <div className="p-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  {category.name}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {category.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-blue-600 font-medium hover:text-blue-800 transition-colors">
                    View Gallery →
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(category.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {categoriesWithPhotos.length === 0 && (
          <div className="text-center py-12">
            <Camera size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Categories Found</h3>
            <p className="text-gray-600">
              Categories will appear here once they are added to the database.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesPage;