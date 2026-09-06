import React, { useState, useEffect } from 'react';
import { pagesAPI } from '../../services/api';
import {
    Edit, CheckCircle, XCircle, Loader2, FileText, Save
} from 'lucide-react';
import toast from 'react-hot-toast';

const PagesManagement = () => {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPage, setSelectedPage] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        content: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            setLoading(true);
            const response = await pagesAPI.getAllPages();
            setPages(response.data.pages);

            // Select first page by default if available
            if (response.data.pages.length > 0) {
                handleSelectPage(response.data.pages[0]);
            }
        } catch (error) {
            console.error('Error fetching pages:', error);
            toast.error('Failed to load pages');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPage = (page) => {
        setSelectedPage(page);
        setFormData({
            title: page.title,
            content: page.content
        });
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
        if (!selectedPage) return;

        try {
            setSaving(true);
            await pagesAPI.updatePage(selectedPage.name, formData);
            toast.success('Page updated successfully');

            // Update local state
            setPages(pages.map(p =>
                p.name === selectedPage.name ? { ...p, ...formData } : p
            ));
        } catch (error) {
            console.error('Error saving page:', error);
            toast.error('Failed to save page');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-bold text-secondary-900">Pages Management</h2>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Pages List */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
                        <div className="p-4 border-b border-secondary-200 bg-secondary-50">
                            <h3 className="font-semibold text-secondary-700">Select Page</h3>
                        </div>
                        <div className="divide-y divide-secondary-200">
                            {(pages || []).map((page) => (
                                <button
                                    key={page._id}
                                    onClick={() => handleSelectPage(page)}
                                    className={`w-full text-left px-4 py-3 hover:bg-secondary-50 transition-colors flex items-center justify-between ${selectedPage?.name === page.name ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                                        }`}
                                >
                                    <span className={`text-sm font-medium ${selectedPage?.name === page.name ? 'text-primary-700' : 'text-secondary-700'}`}>
                                        {page.name.charAt(0).toUpperCase() + page.name.slice(1).replace('-', ' ')}
                                    </span>
                                    {selectedPage?.name === page.name && <CheckCircle className="h-4 w-4 text-primary-500" />}
                                </button>
                            ))}
                            {pages.length === 0 && (
                                <div className="p-4 text-center text-secondary-500 text-sm">
                                    No pages found.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
                        {selectedPage ? (
                            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                                <div className="p-6 border-b border-secondary-200 bg-secondary-50 flex justify-between items-center">
                                    <h3 className="font-semibold text-secondary-700 flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Editing: {selectedPage.name}
                                    </h3>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" /> Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1">Page Title</label>
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
                                        <label className="block text-sm font-medium text-secondary-700 mb-1">Content (Markdown supported)</label>
                                        <textarea
                                            name="content"
                                            value={formData.content}
                                            onChange={handleInputChange}
                                            rows="15"
                                            className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                                            required
                                        ></textarea>
                                        <p className="mt-2 text-xs text-secondary-500">
                                            You can use Markdown for formatting. HTML is also supported but sanitized.
                                        </p>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-secondary-400">
                                <FileText className="h-16 w-16 mb-4 opacity-20" />
                                <p>Select a page to edit content</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PagesManagement;
