import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { blogsAPI } from '../services/api';
import { Calendar, User, Eye, Heart, ArrowRight, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const BlogsPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all',
    search: '',
    page: 1
  });
  const [pagination, setPagination] = useState({});
  const navigate = useNavigate();

  const categories = ['All', 'Legal Advice', 'Case Studies', 'News', 'Tips', 'General'];

  useEffect(() => {
    fetchBlogs();
  }, [filters]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: 9
      };
      
      if (filters.category !== 'all') {
        params.category = filters.category;
      }
      
      if (filters.search) {
        params.search = filters.search;
      }

      const response = await blogsAPI.getBlogs(params);
      setBlogs(response.data.blogs);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    setFilters({
      ...filters,
      category: category === 'All' ? 'all' : category,
      page: 1
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({ ...filters, page: 1 });
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-800 text-white">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-60 w-60 rounded-full bg-accent-400/10 blur-3xl" />
        <div className="relative container-custom py-16 lg:py-20">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl">
              Legal Insights & Resources
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-secondary-300 sm:text-lg">
              Expert legal advice, case studies, and industry news
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search & Filters */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search blogs..."
                className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${
                  (category === 'All' && filters.category === 'all') || category === filters.category
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-secondary-700 hover:bg-secondary-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Blogs Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <article
                  key={blog._id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/blogs/${blog.slug}`)}
                >
                  {blog.featuredImage && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={blog.featuredImage}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex items-center gap-4 text-sm text-secondary-500 mb-3">
                      <span className="bg-primary-100 text-primary-600 px-3 py-1 rounded-full text-xs font-medium">
                        {blog.category}
                      </span>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(blog.publishedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <h2 className="text-xl font-bold text-secondary-900 mb-3 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {blog.title}
                    </h2>

                    <p className="text-secondary-600 mb-4 line-clamp-3">
                      {blog.excerpt}
                    </p>

                    <div className="flex items-center justify-between text-sm text-secondary-500 pt-4 border-t border-secondary-100">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {blog.author?.name || 'Admin'}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          {blog.views || 0}
                        </div>
                        <div className="flex items-center">
                          <Heart className="h-4 w-4 mr-1" />
                          {blog.likes?.length || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setFilters({ ...filters, page })}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      page === pagination.page
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-secondary-700 hover:bg-secondary-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}

            {/* Empty State */}
            {blogs.length === 0 && (
              <div className="text-center py-20">
                <p className="text-secondary-500 text-lg">No blogs found.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BlogsPage;
