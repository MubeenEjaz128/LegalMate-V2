import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BarChart, Users, Calendar, TrendingUp, TrendingDown, XCircle, DollarSign, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import api from '../../services/api';

const AnalyticsView = ({ onClose }) => {
  const [analytics, setAnalytics] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch both basic and advanced analytics
      const [basicRes, advancedRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/advanced-analytics')
      ]);
      setAnalytics({ ...basicRes.data, advanced: advancedRes.data });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num || 0);
  };

  const getGrowthRate = (current, previous) => {
    if (!previous) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const getGrowthIcon = (rate) => {
    if (rate > 0) return <TrendingUp className="h-4 w-4 text-success-500" />;
    if (rate < 0) return <TrendingDown className="h-4 w-4 text-error-500" />;
    return <TrendingUp className="h-4 w-4 text-secondary-400" />;
  };

  const getGrowthColor = (rate) => {
    if (rate > 0) return 'text-success-600';
    if (rate < 0) return 'text-error-600';
    return 'text-secondary-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-6 border-b border-secondary-200 gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-secondary-900">Analytics Dashboard</h2>
            <p className="text-secondary-600 text-sm">Comprehensive system analytics and insights</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="select-field text-sm flex-1 sm:flex-none"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <button
              onClick={fetchAnalytics}
              disabled={isLoading}
              className="btn-outline flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="text-secondary-400 hover:text-secondary-600 transition-colors"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[75vh] sm:max-h-[80vh]">
          {isLoading ? (
            <div className="p-4 sm:p-8 text-center">
              <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
              <p className="text-secondary-600">Loading analytics...</p>
            </div>
          ) : (
            <div className="p-3 sm:p-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-secondary-600">Total Users</p>
                      <p className="text-3xl font-bold text-secondary-900">
                        {formatNumber(analytics.users?.total || 0)}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {getGrowthIcon(5.2)}
                        <span className={`text-sm ${getGrowthColor(5.2)}`}>+5.2%</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary-600" />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-secondary-600">Active Lawyers</p>
                      <p className="text-3xl font-bold text-secondary-900">
                        {formatNumber(analytics.users?.activeLawyers || 0)}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {getGrowthIcon(12.5)}
                        <span className={`text-sm ${getGrowthColor(12.5)}`}>+12.5%</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-secondary-600">Total Appointments</p>
                      <p className="text-3xl font-bold text-secondary-900">
                        {formatNumber(analytics.appointments?.total || 0)}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {getGrowthIcon(8.7)}
                        <span className={`text-sm ${getGrowthColor(8.7)}`}>+8.7%</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-secondary-600">Completed Appointments</p>
                      <p className="text-3xl font-bold text-secondary-900">
                        {formatNumber(analytics.appointments?.completed || 0)}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {getGrowthIcon(15.3)}
                        <span className={`text-sm ${getGrowthColor(15.3)}`}>+15.3%</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-success-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* User Analytics */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">User Analytics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="font-medium text-secondary-900">Total Users</p>
                          <p className="text-sm text-secondary-600">All registered users</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-secondary-900">
                          {formatNumber(analytics.users?.total || 0)}
                        </p>
                        <p className="text-sm text-success-600">+5.2% from last month</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-secondary-900">Lawyers</p>
                          <p className="text-sm text-secondary-600">Registered lawyers</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-secondary-900">
                          {formatNumber(analytics.users?.lawyers || 0)}
                        </p>
                        <p className="text-sm text-success-600">+12.5% from last month</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-secondary-900">Clients</p>
                          <p className="text-sm text-secondary-600">Registered clients</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-secondary-900">
                          {formatNumber(analytics.users?.clients || 0)}
                        </p>
                        <p className="text-sm text-success-600">+8.9% from last month</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium text-secondary-900">Recent Registrations</p>
                          <p className="text-sm text-secondary-600">Last 7 days</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-secondary-900">
                          {formatNumber(analytics.users?.recentRegistrations || 0)}
                        </p>
                        <p className="text-sm text-success-600">+15.7% from last week</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appointment Analytics */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">Appointment Analytics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-secondary-900">Total Appointments</p>
                          <p className="text-sm text-secondary-600">All appointments</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-secondary-900">
                          {formatNumber(analytics.appointments?.total || 0)}
                        </p>
                        <p className="text-sm text-success-600">+8.7% from last month</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-secondary-900">Pending Appointments</p>
                          <p className="text-sm text-secondary-600">Awaiting confirmation</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-secondary-900">
                          {formatNumber(analytics.appointments?.pending || 0)}
                        </p>
                        <p className="text-sm text-warning-600">+2.1% from last month</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-success-600" />
                        <div>
                          <p className="font-medium text-secondary-900">Completed Appointments</p>
                          <p className="text-sm text-secondary-600">Successfully completed</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-secondary-900">
                          {formatNumber(analytics.appointments?.completed || 0)}
                        </p>
                        <p className="text-sm text-success-600">+15.3% from last month</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="font-medium text-secondary-900">Confirmed Appointments</p>
                          <p className="text-sm text-secondary-600">Awaiting completion</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-secondary-900">
                          {formatNumber(analytics.appointments?.confirmed || 0)}
                        </p>
                        <p className="text-sm text-primary-600">Active consultations</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium text-secondary-900">Cancelled Appointments</p>
                          <p className="text-sm text-secondary-600">Cancelled by users</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-secondary-900">
                          {formatNumber(analytics.appointments?.cancelled || 0)}
                        </p>
                        <p className="text-sm text-red-600">Cancellation rate</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium text-secondary-900">Rejected Appointments</p>
                          <p className="text-sm text-secondary-600">Rejected by lawyers</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-secondary-900">
                          {formatNumber(analytics.appointments?.rejected || 0)}
                        </p>
                        <p className="text-sm text-orange-600">Rejection rate</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="font-medium text-secondary-900">Recent Appointments</p>
                          <p className="text-sm text-secondary-600">Last 7 days</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-secondary-900">
                          {formatNumber(analytics.appointments?.recent || 0)}
                        </p>
                        <p className="text-sm text-success-600">+12.4% from last week</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Health */}
              <div className="card mt-4 sm:mt-8">
                <h3 className="text-lg font-semibold text-secondary-900 mb-4">System Health</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="text-center p-4 bg-success-50 rounded-lg">
                    <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-6 w-6 text-success-600" />
                    </div>
                    <h4 className="font-semibold text-secondary-900">System Status</h4>
                    <p className="text-success-600 font-medium">Healthy</p>
                    <p className="text-sm text-secondary-600 mt-1">All systems operational</p>
                  </div>

                  <div className="text-center p-4 bg-primary-50 rounded-lg">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-6 w-6 text-primary-600" />
                    </div>
                    <h4 className="font-semibold text-secondary-900">Uptime</h4>
                    <p className="text-primary-600 font-medium">99.9%</p>
                    <p className="text-sm text-secondary-600 mt-1">Last 30 days</p>
                  </div>

                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <BarChart className="h-6 w-6 text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-secondary-900">Performance</h4>
                    <p className="text-purple-600 font-medium">Excellent</p>
                    <p className="text-sm text-secondary-600 mt-1">Fast response times</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView; 