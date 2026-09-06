import React, { useState, useEffect } from 'react';
import { pagesAPI } from '../services/api';
import { Code, Github, Linkedin, Mail, Globe, Award, Coffee, Heart, ExternalLink } from 'lucide-react';

const DeveloperPage = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await pagesAPI.getPage('developer');
      const fetchedContent = response.data.page?.content || {};
      
      // Merge with default to ensure all arrays exist
      setContent({
        ...defaultContent,
        ...fetchedContent,
        skills: Array.isArray(fetchedContent.skills) && fetchedContent.skills.length > 0 
          ? fetchedContent.skills 
          : defaultContent.skills,
        projects: Array.isArray(fetchedContent.projects) && fetchedContent.projects.length > 0 
          ? fetchedContent.projects 
          : defaultContent.projects,
        education: Array.isArray(fetchedContent.education) && fetchedContent.education.length > 0 
          ? fetchedContent.education 
          : defaultContent.education,
        achievements: Array.isArray(fetchedContent.achievements) && fetchedContent.achievements.length > 0 
          ? fetchedContent.achievements 
          : defaultContent.achievements
      });
    } catch (error) {
      console.error('Error fetching developer info:', error);
      setContent(defaultContent);
    } finally {
      setLoading(false);
    }
  };

  // Default content - Update this with your actual information
  const defaultContent = {
    name: 'Your Name',
    title: 'Full Stack Developer',
    bio: `Passionate full-stack developer with expertise in building modern web applications. 
    Specialized in MERN stack development, creating scalable and user-friendly solutions for complex problems.`,
    profileImage: '', // Add your image URL here
    email: 'your.email@example.com',
    github: 'https://github.com/yourusername',
    linkedin: 'https://linkedin.com/in/yourusername',
    website: 'https://yourwebsite.com',
    
    skills: [
      { category: 'Frontend', items: ['React.js', 'JavaScript', 'HTML/CSS', 'Tailwind CSS', 'Redux/Zustand'] },
      { category: 'Backend', items: ['Node.js', 'Express.js', 'MongoDB', 'REST APIs', 'JWT Authentication'] },
      { category: 'Tools & Others', items: ['Git', 'VS Code', 'Postman', 'Figma', 'AWS'] },
    ],
    
    projects: [
      {
        name: 'LegalMate',
        description: 'A comprehensive legal services platform connecting clients with lawyers',
        tech: ['React', 'Node.js', 'MongoDB', 'Express', 'Socket.io'],
        highlights: ['Video consultations', 'AI-powered chatbot', 'Appointment booking', 'Payment integration'],
      },
      {
        name: 'E-Commerce Platform',
        description: 'Full-featured online shopping platform with admin dashboard',
        tech: ['React', 'Node.js', 'MongoDB', 'Stripe'],
        highlights: ['Product management', 'Order tracking', 'Payment processing'],
      },
      {
        name: 'Task Management System',
        description: 'Collaborative task management tool for teams',
        tech: ['React', 'Firebase', 'Material-UI'],
        highlights: ['Real-time updates', 'Team collaboration', 'Analytics dashboard'],
      },
    ],
    
    education: [
      {
        degree: 'Bachelor of Science in Computer Science',
        institution: 'Your University',
        year: '2020 - 2024',
        description: 'Final Year Project: LegalMate - Legal Services Platform',
      },
    ],
    
    achievements: [
      'Developed and deployed multiple full-stack applications',
      'Contributed to open-source projects',
      'Strong problem-solving and debugging skills',
      'Excellent team collaboration and communication',
    ],
  };

  const displayContent = content || defaultContent;

  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-800 text-white">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-60 w-60 rounded-full bg-accent-400/10 blur-3xl" />
        <div className="relative container-custom py-16 lg:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center mb-4">
                <Code className="h-8 w-8 mr-3 text-primary-300" />
                <span className="text-primary-300 font-semibold">Developer Profile</span>
              </div>
              <h1 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl">
                {displayContent.name}
              </h1>
              <p className="text-xl text-secondary-300 mt-3">
                {displayContent.title}
              </p>
              <p className="text-base text-secondary-300 leading-relaxed mt-5">
                {displayContent.bio}
              </p>
              
              {/* Social Links */}
              <div className="flex gap-4">
                {displayContent.github && (
                  <a
                    href={displayContent.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors"
                  >
                    <Github className="h-6 w-6" />
                  </a>
                )}
                {displayContent.linkedin && (
                  <a
                    href={displayContent.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors"
                  >
                    <Linkedin className="h-6 w-6" />
                  </a>
                )}
                {displayContent.website && (
                  <a
                    href={displayContent.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors"
                  >
                    <Globe className="h-6 w-6" />
                  </a>
                )}
                {displayContent.email && (
                  <a
                    href={`mailto:${displayContent.email}`}
                    className="bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors"
                  >
                    <Mail className="h-6 w-6" />
                  </a>
                )}
              </div>
            </div>
            
            {/* Profile Image */}
            <div className="flex justify-center">
              <div className="relative">
                {displayContent.profileImage ? (
                  <img
                    src={displayContent.profileImage}
                    alt={displayContent.name}
                    className="w-64 h-64 rounded-full object-cover border-8 border-white/20 shadow-2xl"
                  />
                ) : (
                  <div className="w-64 h-64 rounded-full bg-white/20 border-8 border-white/30 flex items-center justify-center shadow-2xl">
                    <Code className="h-32 w-32 text-white/80" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Skills Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-secondary-900 mb-8 flex items-center">
            <Award className="h-8 w-8 mr-3 text-primary-600" />
            Technical Skills
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {displayContent.skills?.map((skillGroup, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-secondary-900 mb-4">{skillGroup.category}</h3>
                <div className="flex flex-wrap gap-2">
                  {skillGroup.items?.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Projects Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-secondary-900 mb-8 flex items-center">
            <Code className="h-8 w-8 mr-3 text-primary-600" />
            Featured Projects
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayContent.projects?.map((project, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-800 p-6 text-white">
                  <h3 className="text-xl font-bold mb-2">{project.name}</h3>
                  <p className="text-primary-100 text-sm">{project.description}</p>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-secondary-900 mb-2">Technologies:</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.tech?.map((tech, i) => (
                        <span key={i} className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded text-xs">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-secondary-900 mb-2">Key Features:</h4>
                    <ul className="space-y-1">
                      {project.highlights?.map((highlight, i) => (
                        <li key={i} className="text-sm text-secondary-600 flex items-start">
                          <span className="text-primary-600 mr-2">•</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Education Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-secondary-900 mb-8 flex items-center">
            <Award className="h-8 w-8 mr-3 text-primary-600" />
            Education
          </h2>
          <div className="space-y-6">
            {displayContent.education?.map((edu, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-secondary-900">{edu.degree}</h3>
                    <p className="text-primary-600 font-semibold">{edu.institution}</p>
                  </div>
                  <span className="text-secondary-500 font-medium">{edu.year}</span>
                </div>
                <p className="text-secondary-600">{edu.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Achievements Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-secondary-900 mb-8 flex items-center">
            <Award className="h-8 w-8 mr-3 text-primary-600" />
            Achievements & Strengths
          </h2>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="grid md:grid-cols-2 gap-4">
              {displayContent.achievements?.map((achievement, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary-600 font-bold">{index + 1}</span>
                  </div>
                  <p className="text-secondary-700">{achievement}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section>
          <div className="bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-800 rounded-xl p-12 text-center text-white">
            <Coffee className="h-16 w-16 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Let's Work Together</h2>
            <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
              Interested in collaborating on a project or have a question? Feel free to reach out!
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href={`mailto:${displayContent.email}`}
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-secondary-100 transition-colors flex items-center"
              >
                <Mail className="h-5 w-5 mr-2" />
                Email Me
              </a>
              {displayContent.linkedin && (
                <a
                  href={displayContent.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-800 transition-colors flex items-center"
                >
                  <Linkedin className="h-5 w-5 mr-2" />
                  Connect on LinkedIn
                </a>
              )}
              {displayContent.github && (
                <a
                  href={displayContent.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-secondary-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-secondary-900 transition-colors flex items-center"
                >
                  <Github className="h-5 w-5 mr-2" />
                  View GitHub
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Made with Love */}
        <div className="mt-12 text-center">
          <p className="text-secondary-600 flex items-center justify-center">
            Made with <Heart className="h-5 w-5 mx-2 text-error-500 fill-current" /> by {displayContent.name}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeveloperPage;
