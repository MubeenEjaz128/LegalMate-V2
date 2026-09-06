import React, { useState, useEffect } from 'react';
import { faqsAPI } from '../../services/api';
import {
    Plus, Edit, Trash2, Search, CheckCircle, XCircle,
    Loader2, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const FAQsManagement = () => {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFAQ, setEditingFAQ] = useState(null);
    const [formData, setFormData] = useState({
        question: '',
        answer: '',
        category: 'General',
        order: 0,
        isActive: true
    });
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

    const categories = ['General', 'Account', 'Payments', 'Legal', 'Technical'];

    useEffect(() => {
        fetchFAQs();
    }, []);

    const fetchFAQs = async () => {
        try {
            setLoading(true);
            const response = await faqsAPI.getAllFAQs({ limit: 100 }); // Get all for admin
            setFaqs(response.data.faqs);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching FAQs:', error);
            toast.error('Failed to load FAQs');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (faq = null) => {
        if (faq) {
            setEditingFAQ(faq);
            setFormData({
                question: faq.question,
                answer: faq.answer,
                category: faq.category || 'General',
                order: faq.order,
                isActive: faq.isActive
            });
        } else {
            setEditingFAQ(null);
            setFormData({
                question: '',
                answer: '',
                category: 'General',
                order: 0,
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingFAQ(null);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingFAQ) {
                await faqsAPI.updateFAQ(editingFAQ._id, formData);
                toast.success('FAQ updated successfully');
            } else {
                await faqsAPI.createFAQ(formData);
                toast.success('FAQ created successfully');
            }
            handleCloseModal();
            fetchFAQs();
        } catch (error) {
            console.error('Error saving FAQ:', error);
            toast.error(error.response?.data?.message || 'Failed to save FAQ');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this FAQ?')) return;

        try {
            await faqsAPI.deleteFAQ(id);
            toast.success('FAQ deleted successfully');
            fetchFAQs();
        } catch (error) {
            console.error('Error deleting FAQ:', error);
            toast.error('Failed to delete FAQ');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-secondary-900">FAQs Management</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Add FAQ
                </button>
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Order</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Question</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {faqs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-secondary-500">
                                            No FAQs found. Create one to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    (faqs || []).map((faq) => (
                                        <tr key={faq._id} className="hover:bg-secondary-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                                {faq.order}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-secondary-900">{faq.question}</div>
                                                <div className="text-xs text-secondary-500 line-clamp-1 mt-1">{faq.answer}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-secondary-100 text-secondary-800">
                                                    {faq.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${faq.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {faq.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleOpenModal(faq)}
                                                    className="text-primary-600 hover:text-primary-900 mr-4"
                                                >
                                                    <Edit className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(faq._id)}
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
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        <div className="p-3 sm:p-6 border-b border-secondary-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-secondary-900">
                                {editingFAQ ? 'Edit FAQ' : 'Add New FAQ'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-secondary-400 hover:text-secondary-500">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Question</label>
                                <input
                                    type="text"
                                    name="question"
                                    value={formData.question}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Answer</label>
                                <textarea
                                    name="answer"
                                    value={formData.answer}
                                    onChange={handleInputChange}
                                    rows="4"
                                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    required
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Order</label>
                                    <input
                                        type="number"
                                        name="order"
                                        value={formData.order}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-secondary-700">Active</span>
                                </label>
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
                                    {editingFAQ ? 'Update FAQ' : 'Create FAQ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FAQsManagement;
