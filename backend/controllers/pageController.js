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
        name: 'M. Mubeen Ejaz',
        title: 'Full-Stack Software Engineer & AI Solutions Developer',
        eyebrow: 'Developer & Maintainer of LegalMate',
        bio: 'I build production-grade web applications, AI-powered systems and scalable backend architectures across modern stacks. My work spans SaaS platforms, real-time applications, RAG-based AI, cloud deployments and automation.',
        profileImage: 'https://avatars.githubusercontent.com/u/94120325?v=4',
        location: 'Burewala, Pakistan',
        email: 'mubeenejaz128@gmail.com',
        github: 'https://github.com/MubeenEjaz128',
        linkedin: 'https://www.linkedin.com/in/mubeen-ejaz/',
        website: 'https://www.mubeenejaz.app/',
        whatsapp: 'https://wa.me/923177099128',
        stats: [
          { value: '10+', label: 'Projects shipped' },
          { value: '5+', label: 'Live deployments' },
          { value: '3.75', label: 'BSCS CGPA' }
        ],
        skills: [
          {
            category: 'Full-Stack Web',
            icon: 'code',
            description: 'Modern, responsive applications with scalable APIs and real-time workflows.',
            items: ['React.js', 'Next.js', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'REST APIs', 'WebSockets']
          },
          {
            category: 'Backend & Architecture',
            icon: 'server',
            description: 'Production-grade services, databases, authentication and systems architecture.',
            items: ['Node.js', 'Express.js', 'Django', 'PHP Laravel', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis']
          },
          {
            category: 'AI & Machine Learning',
            icon: 'ai',
            description: 'RAG pipelines, AI agents, LLM integrations and predictive machine-learning solutions.',
            items: ['RAG Systems', 'AI Agents', 'OpenAI API', 'Vector DBs', 'Scikit-Learn', 'Pandas', 'NLP']
          },
          {
            category: 'Cloud & DevOps',
            icon: 'cloud',
            description: 'Deployment, Linux administration, CI/CD and production infrastructure.',
            items: ['Vercel', 'Render', 'Docker', 'Linux VPS', 'Nginx', 'Git/GitHub', 'PyQt']
          }
        ],
        projects: [
          {
            name: 'LegalMate',
            badge: 'SaaS · AI',
            description: 'AI-powered legal consultation platform connecting clients with verified legal practitioners with RAG assistance, booking, chat and real-time video consultation.',
            tech: ['React', 'Node.js', 'MongoDB', 'Socket.IO', 'WebRTC', 'RAG / AI'],
            highlights: ['RAG-based legal assistant', 'Real-time video & chat', 'Appointment scheduling', 'PKR wallet workflows'],
            live: 'https://legalmate.me',
            github: 'https://github.com/MubeenEjaz128/LegalMate-V2'
          },
          {
            name: 'SupportDesk',
            badge: 'SaaS Platform',
            description: 'Enterprise customer-support workspace with role-based access, ticket lifecycle management and AI-assisted response suggestions.',
            tech: ['Django', 'React', 'MongoDB', 'AI / LLM', 'Render', 'Vercel'],
            highlights: ['Admin / Supervisor / Agent RBAC', 'Ticket workflows', 'Customer history', 'AI reply assistance'],
            live: 'https://support-desk-lac.vercel.app',
            github: 'https://github.com/MubeenEjaz128/SupportDesk'
          },
          {
            name: 'Bologna',
            badge: 'Portal System',
            description: 'Academic admission and verification portal with document workflows, certificate generation and administrative auditing.',
            tech: ['React', 'Node.js', 'Express', 'MySQL', 'Tailwind CSS'],
            highlights: ['Admission workflows', 'Document verification', 'PDF generation', 'Role-based admin'],
            live: 'https://bologna-liart.vercel.app',
            github: 'https://github.com/MubeenEjaz128/bologna'
          }
        ],
        education: [
          {
            degree: 'Bachelor of Science in Computer Science',
            institution: 'COMSATS University Islamabad',
            year: '2022 — 2026',
            description: 'CGPA 3.75 / 4.00. Focused on software engineering, databases, AI/ML, networking and production system development.'
          }
        ],
        achievements: [
          'Built and shipped 10+ software projects across SaaS, AI/ML, portals and automation.',
          'Deployed 5+ production applications across Vercel, Render and VPS infrastructure.',
          'Built RAG-based AI workflows and real-time WebRTC / Socket.IO systems.',
          'Commercialized a machine-learning disease prediction solution for practical use.'
        ]
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
