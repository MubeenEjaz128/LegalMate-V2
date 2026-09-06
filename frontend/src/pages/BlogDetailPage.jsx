import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { blogsAPI } from '../services/api';
import { Calendar, User, Eye, Heart, ArrowLeft, Share2, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const BlogDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    fetchBlog();
  }, [slug]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const response = await blogsAPI.getBlogBySlug(slug);
      setBlog(response.data.blog);
      // Check if user has liked
      if (user && response.data.blog.likes) {
        setIsLiked(response.data.blog.likes.includes(user._id));
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
      toast.error('Blog not found');
      navigate('/blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to like blogs');
      return;
    }

    try {
      const response = await blogsAPI.likeBlog(blog._id);
      setIsLiked(response.data.isLiked);
      setBlog({
        ...blog,
        likes: Array(response.data.likes).fill(null)
      });
      toast.success(response.data.isLiked ? 'Blog liked!' : 'Blog unliked');
    } catch (error) {
      console.error('Error liking blog:', error);
      toast.error('Failed to like blog');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: blog.title,
          text: blog.excerpt,
          url: url,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyToClipboard(url);
        }
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!blog) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/blogs')}
          className="flex items-center text-secondary-600 hover:text-secondary-900 mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Blogs
        </button>

        {/* Article */}
        <article className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Featured Image */}
          {blog.featuredImage && (
            <div className="aspect-video overflow-hidden">
              <img
                src={blog.featuredImage}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8 md:p-12">
            {/* Category & Date */}
            <div className="flex items-center gap-4 text-sm text-secondary-500 mb-6">
              <span className="bg-primary-100 text-primary-600 px-4 py-1 rounded-full font-medium">
                {blog.category}
              </span>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-6">
              {blog.title}
            </h1>

            {/* Author Info & Stats */}
            <div className="flex items-center justify-between pb-6 mb-8 border-b border-secondary-200">
              <div className="flex items-center">
                {blog.author?.profilePicture ? (
                  <img
                    src={blog.author.profilePicture}
                    alt={blog.author.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                ) : (
                  <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center mr-4">
                    <User className="h-6 w-6 text-white" />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-secondary-900">
                    {blog.author?.name || 'Admin'}
                  </div>
                  {blog.author?.role && (
                    <div className="text-sm text-secondary-500 capitalize">{blog.author.role}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-secondary-500">
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  {blog.views || 0}
                </div>
                <button
                  onClick={handleLike}
                  className={`flex items-center transition-colors ${
                    isLiked ? 'text-error-500' : 'hover:text-error-500'
                  }`}
                >
                  <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                  {blog.likes?.length || 0}
                </button>
                <button 
                  onClick={handleShare}
                  className="flex items-center hover:text-primary-600 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Excerpt */}
            {blog.excerpt && (
              <div className="text-xl text-secondary-600 mb-8 font-medium italic border-l-4 border-primary-600 pl-6">
                {blog.excerpt}
              </div>
            )}

            {/* Content */}
            <div 
              className="prose prose-lg max-w-none prose-headings:text-secondary-900 prose-p:text-secondary-700 prose-a:text-primary-600 prose-strong:text-secondary-900"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="mt-8 pt-8 border-t border-secondary-200">
                <h3 className="text-sm font-semibold text-secondary-900 mb-3">Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-sm hover:bg-secondary-200 transition-colors cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Share Section */}
            <div className="mt-8 pt-8 border-t border-secondary-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-secondary-900">Share this article</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={handleShare}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Call to Action */}
        <div className="mt-12 bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-800 rounded-xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">Need Legal Assistance?</h3>
          <p className="text-primary-100 mb-6">
            Our experienced lawyers are here to help you with your legal matters.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/book')}
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-secondary-100 transition-colors"
            >
              Book a Consultation
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-800 transition-colors"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetailPage;
