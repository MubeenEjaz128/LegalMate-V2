import React, { useState, useEffect } from 'react';
import { pagesAPI } from '../services/api';
import { Shield, Lock, Eye, AlertCircle, FileText, Mail, Clock } from 'lucide-react';

const PrivacyPolicyPage = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await pagesAPI.getPage('privacy');
      setContent(response.data.page.content);
    } catch (error) {
      console.error('Error fetching privacy policy:', error);
    } finally {
      setLoading(false);
    }
  };

  // Default content if no custom content is set
  const defaultContent = {
    lastUpdated: 'January 2024',
    sections: [
      {
        title: 'Information We Collect',
        icon: FileText,
        content: `We collect information that you provide directly to us, including:
        
        • Personal identification information (name, email address, phone number)
        • Account credentials and profile information
        • Payment and billing information
        • Appointment details and legal consultation information
        • Communication history and chat messages
        • Documents you upload to our platform`,
      },
      {
        title: 'How We Use Your Information',
        icon: Eye,
        content: `We use the information we collect to:
        
        • Provide, maintain, and improve our services
        • Process appointments and legal consultations
        • Send you technical notices and support messages
        • Respond to your comments and questions
        • Facilitate communication between clients and lawyers
        • Process payments and maintain billing records
        • Protect against fraud and unauthorized access`,
      },
      {
        title: 'Data Security',
        icon: Lock,
        content: `We implement appropriate technical and organizational security measures to protect your personal information:
        
        • Encryption of data in transit and at rest
        • Secure socket layer (SSL) technology
        • Regular security assessments and updates
        • Access controls and authentication mechanisms
        • Secure backup and disaster recovery procedures
        • Employee training on data protection
        
        However, no method of transmission over the Internet is 100% secure. We strive to protect your information but cannot guarantee absolute security.`,
      },
      {
        title: 'Information Sharing',
        icon: AlertCircle,
        content: `We do not sell your personal information. We may share your information only in the following circumstances:
        
        • With lawyers on our platform to facilitate legal services
        • With service providers who assist in our operations
        • When required by law or legal process
        • To protect our rights, privacy, safety, or property
        • With your explicit consent
        
        All third parties are bound by confidentiality obligations.`,
      },
      {
        title: 'Your Rights',
        icon: Shield,
        content: `You have the right to:
        
        • Access your personal information
        • Correct inaccurate or incomplete data
        • Request deletion of your data (subject to legal obligations)
        • Object to processing of your personal information
        • Request data portability
        • Withdraw consent at any time
        • Lodge a complaint with a supervisory authority
        
        To exercise these rights, please contact us using the information provided below.`,
      },
      {
        title: 'Data Retention',
        icon: Clock,
        content: `We retain your personal information for as long as necessary to:
        
        • Provide our services to you
        • Comply with legal obligations
        • Resolve disputes and enforce agreements
        • Maintain business records
        
        When we no longer need your information, we will securely delete or anonymize it.`,
      },
      {
        title: 'Cookies and Tracking',
        icon: Eye,
        content: `We use cookies and similar tracking technologies to:
        
        • Remember your preferences and settings
        • Understand how you use our services
        • Improve our platform and user experience
        • Provide personalized content
        
        You can control cookies through your browser settings. However, disabling cookies may affect functionality.`,
      },
      {
        title: 'Children\'s Privacy',
        icon: Shield,
        content: `Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.`,
      },
    ],
  };

  const displayContent = content || defaultContent;

  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Privacy Policy
            </h1>
            <p className="text-xl text-primary-100 max-w-3xl mx-auto">
              Your privacy is important to us. Learn how we collect, use, and protect your information.
            </p>
            {displayContent.lastUpdated && (
              <p className="mt-4 text-primary-200">
                Last Updated: {displayContent.lastUpdated}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <p className="text-secondary-700 leading-relaxed">
            At LegalMate, we are committed to protecting your privacy and ensuring the security of your personal information. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
            legal services platform. Please read this policy carefully to understand our practices regarding your personal data.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {displayContent.sections?.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-8 py-6 border-b border-primary-200">
                  <div className="flex items-center">
                    <div className="bg-primary-600 rounded-lg p-3 mr-4">
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-secondary-900">
                      {section.title}
                    </h2>
                  </div>
                </div>
                <div className="p-8">
                  <div className="prose prose-lg max-w-none text-secondary-700">
                    {section.content.split('\n').map((paragraph, i) => (
                      <p key={i} className="mb-3 leading-relaxed whitespace-pre-line">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-800 rounded-xl p-8 text-white">
          <div className="flex items-start">
            <Mail className="h-8 w-8 mr-4 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-2xl font-bold mb-4">Contact Us About Privacy</h3>
              <p className="text-primary-100 mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, 
                please don't hesitate to contact us:
              </p>
              <div className="space-y-2 text-primary-100">
                <p><strong className="text-white">Email:</strong> legalmate.services@gmail.com</p>
                <p><strong className="text-white">Address:</strong> Legal Department, LegalMate Inc.</p>
                <p><strong className="text-white">Phone:</strong> +923177099128</p>
              </div>
              <div className="mt-6">
                <a
                  href="/contact"
                  className="inline-block bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-secondary-100 transition-colors"
                >
                  Contact Privacy Team
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Updates Notice */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-secondary-900 mb-2">Changes to This Policy</h4>
              <p className="text-secondary-700 text-sm">
                We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, 
                regulatory, or operational reasons. We will notify you of any material changes by posting the new 
                Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this 
                Privacy Policy periodically.
              </p>
            </div>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="/terms"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow group"
          >
            <h4 className="font-semibold text-secondary-900 mb-2 group-hover:text-primary-600 transition-colors">
              Terms & Conditions
            </h4>
            <p className="text-sm text-secondary-600">
              Read our terms of service and user agreement
            </p>
          </a>
          <a
            href="/contact"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow group"
          >
            <h4 className="font-semibold text-secondary-900 mb-2 group-hover:text-primary-600 transition-colors">
              Contact Us
            </h4>
            <p className="text-sm text-secondary-600">
              Get in touch with our support team
            </p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
