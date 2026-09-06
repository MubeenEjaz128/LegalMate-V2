const Blog = require('../models/Blog');

/**
 * Get published blogs (public)
 */
const getBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, tag, search } = req.query;
    const skip = (page - 1) * limit;

    const query = { status: 'published', isActive: true };

    if (category) {
      query.category = category;
    }

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name email profilePicture')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-content');

    const total = await Blog.countDocuments(query);

    return res.status(200).json({
      success: true,
      blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching blogs' 
    });
  }
};

/**
 * Get all blogs (admin)
 */
const getAllBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(query);

    return res.status(200).json({
      success: true,
      blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all blogs error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching blogs' 
    });
  }
};

/**
 * Get blog by slug (public)
 */
const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({ slug, status: 'published', isActive: true })
      .populate('author', 'name email profilePicture bio');

    if (!blog) {
      return res.status(404).json({ 
        success: false,
        message: 'Blog not found' 
      });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    return res.status(200).json({
      success: true,
      blog
    });
  } catch (error) {
    console.error('Get blog error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching blog' 
    });
  }
};

/**
 * Get blog by ID (admin)
 */
const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id)
      .populate('author', 'name email');

    if (!blog) {
      return res.status(404).json({ 
        success: false,
        message: 'Blog not found' 
      });
    }

    return res.status(200).json({
      success: true,
      blog
    });
  } catch (error) {
    console.error('Get blog error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching blog' 
    });
  }
};

/**
 * Create blog (admin)
 */
const createBlog = async (req, res) => {
  try {
    const { title, excerpt, content, featuredImage, category, tags, status } = req.body;

    if (!title || !excerpt || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title, excerpt and content are required'
      });
    }

    // Generate a unique slug before validation (since schema requires slug)
    const slugify = (t) => t
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let baseSlug = slugify(title);
    let uniqueSlug = baseSlug;
    let suffix = 2;
    // Ensure uniqueness by appending incremental suffix if needed
    while (await Blog.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${suffix++}`;
    }

    const blog = new Blog({
      title,
      slug: uniqueSlug,
      excerpt,
      content,
      featuredImage,
      category: category || 'General',
      tags: tags || [],
      status: status || 'draft',
      author: req.user.userId,
      publishedAt: (status === 'published') ? new Date() : undefined
    });

    await blog.save();

    return res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      blog
    });
  } catch (error) {
    console.error('Create blog error:', error);
    // Provide validation details when available
    const message = error?.message?.includes('validation')
      ? 'Validation error creating blog'
      : 'Error creating blog';
    return res.status(500).json({ 
      success: false,
      message
    });
  }
};

/**
 * Update blog (admin)
 */
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const blog = await Blog.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({ 
        success: false,
        message: 'Blog not found' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      blog
    });
  } catch (error) {
    console.error('Update blog error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error updating blog' 
    });
  }
};

/**
 * Delete blog (admin)
 */
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      return res.status(404).json({ 
        success: false,
        message: 'Blog not found' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Delete blog error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error deleting blog' 
    });
  }
};

/**
 * Like/Unlike blog
 */
const toggleLikeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ 
        success: false,
        message: 'Blog not found' 
      });
    }

    const likeIndex = blog.likes.indexOf(userId);
    
    if (likeIndex > -1) {
      // Unlike
      blog.likes.splice(likeIndex, 1);
    } else {
      // Like
      blog.likes.push(userId);
    }

    await blog.save();

    return res.status(200).json({
      success: true,
      message: likeIndex > -1 ? 'Blog unliked' : 'Blog liked',
      likes: blog.likes.length,
      isLiked: likeIndex === -1
    });
  } catch (error) {
    console.error('Toggle like blog error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error processing request' 
    });
  }
};

module.exports = {
  getBlogs,
  getAllBlogs,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  toggleLikeBlog
};
