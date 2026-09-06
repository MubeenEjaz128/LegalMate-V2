import React, { useState, useEffect } from 'react';
import { faqsAPI } from '../services/api';
import { ChevronDown, ChevronUp, Search, Loader2, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const FAQPage = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['All', 'General', 'Account', 'Appointments', 'Payments', 'Legal Services', 'Technical'];

  useEffect(() => {
    fetchFAQs();
  }, [selectedCategory]);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      const response = await faqsAPI.getFAQs(params);
      setFaqs(response.data.faqs);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      toast.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-800 text-white">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-60 w-60 rounded-full bg-accent-400/10 blur-3xl" />
        <div className="relative container-custom py-16 lg:py-20">
          <div className="text-center">
            <div className="flex justify-center mb-5">
              <HelpCircle className="h-14 w-14 text-primary-300" />
            </div>
            <h1 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-secondary-300 sm:text-lg">
              Find answers to common questions about our services, appointments, and more
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search FAQs..."
              className="w-full pl-12 pr-4 py-4 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category === 'All' ? 'all' : category)}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${(category === 'All' && selectedCategory === 'all') || category === selectedCategory
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-secondary-700 hover:bg-secondary-100 shadow-sm'
                }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQs */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFAQs.map((faq, index) => (
              <div
                key={faq._id}
                className="bg-white rounded-lg shadow-md overflow-hidden border border-secondary-200 hover:shadow-lg transition-shadow"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-secondary-50 transition-colors text-left"
                >
                  <span className="font-semibold text-secondary-900 pr-4">
                    {faq.question}
                  </span>
                  <div className="flex-shrink-0">
                    {openIndex === index ? (
                      <ChevronUp className="h-5 w-5 text-primary-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-secondary-500" />
                    )}
                  </div>
                </button>

                {openIndex === index && (
                  <div className="px-6 pb-5 text-secondary-600 border-t border-secondary-100 pt-4 animate-fadeIn">
                    <p className="leading-relaxed">{faq.answer}</p>
                    {faq.category && (
                      <span className="inline-block mt-3 text-xs px-3 py-1 bg-primary-50 text-primary-600 rounded-full">
                        {faq.category}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {filteredFAQs.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow-md">
                <HelpCircle className="h-16 w-16 text-secondary-300 mx-auto mb-4" />
                <p className="text-secondary-500 text-lg">No FAQs found matching your search.</p>
                <p className="text-secondary-400 text-sm mt-2">Try different keywords or browse all categories.</p>
              </div>
            )}
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-12 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-8 text-center border border-primary-200">
          <h3 className="text-2xl font-bold text-secondary-900 mb-4">
            Still have questions?
          </h3>
          <p className="text-secondary-600 mb-6 max-w-2xl mx-auto">
            Can't find the answer you're looking for? Please reach out to our friendly support team. We're here to help!
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/contact"
              className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg"
            >
              Contact Support
            </a>
            <button
              onClick={() => window.dispatchEvent(new Event('open-floating-chatbot'))}
              className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-secondary-50 transition-colors shadow-md hover:shadow-lg border border-primary-600"
            >
              Ask AI Assistant
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="/services" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center group">
            <h4 className="font-semibold text-secondary-900 mb-2 group-hover:text-primary-600 transition-colors">
              Our Services
            </h4>
            <p className="text-sm text-secondary-600">
              Learn about what we offer
            </p>
          </a>
          <a href="/search" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center group">
            <h4 className="font-semibold text-secondary-900 mb-2 group-hover:text-primary-600 transition-colors">
              Book Appointment
            </h4>
            <p className="text-sm text-secondary-600">
              Schedule a consultation
            </p>
          </a>
          <a href="/about" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center group">
            <h4 className="font-semibold text-secondary-900 mb-2 group-hover:text-primary-600 transition-colors">
              About Us
            </h4>
            <p className="text-sm text-secondary-600">
              Know more about our team
            </p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
