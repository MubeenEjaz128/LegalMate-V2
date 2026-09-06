const Page = require('../models/Page');

/**
 * Get page by name (public)
 */
const getPage = async (req, res) => {
  try {
    const { name } = req.params;

    let page = await Page.findOne({ name, isActive: true })
      .populate('lastUpdatedBy', 'name email');

    if (!page) {
      // Return default content instead of 404
      const defaultContent = getDefaultContent(name);
      if (defaultContent) {
        return res.status(200).json({
          success: true,
          page: defaultContent
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    return res.status(200).json({
      success: true,
      page
    });
  } catch (error) {
    console.error('Get page error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching page'
    });
  }
};

const getDefaultContent = (name) => {
  const defaults = {
    about: {
      name: 'about',
      title: 'About Us',
      content: '## Welcome to LegalMate\n\nLegalMate is Pakistan\'s premier AI-powered legal consultation platform. We bridge the gap between citizens and legal professionals through technology.\n\n### Our Mission\nTo make legal assistance accessible, affordable, and efficient for everyone in Pakistan.\n\n### Our Vision\nA society where justice is just a click away.'
    },
    privacy: {
      name: 'privacy',
      title: 'Privacy Policy',
      content: '## Privacy Policy\n\nAt LegalMate, we take your privacy seriously. This policy outlines how we collect, use, and protect your personal information.\n\n### Data Collection\nWe collect information necessary to provide our services, including name, contact details, and case information.\n\n### Data Security\nAll data is encrypted and stored securely. We do not share your personal information with third parties without your consent.'
    },
    terms: {
      name: 'terms',
      title: 'Terms and Conditions',
      content: '## Terms of Service\n\nBy using LegalMate, you agree to these terms. Please read them carefully.\n\n### User Responsibilities\nYou are responsible for providing accurate information and using the platform in accordance with local laws.\n\n### Disclaimer\nLegalMate connects you with lawyers but does not provide legal advice directly. The AI assistant provides general information only.'
    },
    developer: {
      name: 'developer',
      title: 'Developer Profile',
      content: {
        name: 'Mubeen',
        role: 'Full Stack Developer',
        bio: 'Passionate developer building solutions for real-world problems.',
        skills: ['React', 'Node.js', 'MongoDB', 'Python', 'AI Integration'],
        github: 'https://github.com/mubeen',
        linkedin: 'https://linkedin.com/in/mubeen',
        email: 'mubeen@example.com'
      }
    }
  };
  return defaults[name];
};

/**
 * Get all pages (admin)
 */
const getAllPages = async (req, res) => {
  try {
    const pages = await Page.find()
      .populate('lastUpdatedBy', 'name email')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      pages
    });
  } catch (error) {
    console.error('Get all pages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching pages'
    });
  }
};

/**
 * Update page (admin)
 */
const updatePage = async (req, res) => {
  try {
    const { name } = req.params;
    const { title, content } = req.body;

    let page = await Page.findOne({ name });

    if (!page) {
      // Create page if doesn't exist
      page = await Page.create({
        name,
        title,
        content,
        lastUpdatedBy: req.user.userId
      });
    } else {
      // Update existing page
      page.title = title;
      page.content = content;
      page.lastUpdatedBy = req.user.userId;
      await page.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Page updated successfully',
      page
    });
  } catch (error) {
    console.error('Update page error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating page'
    });
  }
};

module.exports = {
  getPage,
  getAllPages,
  updatePage
};
