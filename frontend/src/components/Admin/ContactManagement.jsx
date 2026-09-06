import React, { useState, useEffect } from 'react';
import { contactAPI } from '../../services/api';
import {
    Mail, Trash2, Search, CheckCircle, XCircle,
    Loader2, Reply, Clock, User
} from 'lucide-react';
import toast from 'react-hot-toast';

const ContactManagement = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [filters, setFilters] = useState({ status: 'all', page: 1 });

    useEffect(() => {
        fetchMessages();
    }, [filters]);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const response = await contactAPI.getMessages({
                page: filters.page,
                limit: 10,
                status: filters.status
            });
            setMessages(response.data.messages);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    const handleViewMessage = async (message) => {
        setSelectedMessage(message);
        setReplyText('');

        // Mark as read if unread
        if (message.status === 'unread') {
            try {
                await contactAPI.getMessage(message._id);
                // Update local state
                setMessages(messages.map(m =>
                    m._id === message._id ? { ...m, status: 'read' } : m
                ));
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        }
    };

    const handleCloseModal = () => {
        setSelectedMessage(null);
        setReplyText('');
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        try {
            setSendingReply(true);
            await contactAPI.replyMessage(selectedMessage._id, { replyMessage: replyText });
            toast.success('Reply sent successfully');

            // Update local state
            setMessages(messages.map(m =>
                m._id === selectedMessage._id ? {
                    ...m,
                    status: 'replied',
                    reply: {
                        message: replyText,
                        repliedAt: new Date()
                    }
                } : m
            ));

            handleCloseModal();
        } catch (error) {
            console.error('Error sending reply:', error);
            toast.error('Failed to send reply');
        } finally {
            setSendingReply(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this message?')) return;

        try {
            await contactAPI.deleteMessage(id);
            toast.success('Message deleted successfully');
            fetchMessages();
            if (selectedMessage && selectedMessage._id === id) {
                handleCloseModal();
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error('Failed to delete message');
        }
    };

    const handlePageChange = (newPage) => {
        setFilters({ ...filters, page: newPage });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-secondary-900">Contact Messages</h2>
            </div>

            {/* Filters */}
            <div className="flex gap-4 bg-white p-4 rounded-lg border border-secondary-200">
                <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                    className="px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                    <option value="all">All Messages</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Messages List */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden flex flex-col h-[400px] sm:h-[500px] lg:h-[600px]">
                        <div className="overflow-y-auto flex-1">
                            {messages.length === 0 ? (
                                <div className="p-6 text-center text-secondary-500">
                                    No messages found.
                                </div>
                            ) : (
                                <div className="divide-y divide-secondary-200">
                                    {(messages || []).map((message) => (
                                        <div
                                            key={message._id}
                                            onClick={() => handleViewMessage(message)}
                                            className={`p-4 cursor-pointer hover:bg-secondary-50 transition-colors ${selectedMessage?._id === message._id ? 'bg-primary-50' : ''
                                                } ${message.status === 'unread' ? 'border-l-4 border-primary-500' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-sm font-medium ${message.status === 'unread' ? 'text-secondary-900 font-bold' : 'text-secondary-700'}`}>
                                                    {message.name}
                                                </h4>
                                                <span className="text-xs text-secondary-500">
                                                    {new Date(message.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className={`text-sm mb-1 ${message.status === 'unread' ? 'text-secondary-900 font-semibold' : 'text-secondary-600'}`}>
                                                {message.subject}
                                            </p>
                                            <p className="text-xs text-secondary-500 line-clamp-2">
                                                {message.message}
                                            </p>
                                            <div className="mt-2 flex justify-between items-center">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${message.status === 'replied' ? 'bg-green-100 text-green-800' :
                                                    message.status === 'read' ? 'bg-secondary-100 text-secondary-800' :
                                                        'bg-primary-100 text-primary-800'
                                                    }`}>
                                                    {message.status}
                                                </span>
                                                <button
                                                    onClick={(e) => handleDelete(message._id, e)}
                                                    className="text-secondary-400 hover:text-error-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="p-3 border-t border-secondary-200 flex justify-between items-center bg-secondary-50">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="text-xs px-2 py-1 border rounded bg-white disabled:opacity-50"
                                >
                                    Prev
                                </button>
                                <span className="text-xs text-secondary-600">
                                    {pagination.page} / {pagination.pages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.pages}
                                    className="text-xs px-2 py-1 border rounded bg-white disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Message Detail */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-secondary-200 h-[400px] sm:h-[500px] lg:h-[600px] flex flex-col">
                        {selectedMessage ? (
                            <>
                                <div className="p-3 sm:p-6 border-b border-secondary-200 flex justify-between items-start gap-2">
                                    <div className="min-w-0">
                                        <h3 className="text-lg sm:text-xl font-bold text-secondary-900 mb-2 truncate">{selectedMessage.subject}</h3>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-secondary-600">
                                            <span className="flex items-center gap-1">
                                                <User className="h-4 w-4" /> {selectedMessage.name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-4 w-4" /> {selectedMessage.email}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" /> {new Date(selectedMessage.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={handleCloseModal} className="lg:hidden text-secondary-400">
                                        <XCircle className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="bg-secondary-50 p-4 rounded-lg mb-6">
                                        <p className="whitespace-pre-wrap text-secondary-800">{selectedMessage.message}</p>
                                    </div>

                                    {selectedMessage.reply && (
                                        <div className="bg-primary-50 p-4 rounded-lg mb-6 border border-primary-100">
                                            <h4 className="text-sm font-bold text-primary-900 mb-2 flex items-center gap-2">
                                                <Reply className="h-4 w-4" /> Reply from Admin
                                            </h4>
                                            <p className="whitespace-pre-wrap text-secondary-800">{selectedMessage.reply.message}</p>
                                            <p className="text-xs text-primary-600 mt-2">
                                                Sent on {new Date(selectedMessage.reply.repliedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 border-t border-secondary-200">
                                    {!selectedMessage.reply ? (
                                        <form onSubmit={handleReply}>
                                            <label className="block text-sm font-medium text-secondary-700 mb-2">Reply</label>
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                rows="4"
                                                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-3"
                                                placeholder="Type your reply here..."
                                                required
                                            ></textarea>
                                            <div className="flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={sendingReply}
                                                    className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors disabled:opacity-50"
                                                >
                                                    {sendingReply ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Reply className="h-4 w-4" /> Send Reply
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="text-center text-secondary-500 italic">
                                            This message has been replied to.
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-secondary-400 p-6">
                                <Mail className="h-16 w-16 mb-4 opacity-20" />
                                <p>Select a message to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactManagement;
