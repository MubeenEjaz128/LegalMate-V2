import React, { useState, useEffect } from 'react';
import { blogsAPI } from '../../services/api';
import {
    Plus, Edit, Trash2, Search, CheckCircle, XCircle,
    Loader2, Image, Calendar, User, Eye, Heart
} from 'lucide-react';
import toast from 'react-hot-toast';

const BlogsManagement = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBlog, setEditingBlog] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        excerpt: '',
        content: '',
        featuredImage: '',
        category: 'General',
        tags: '',
        status: 'draft'
    });
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [filters, setFilters] = useState({ status: 'all', page: 1 });

    const categories = ['General', 'Legal Advice', 'Case Studies', 'News', 'Tips'];

    useEffect(() => {
        fetchBlogs();
    }, [filters]);

    const fetchBlogs = async () => {
        try {
            setLoading(true);
            const response = await blogsAPI.getAllBlogs({
                page: filters.page,
                limit: 10,
                status: filters.status
            });
            setBlogs(response.data.blogs);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching blogs:', error);
            toast.error('Failed to load blogs');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (blog = null) => {
        if (blog) {
            setEditingBlog(blog);
            setFormData({
                title: blog.title,
                excerpt: blog.excerpt,
                content: blog.content,
                featuredImage: blog.featuredImage || '',
                category: blog.category || 'General',
                tags: blog.tags ? blog.tags.join(', ') : '',
                status: blog.status
            });
        } else {
            setEditingBlog(null);
            setFormData({
                title: '',
                excerpt: '',
                content: '',
                featuredImage: '',
                category: 'General',
                tags: '',
                status: 'draft'
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBlog(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Process tags
        const processedData = {
            ...formData,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
        };

        try {
            if (editingBlog) {
                await blogsAPI.updateBlog(editingBlog._id, processedData);
                toast.success('Blog updated successfully');
            } else {
                await blogsAPI.createBlog(processedData);
                toast.success('Blog created successfully');
            }
            handleCloseModal();
            fetchBlogs();
        } catch (error) {
            console.error('Error saving blog:', error);
            toast.error(error.response?.data?.message || 'Failed to save blog');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this blog?')) return;

        try {
            await blogsAPI.deleteBlog(id);
            toast.success('Blog deleted successfully');
            fetchBlogs();
        } catch (error) {
            console.error('Error deleting blog:', error);
            toast.error('Failed to delete blog');
        }
    };

    const handlePageChange = (newPage) => {
        setFilters({ ...filters, page: newPage });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-secondary-900">Blogs Management</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Create Blog
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 bg-white p-4 rounded-lg border border-secondary-200">
                <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                    className="px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                    <option value="all">All Status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Blog</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Author</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Stats</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {blogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-secondary-500">
                                            No blogs found.
                                        </td>
                                    </tr>
                                ) : (
                                    (blogs || []).map((blog) => (
                                        <tr key={blog._id} className="hover:bg-secondary-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    {blog.featuredImage && (
                                                        <img
                                                            src={blog.featuredImage}
                                                            alt=""
                                                            className="h-10 w-10 rounded object-cover mr-3"
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-medium text-secondary-900 line-clamp-1">{blog.title}</div>
                                                        <div className="text-xs text-secondary-500 flex items-center mt-1">
                                                            <Calendar className="h-3 w-3 mr-1" />
                                                            {new Date(blog.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-secondary-900">{blog.author?.name || 'Unknown'}</div>
                                                <div className="text-xs text-secondary-500">{blog.author?.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                                                    {blog.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                                <div className="flex gap-3">
                                                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {blog.views}</span>
                                                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {blog.likes?.length || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${blog.status === 'published'
                                                    ? 'bg-green-100 text-green-800'
                                                    : blog.status === 'draft'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-secondary-100 text-secondary-800'
                                                    }`}>
                                                    {blog.status.charAt(0).toUpperCase() + blog.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleOpenModal(blog)}
                                                    className="text-primary-600 hover:text-primary-900 mr-4"
                                                >
                                                    <Edit className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(blog._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-secondary-200 sm:px-6">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.pages}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-secondary-700">
                                        Showing page <span className="font-medium">{pagination.page}</span> of <span className="font-medium">{pagination.pages}</span>
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === pagination.page
                                                    ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                                    : 'bg-white border-secondary-300 text-secondary-500 hover:bg-secondary-50'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        <div className="p-3 sm:p-6 border-b border-secondary-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-secondary-900">
                                {editingBlog ? 'Edit Blog' : 'Create New Blog'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-secondary-400 hover:text-secondary-500">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Category</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Featured Image URL</label>
                                    <input
                                        type="text"
                                        name="featuredImage"
                                        value={formData.featuredImage}
                                        onChange={handleInputChange}
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Excerpt</label>
                                    <textarea
                                        name="excerpt"
                                        value={formData.excerpt}
                                        onChange={handleInputChange}
                                        rows="2"
                                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Short summary of the blog post"
                                        required
                                    ></textarea>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Content (Markdown supported)</label>
                                    <textarea
                                        name="content"
                                        value={formData.content}
                                        onChange={handleInputChange}
                                        rows="10"
                                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                                        placeholder="# Heading&#10;&#10;Write your blog content here..."
                                        required
                                    ></textarea>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Tags (comma separated)</label>
                                    <input
                                        type="text"
                                        name="tags"
                                        value={formData.tags}
                                        onChange={handleInputChange}
                                        placeholder="legal, advice, court, case"
                                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 border border-secondary-300 rounded-lg text-secondary-700 hover:bg-secondary-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                    {editingBlog ? 'Update Blog' : 'Create Blog'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlogsManagement;
