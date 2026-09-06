import React, { useState, useEffect } from 'react';
import { authAPI } from '../../services/api'
import { Link } from 'react-router-dom';
import { getProfilePictureUrl } from '../../utils/imageUtils'
import {
  Calendar,
  MessageCircle,
  Search,
  Clock,
  Video,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  BarChart3,
  Activity,
  Star
} from 'lucide-react';
import { appointmentAPI, chatAPI, balanceAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Card, Button, Badge } from '../UI';
import ClientAppointmentsList from '../Appointments/ClientAppointmentsList';
import ClientStatsModal from './ClientStatsModal';
import VideoCall from '../VideoCall/VideoCall';
import MeetingJoinPopup from '../Meeting/MeetingJoinPopup';

const ClientDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    appointments: 0,
    upcomingAppointments: 0,
    totalSpent: 0,
    pkrBalance: 0,
    recentChats: [],
  });
  const [loading, setLoading] = useState(true);

  // Video call state
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [currentCallId, setCurrentCallId] = useState(null);

  // Stats modal state
  const [showStatsModal, setShowStatsModal] = useState(false);

  // PKR balance refresh function
  const refreshPkrBalance = async () => {
    try {
      const balanceRes = await balanceAPI.getBalance();
      setStats(prevStats => ({
        ...prevStats,
        pkrBalance: balanceRes.data?.balancePkr || 0
      }));
    } catch (error) {
      console.error('Error refreshing PKR balance:', error);
    }
  };

  const getAppointmentValue = (apt) => {
    return Number(apt?.amount) || Number(apt?.lawyer?.hourlyRate) || 0;
  };

  const isSpendableAppointment = (apt) => {
    const excludedStatuses = ['cancelled', 'rejected'];
    return apt && !excludedStatuses.includes((apt.status || '').toLowerCase());
  };

  const upcomingAppointments = appointments?.filter(
    (apt) => new Date(apt.date + ' ' + apt.time) > new Date() && apt.status === 'confirmed'
  ) || [];

  const pendingAppointments = appointments?.filter((apt) => apt.status === 'pending') || [];

  const pastAppointments = appointments?.filter(
    (apt) => new Date(apt.date + ' ' + apt.time) < new Date()
  ) || [];

  useEffect(() => {
    let isMounted = true;

    const fetchAllDashboardData = async () => {
      setLoading(true);
      setAppointmentsLoading(true);
      try {
        const [appointmentsRes, chatRes, balanceRes] = await Promise.all([
          appointmentAPI.list().catch(() => ({ data: [] })),
          chatAPI.getHistory(user._id).catch(() => ({ data: [] })),
          balanceAPI.getBalance().catch(() => ({ data: { balancePkr: 0 } }))
        ]);

        if (!isMounted) return;

        const fetchedAppointments = appointmentsRes.data || [];
        setAppointments(fetchedAppointments);

        const upcomingCount = fetchedAppointments.filter(
          apt => new Date(apt.date + ' ' + apt.time) > new Date() && apt.status === 'confirmed'
        ).length;
        const spendableAppointments = fetchedAppointments.filter(isSpendableAppointment);
        const totalSpent = spendableAppointments.reduce((total, apt) => total + getAppointmentValue(apt), 0);

        setStats({
          appointments: fetchedAppointments.length,
          upcomingAppointments: upcomingCount,
          totalSpent,
          pkrBalance: balanceRes.data?.balancePkr || 0,
          recentChats: (chatRes.data || []).slice(0, 3)
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        if (isMounted) setAppointments([]);
      } finally {
        if (isMounted) {
          setLoading(false);
          setAppointmentsLoading(false);
        }
      }
    };

    if (user?._id) {
      fetchAllDashboardData();
    }

    return () => { isMounted = false; };
  }, [user._id]);

  // Video call handlers
  const handleJoinVideoCall = (appointmentId) => {
    setCurrentCallId(appointmentId);
    setShowVideoCall(true);
  };

  const handleCloseVideoCall = () => {
    setShowVideoCall(false);
    setCurrentCallId(null);
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <div className="bg-white border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <img
                src={getProfilePictureUrl(user.profilePicture, 'client')}
                alt="Profile"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-secondary-900 truncate">Welcome back, {user.name}!</h1>
                <p className="text-secondary-600 text-sm">Manage your legal consultations</p>
              </div>
            </div>
            <Link to="/search" className="self-end sm:self-auto">
              <Button className="flex items-center space-x-2 text-sm">
                <Plus className="w-4 h-4" />
                <span>Find Lawyer</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-6 hover:shadow-lg transition-shadow group-hover:border-primary-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Total Appointments</p>
                <p className="text-2xl font-bold text-secondary-900">{loading ? '...' : stats.appointments}</p>
              </div>
              <Calendar className="w-8 h-8 text-primary-600" />
            </div>
          </Card>


          <Card className="p-6 hover:shadow-lg transition-shadow group-hover:border-primary-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-secondary-600">PKR Balance</p>
                  <button
                    onClick={refreshPkrBalance}
                    className="text-xs text-primary-600 hover:text-primary-700"
                    title="Refresh balance"
                  >
                    Refresh
                  </button>
                </div>
                <p className="text-2xl font-bold text-secondary-900">
                  ₨{loading ? '...' : (stats.pkrBalance || 0).toLocaleString()}
                </p>
              </div>
              <Activity className="w-8 h-8 text-orange-600" />
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow group-hover:border-primary-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Total Spent</p>
                <p className="text-2xl font-bold text-secondary-900">PKR {loading ? '...' : stats.totalSpent.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link to="/search" className="group">
            <Card className="p-6 hover:shadow-lg transition-shadow group-hover:border-primary-300">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary-100 rounded-full">
                  <Search className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-900">Find Lawyers</h3>
                  <p className="text-sm text-secondary-600">Browse verified legal experts</p>
                </div>
                <ArrowRight className="w-5 h-5 text-secondary-400 group-hover:text-primary-600" />
              </div>
            </Card>
          </Link>

          <Link to="/balance" className="group">
            <Card className="p-6 hover:shadow-lg transition-shadow group-hover:border-orange-300">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-900">Balance</h3>
                  <p className="text-sm text-secondary-600">Manage your PKR balance</p>
                </div>
                <ArrowRight className="w-5 h-5 text-secondary-400 group-hover:text-orange-600" />
              </div>
            </Card>
          </Link>

          <Link to="/chat" className="group">
            <Card className="p-6 hover:shadow-lg transition-shadow group-hover:border-green-300">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-900">Messages</h3>
                  <p className="text-sm text-secondary-600">Chat with your lawyers</p>
                </div>
                <ArrowRight className="w-5 h-5 text-secondary-400 group-hover:text-green-600" />
              </div>
            </Card>
          </Link>

          <Link to="/appointments" className="group">
            <Card className="p-6 hover:shadow-lg transition-shadow group-hover:border-purple-300">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Video className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-900">Appointments</h3>
                  <p className="text-sm text-secondary-600">Manage your meetings</p>
                </div>
                <ArrowRight className="w-5 h-5 text-secondary-400 group-hover:text-purple-600" />
              </div>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Appointments */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary-900">Recent Appointments</h3>
              <Link to="/appointments" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View all
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                    <div className="flex-1">
                      <div className="h-4 bg-secondary-300 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-secondary-300 rounded w-2/3"></div>
                    </div>
                    <div className="h-8 w-16 bg-secondary-300 rounded"></div>
                  </div>
                ))}
              </div>
            ) : appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments
                  .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
                  .slice(0, 3)
                  .map((appointment) => (
                    <div key={appointment._id} className="flex items-start justify-between p-3 bg-primary-50 rounded-lg">
                      <div className="pr-3">
                        <p className="font-medium text-secondary-900">
                          {appointment.lawyer?.name || 'Consultation'}
                        </p>
                        <p className="text-sm text-secondary-600">
                          {new Date(appointment.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })} at {appointment.time} • {appointment.consultationType === 'video' ? 'Video Call' : 'In Person'}
                        </p>

                        {/* NEW: Show rejection reason for rejected status */}
                        {appointment.status === 'rejected' && (
                          <div className="mt-2 p-3 rounded-md border border-red-200 bg-error-50">
                            <p className="text-sm text-error-700">
                              <strong>Rejection reason: </strong>
                              {appointment.rejectionReason || 'Not provided'}
                            </p>
                            {appointment.rejectedAt && (
                              <p className="mt-1 text-xs text-error-500">
                                {new Date(appointment.rejectedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}

                        {appointment.description && (
                          <p className="text-xs text-secondary-500 mt-1 truncate">
                            {appointment.description}
                          </p>
                        )}
                        <p className="text-xs font-medium mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              appointment.status === 'completed' ? 'bg-primary-100 text-primary-700' :
                                appointment.status === 'rejected' ? 'bg-error-100 text-error-700' :
                                  'bg-secondary-100 text-secondary-700'
                            }`}>
                            {appointment.status}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-col space-y-2">
                        {appointment.status === 'confirmed' &&
                          appointment.consultationType === 'video' &&
                          new Date(appointment.date + ' ' + appointment.time) > new Date() && (
                            <button
                              onClick={() => handleJoinVideoCall(appointment._id)}
                              className="btn-primary btn-sm flex items-center space-x-1"
                            >
                              <Video className="w-4 h-4" />
                              <span>Join</span>
                            </button>
                          )}
                        <Link
                          to={`/consultation/${appointment._id}`}
                          className="btn-secondary btn-sm text-center"
                        >
                          Details
                        </Link>
                        {appointment.status === 'completed' && !appointment.feedback && (
                          <Link
                            to={`/feedback/${appointment._id}`}
                            className="btn-primary btn-sm text-center bg-yellow-600 hover:bg-yellow-700 text-white"
                          >
                            Give Feedback
                          </Link>
                        )}
                        {appointment.status === 'completed' && appointment.feedback && (
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 text-yellow-600">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${star <= appointment.feedback.rating ? 'fill-current' : ''}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-secondary-500">Feedback given</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                <p className="text-secondary-600">No appointments yet</p>
                <Link to="/search">
                  <Button size="sm" className="mt-2">Book Consultation</Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Recent Conversations */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary-900">Recent Conversations</h3>
              <Link to="/chat" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View all
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex items-center space-x-3">
                    <div className="w-10 h-10 bg-secondary-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-secondary-300 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-secondary-300 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : stats.recentChats.length > 0 ? (
              <div className="space-y-3">
                {stats.recentChats.map(chat => (
                  <Link
                    key={chat._id}
                    to="/chat"
                    state={{ selectedConversationId: chat._id, selectedLawyer: chat.lawyer }}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {chat.lawyer?.name?.charAt(0) || 'L'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-secondary-900 truncate">{chat.lawyer?.name || 'Lawyer'}</p>
                      <p className="text-sm text-secondary-600 truncate">{chat.lastMessage || 'Start conversation'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                <p className="text-secondary-600">No conversations yet</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary-900">Quick Stats</h3>
              <button
                onClick={() => setShowStatsModal(true)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View details
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-secondary-900">Completed Consultations</span>
                </div>
                <Badge variant="success">{loading ? '...' : pastAppointments.length}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-secondary-900">Pending Confirmations</span>
                </div>
                <Badge variant="warning">{loading ? '...' : pendingAppointments.length}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-5 h-5 text-primary-600" />
                  <span className="font-medium text-secondary-900">This Month</span>
                </div>
                <Badge variant="info">{loading ? '...' : appointments.filter(apt => {
                  const appointmentDate = new Date(apt.date);
                  const currentDate = new Date();
                  return appointmentDate.getMonth() === currentDate.getMonth() &&
                    appointmentDate.getFullYear() === currentDate.getFullYear();
                }).length}</Badge>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary-900">Recent Appointments</h3>
              <Link to="/appointments" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View all
              </Link>
            </div>
            <ClientAppointmentsList
              appointments={appointments.slice(0, 3)}
              onJoinVideoCall={handleJoinVideoCall}
            />

          </Card>
        </div>
      </div>

      {/* Video Call Modal */}
      {showVideoCall && currentCallId && (
        <VideoCall
          consultationId={currentCallId}
          userRole="client"
          onClose={handleCloseVideoCall}
        />
      )}

      {/* Meeting Join Popup — shows when lawyer is waiting */}
      {!showVideoCall && <MeetingJoinPopup onJoinCall={handleJoinVideoCall} />}

      {/* Stats Modal */}
      <ClientStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        stats={stats}
        appointments={appointments}
        user={user}
      />
    </div>
  );
};

export default ClientDashboard;
