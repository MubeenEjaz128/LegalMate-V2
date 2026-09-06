import React, { useState, useEffect } from 'react';
import { pagesAPI } from '../services/api';
import { FileText, Scale, AlertTriangle, CheckCircle, XCircle, UserCheck, Shield } from 'lucide-react';

const TermsConditionsPage = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await pagesAPI.getPage('terms');
      setContent(response.data.page.content);
    } catch (error) {
      console.error('Error fetching terms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Default content if no custom content is set
  const defaultContent = {
    lastUpdated: 'January 2024',
    effectiveDate: 'January 1, 2024',
    sections: [
      {
        title: 'Acceptance of Terms',
        icon: CheckCircle,
        content: `By accessing and using LegalMate ("the Platform"), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
        
        These terms constitute a legally binding agreement between you and LegalMate. Your continued use of the Platform signifies your acceptance of any updates or modifications to these terms.`,
      },
      {
        title: 'User Accounts',
        icon: UserCheck,
        content: `Account Registration:
        • You must be at least 18 years old to create an account
        • You must provide accurate and complete information
        • You are responsible for maintaining account security
        • You must not share your account credentials
        • One person may not maintain multiple accounts
        
        Account Responsibilities:
        • Keep your password secure and confidential
        • Notify us immediately of unauthorized access
        • You are responsible for all activities under your account
        • We reserve the right to suspend or terminate accounts that violate these terms`,
      },
      {
        title: 'Services Provided',
        icon: Scale,
        content: `LegalMate provides a platform that connects clients with licensed legal professionals. Our services include:
        
        • Online lawyer discovery and appointment booking
        • Video consultation facilities
        • Document sharing and management
        • Legal chatbot assistance
        • Payment processing for legal services
        • Communication tools between clients and lawyers
        
        Important: LegalMate is a platform provider. We do not provide legal advice ourselves. All legal services are provided by independent licensed attorneys.`,
      },
      {
        title: 'User Obligations',
        icon: FileText,
        content: `You agree to:
        
        • Provide truthful and accurate information
        • Use the Platform only for lawful purposes
        • Respect the confidentiality of legal consultations
        • Pay all fees associated with services used
        • Comply with all applicable laws and regulations
        • Treat lawyers and other users with respect
        • Not misuse or attempt to manipulate the Platform
        • Not upload malicious content or viruses
        • Not impersonate others or provide false information`,
      },
      {
        title: 'Lawyer Services and Attorney-Client Relationship',
        icon: Scale,
        content: `Attorney-Client Relationship:
        • Relationships are formed directly between you and the lawyer
        • LegalMate is not a party to this relationship
        • We do not supervise or control lawyers' services
        • Lawyers are independent professionals
        
        Lawyer Responsibilities:
        • Lawyers must maintain valid licenses
        • Lawyers are responsible for their own professional conduct
        • Lawyers must comply with professional ethics rules
        • LegalMate does not guarantee outcomes of legal matters`,
      },
      {
        title: 'Payments and Refunds',
        icon: FileText,
        content: `Payment Terms:
        • All fees must be paid as specified on the Platform
        • Prices are subject to change with notice
        • You authorize us to charge your payment method
        • Failed payments may result in service suspension
        
        Refund Policy:
        • Consultation fees are generally non-refundable once a session begins
        • Refunds for cancelled appointments follow our cancellation policy
        • Disputes should be reported within 7 days
        • Platform fees and service charges are non-refundable
        • Refund decisions are at our discretion`,
      },
      {
        title: 'Prohibited Activities',
        icon: XCircle,
        content: `You must NOT:
        
        • Use the Platform for illegal activities
        • Harass, threaten, or abuse other users
        • Share inappropriate or offensive content
        • Attempt to hack or compromise Platform security
        • Scrape or data mine Platform information
        • Use automated bots or scripts
        • Violate intellectual property rights
        • Manipulate reviews or ratings
        • Circumvent payment systems
        • Share account access with others
        • Impersonate others or create fake accounts`,
      },
      {
        title: 'Intellectual Property',
        icon: Shield,
        content: `Platform Content:
        • All Platform content is owned by LegalMate or licensors
        • You may not copy, modify, or distribute our content
        • Our trademarks and logos are protected
        • Unauthorized use may result in legal action
        
        User Content:
        • You retain ownership of content you upload
        • You grant us a license to use your content for Platform operations
        • You represent that you have rights to uploaded content
        • We may remove content that violates these terms`,
      },
      {
        title: 'Privacy and Data Protection',
        icon: Shield,
        content: `We are committed to protecting your privacy:
        
        • Personal information is handled per our Privacy Policy
        • We use encryption and security measures
        • We do not sell your personal information
        • You can request access to your data
        • Legal consultations are confidential
        • We comply with applicable data protection laws
        
        Please review our Privacy Policy for detailed information.`,
      },
      {
        title: 'Limitation of Liability',
        icon: AlertTriangle,
        content: `To the maximum extent permitted by law:
        
        • LegalMate is not liable for lawyers' actions or advice
        • We do not guarantee outcomes of legal matters
        • We are not responsible for third-party content or services
        • Our liability is limited to the amount you paid us
        • We are not liable for indirect or consequential damages
        • Some jurisdictions may not allow these limitations
        
        Use of the Platform is at your own risk. Services are provided "as is" without warranties.`,
      },
      {
        title: 'Termination',
        icon: XCircle,
        content: `Account Termination:
        • You may close your account at any time
        • We may suspend or terminate accounts for violations
        • Termination does not affect existing obligations
        • Outstanding fees remain due after termination
        • Certain provisions survive termination
        
        We reserve the right to:
        • Refuse service to anyone
        • Terminate accounts without notice for serious violations
        • Modify or discontinue services`,
      },
      {
        title: 'Dispute Resolution',
        icon: Scale,
        content: `If disputes arise:
        
        • Contact us first to resolve informally
        • Mediation may be required before litigation
        • Arbitration provisions may apply
        • Class action waivers may be in effect
        • Governing law is specified below
        
        You agree to:
        • Attempt good faith resolution
        • Provide notice of disputes
        • Participate in resolution processes`,
      },
      {
        title: 'Changes to Terms',
        icon: FileText,
        content: `We may modify these terms:
        
        • Changes will be posted on this page
        • Material changes will be notified via email
        • Continued use constitutes acceptance
        • Review terms periodically
        
        If you don't agree to changes, stop using the Platform.`,
      },
      {
        title: 'Governing Law',
        icon: Scale,
        content: `These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict of law principles. 
        
        You agree to submit to the jurisdiction of courts in [Your Jurisdiction] for any disputes arising from these Terms or your use of the Platform.`,
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
            <Scale className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Terms & Conditions
            </h1>
            <p className="text-xl text-primary-100 max-w-3xl mx-auto">
              Please read these terms carefully before using our services
            </p>
            {displayContent.lastUpdated && (
              <div className="mt-6 space-y-1">
                <p className="text-primary-200">Last Updated: {displayContent.lastUpdated}</p>
                {displayContent.effectiveDate && (
                  <p className="text-primary-200">Effective Date: {displayContent.effectiveDate}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Important Notice */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-secondary-900 mb-2">Important Notice</h3>
              <p className="text-secondary-700 text-sm">
                These Terms and Conditions constitute a legal agreement between you and LegalMate. 
                By using our Platform, you agree to be bound by these terms. Please read them carefully 
                and contact us if you have any questions.
              </p>
            </div>
          </div>
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
                    <div>
                      <span className="text-sm font-semibold text-primary-600">Section {index + 1}</span>
                      <h2 className="text-2xl font-bold text-secondary-900">
                        {section.title}
                      </h2>
                    </div>
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
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">Questions About These Terms?</h3>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              If you have any questions or concerns about these Terms and Conditions, 
              please contact our legal team.
            </p>
            <div className="space-y-2 text-primary-100 mb-6">
              <p><strong className="text-white">Email:</strong> legalmate.services@gmail.com</p>
              <p><strong className="text-white">Phone:</strong> +923177099128</p>
            </div>
            <a
              href="/contact"
              className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-secondary-100 transition-colors"
            >
              Contact Legal Team
            </a>
          </div>
        </div>

        {/* Acceptance Confirmation */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start">
            <CheckCircle className="h-6 w-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-secondary-900 mb-2">Acceptance of Terms</h4>
              <p className="text-secondary-700 text-sm">
                By creating an account or using any part of the LegalMate Platform, you acknowledge 
                that you have read, understood, and agree to be bound by these Terms and Conditions, 
                as well as our Privacy Policy.
              </p>
            </div>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="/privacy"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow group"
          >
            <h4 className="font-semibold text-secondary-900 mb-2 group-hover:text-primary-600 transition-colors">
              Privacy Policy
            </h4>
            <p className="text-sm text-secondary-600">
              Learn how we protect and handle your data
            </p>
          </a>
          <a
            href="/contact"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow group"
          >
            <h4 className="font-semibold text-secondary-900 mb-2 group-hover:text-primary-600 transition-colors">
              Contact Support
            </h4>
            <p className="text-sm text-secondary-600">
              Get help with any questions or concerns
            </p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default TermsConditionsPage;
