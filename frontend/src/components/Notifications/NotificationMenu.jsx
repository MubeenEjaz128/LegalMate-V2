import React, { useState, useEffect, useRef } from 'react';
import { Bell, Calendar, CheckCircle, AlertCircle, Clock, X, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { appointmentAPI, chatAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Badge } from '../UI';

const NotificationMenu = () => {
    const { user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch appointments to derive notifications
            const apptParams = user.role === 'admin' ? {} : {};
            const [apptResponse, chatResponse] = await Promise.allSettled([
                appointmentAPI.list(apptParams),
                user.role === 'lawyer'
                    ? chatAPI.getHistoryForLawyer(user._id)
                    : chatAPI.getHistory(user._id)
            ]);

            const appointments = apptResponse.status === 'fulfilled' ? apptResponse.value.data || [] : [];
            const chats = chatResponse.status === 'fulfilled' ? chatResponse.value.data || [] : [];

            const generatedNotifications = [];
            const now = new Date();

            // 1. Upcoming Meetings (Next 24 hours)
            const upcomingAppointments = appointments.filter(apt => {
                const aptDate = new Date(`${apt.date}T${apt.time}`);
                const diffHours = (aptDate - now) / (1000 * 60 * 60);
                return apt.status === 'confirmed' && diffHours > 0 && diffHours <= 24;
            });

            upcomingAppointments.forEach(apt => {
                generatedNotifications.push({
                    id: `upcoming-${apt._id}`,
                    type: 'upcoming',
                    title: 'Upcoming Meeting',
                    message: `Meeting with ${user.role === 'client' ? apt.lawyer?.name : apt.client?.name} at ${apt.time}`,
                    time: new Date(`${apt.date}T${apt.time}`),
                    link: `/consultation/${apt._id}`,
                    read: false
                });
            });

            // 2. Client Updates (Status changes or pending actions)
            if (user.role === 'client') {
                // Show rejected or completed recently
                const recentUpdates = appointments.filter(apt => {
                    // Assume "recent" is calculated via logic or we just show important statuses
                    // Since we don't have exact updatedAt, we'll focus on status
                    return apt.status === 'rejected';
                });

                recentUpdates.forEach(apt => {
                    generatedNotifications.push({
                        id: `update-${apt._id}`,
                        type: 'alert',
                        title: 'Appointment Update',
                        message: `Appointment with ${apt.lawyer?.name} was rejected`,
                        time: new Date(apt.date), // Approximate
                        link: '/appointments',
                        read: false
                    });
                });
            }

            // 3. Lawyer Pending Requests
            if (user.role === 'lawyer') {
                const pending = appointments.filter(apt => apt.status === 'pending');
                pending.forEach(apt => {
                    generatedNotifications.push({
                        id: `pending-${apt._id}`,
                        type: 'info',
                        title: 'New Request',
                        message: `New request from ${apt.client?.name}`,
                        time: new Date(apt.date),
                        link: '/appointments',
                        read: false
                    });
                });
            }

            // 4. Unread Chat Messages
            chats.forEach(chat => {
                if (chat.unreadCount > 0) {
                    const senderName = user.role === 'client' ? chat.lawyer?.name : chat.client?.name;
                    generatedNotifications.push({
                        id: `chat-${chat.conversationId}`,
                        type: 'message',
                        title: 'New Message',
                        message: `You have ${chat.unreadCount} unread message${chat.unreadCount > 1 ? 's' : ''} from ${senderName || 'User'}`,
                        time: new Date(chat.updatedAt),
                        link: '/chat', // Ideally link to specific chat, but /chat is safer for now if routing is complex
                        read: false
                    });
                }
            });

            // Sort by time (most recent/upcoming first)
            generatedNotifications.sort((a, b) => b.time - a.time);
            setNotifications(generatedNotifications);

        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [isOpen, user?._id]);

    const unreadCount = notifications.length;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 focus:outline-none"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-error-500 rounded-full text-[10px] text-white flex items-center justify-center border border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-strong py-2 z-50 border border-secondary-100 flex flex-col max-h-[400px] animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="px-4 py-3 border-b border-secondary-100 flex justify-between items-center">
                        <h3 className="font-semibold text-secondary-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <Badge variant="info" size="xs">{unreadCount} new</Badge>
                        )}
                    </div>

                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {loading ? (
                            <div className="p-8 text-center text-secondary-400 text-sm">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-secondary-400 text-sm flex flex-col items-center">
                                <Bell className="w-8 h-8 mb-2 opacity-50" />
                                No new notifications
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <Link
                                    key={notif.id}
                                    to={notif.link}
                                    onClick={() => setIsOpen(false)}
                                    className="block px-4 py-3 hover:bg-secondary-50 transition-colors border-b border-secondary-50 last:border-0"
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${notif.type === 'upcoming' ? 'bg-primary-100 text-primary-600' :
                                                notif.type === 'alert' ? 'bg-red-100 text-red-600' :
                                                    notif.type === 'message' ? 'bg-green-100 text-green-600' :
                                                        'bg-yellow-100 text-yellow-600'
                                            }`}>
                                            {notif.type === 'upcoming' ? <Clock className="w-4 h-4" /> :
                                                notif.type === 'alert' ? <AlertCircle className="w-4 h-4" /> :
                                                    notif.type === 'message' ? <MessageCircle className="w-4 h-4" /> :
                                                        <Calendar className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-secondary-900">{notif.title}</p>
                                            <p className="text-xs text-secondary-600 mt-0.5 line-clamp-2">{notif.message}</p>
                                            <p className="text-[10px] text-secondary-400 mt-1.5">
                                                {notif.time.toLocaleDateString()} • {notif.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>

                    <div className="p-2 border-t border-secondary-100 bg-secondary-50 rounded-b-2xl">
                        <Link to="/appointments" onClick={() => setIsOpen(false)} className="block text-center text-xs font-medium text-primary-600 hover:text-primary-700 py-1">
                            View all appointments
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationMenu;
