import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Users, Calendar, MessageSquare, FileText, TrendingUp, Activity, Shield, Settings, BarChart3,
  Eye, Edit, Trash2, Search, Filter, Download, RefreshCw,
  MessageCircle, CheckCircle, XCircle, User, File, DollarSign,
  Ban, CreditCard, Plus, Copy, AlertCircle, Briefcase, BookOpen, Mail, HelpCircle, FileCog, Menu, X, Video
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import io from 'socket.io-client'
import MessagingOversight from './MessagingOversight'
import UserDetailsModal from './UserDetailsModal'
import LawyerProfileModal from './LawyerProfileModal'
import DocumentsModal from './DocumentsModal'
import PaymentMethodsTable from './PaymentMethodsTable'
import UserBalancesTable from './UserBalancesTable'
import TransactionsTable from './TransactionsTable'
import ServicesManagement from './ServicesManagement'
import BlogsManagement from './BlogsManagement'
import ContactManagement from './ContactManagement'
import FAQsManagement from './FAQsManagement'
import PagesManagement from './PagesManagement'
import DataResetManager from './DataResetManager'
import VideoCallOversight from './VideoCallOversight'
import AdminNotificationBell from './AdminNotificationBell'

export const PAYMENT_METHOD_LABELS = {
  JAZZCASH: 'JazzCash',
  EASYPAYSA: 'EasyPaisa',
  NAYAPAY: 'NayaPay',
  BANK: 'Bank Transfer'
}

const AdminDashboard = () => {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('overview')
  const [analytics, setAnalytics] = useState(null)
  const [realtimeStats, setRealtimeStats] = useState(null)
  const [loading, setLoading] = useState(false) // Changed to false initially
  const [initialLoading, setInitialLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // New loading state for initial load
  const [data, setData] = useState({})
  const [pagination, setPagination] = useState({})
  const [filters, setFilters] = useState({})
  const [pendingLawyers, setPendingLawyers] = useState([])
  const [isLoading, setIsLoading] = useState({
    lawyers: false,
    analytics: false
  })

  // User details modal state
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)

  // Lawyer verification modals state
  const [selectedLawyer, setSelectedLawyer] = useState(null)
  const [isLawyerProfileModalOpen, setIsLawyerProfileModalOpen] = useState(false)
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false)
  const [withdrawalModal, setWithdrawalModal] = useState({ open: false, requestId: null })
  const [withdrawalForm, setWithdrawalForm] = useState({ reference: '', note: '', proof: null })
  const [withdrawalModalLoading, setWithdrawalModalLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tabParam = params.get('tab')
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [location.search])

  useEffect(() => {
    const initializeData = async () => {
      try {
        setInitialLoading(true)
        // Fetch ALL initial data in parallel
        await Promise.allSettled([
          fetchAnalytics(),
          fetchPendingLawyers(),
          fetchRealtimeStats()
        ])
      } catch (error) {
        console.error('Error initializing dashboard:', error)
      } finally {
        setInitialLoading(false)
      }
    }

    initializeData()

    // Socket.IO is primary for live activity. Polling is a safety net in case
    // a websocket is blocked or the browser resumes from sleep.
    const realtimeInterval = setInterval(fetchRealtimeStats, 30000)
    const analyticsInterval = setInterval(fetchAnalytics, 60000)

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchRealtimeStats()
        fetchAnalytics()
      }
    }
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      clearInterval(realtimeInterval)
      clearInterval(analyticsInterval)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, []) // Empty dependency array to run only once

  const fetchPendingLawyers = async () => {
    try {
      setIsLoading(prev => ({ ...prev, lawyers: true }))
      const response = await adminAPI.getPendingLawyers()
      setPendingLawyers(response.data)
    } catch (error) {
      console.error('Error fetching pending lawyers:', error)
      // Don't show error toast on initial load to avoid spam
      if (!initialLoading) {
        toast.error('Failed to load pending lawyers')
      }
      // Set empty array on error to prevent undefined
      setPendingLawyers([])
    } finally {
      setIsLoading(prev => ({ ...prev, lawyers: false }))
    }
  }

  const handleVerifyLawyer = async (lawyerId, action) => {
    try {
      if (action === 'approve') {
        await adminAPI.verifyLawyer(lawyerId, 'approved')
        toast.success('Lawyer approved successfully')
      } else {
        await adminAPI.verifyLawyer(lawyerId, 'rejected')
        toast.success('Lawyer rejected successfully')
      }
      fetchPendingLawyers() // Refresh the list
    } catch (error) {
      console.error('Error verifying lawyer:', error)
      const message = error.response?.data?.message || `Failed to ${action} lawyer`
      toast.error(message)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setIsLoading(prev => ({ ...prev, analytics: true }))
      const response = await adminAPI.getAnalytics()
      setAnalytics(response.data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      // Don't show error toast on initial load to avoid spam
      if (!initialLoading) {
        toast.error('Failed to load analytics')
      }
      // Set default analytics structure on error
      setAnalytics({
        users: { total: 0, new: 0, lawyers: 0, clients: 0, active: 0 },
        appointments: { total: 0, inPeriod: 0 },
        payments: { totalRevenue: 0, revenueInPeriod: 0, total: 0 },
        chats: { total: 0, inPeriod: 0 },
        invoices: { paid: 0, overdue: 0, total: 0 },
        feedback: { averageRating: 0, total: 0 }
      })
    } finally {
      setIsLoading(prev => ({ ...prev, analytics: false }))
    }
  }

  const fetchRealtimeStats = async () => {
    try {
      const response = await adminAPI.getRealtimeStats()
      setRealtimeStats(response.data)
    } catch (error) {
      console.error('Error fetching real-time stats:', error)
      // Silently fail for real-time stats to not overwhelm user with errors
      setRealtimeStats(null)
    }
  }

  const fetchTabData = useCallback(async () => {
    try {
      setLoading(true)
      const params = { page: 1, limit: 50, ...filters }

      let response
      switch (activeTab) {
        case 'users':
          response = await adminAPI.getUsers(params)
          break
        case 'appointments':
          response = await adminAPI.getAppointments(params)
          break
        case 'balance-requests':
          response = await adminAPI.getBalanceRequests(params)
          break
        case 'withdrawal-requests':
          response = await adminAPI.getWithdrawalRequests(params)
          break
        case 'refund-requests':
          response = await adminAPI.getRefundRequests(params)
          break
        case 'user-balances':
          response = await adminAPI.getUserBalances(params)
          console.log('User balances response:', response.data)
          break
        case 'transactions':
          response = await adminAPI.getTransactions(params)
          break
        case 'payment-methods':
          response = await adminAPI.getAllPaymentMethods()
          break
        case 'feedback':
          response = await adminAPI.getFeedback(params)
          break
        case 'logs':
          response = await adminAPI.getLogs(params)
          break
        case 'services':
        case 'blogs':
        case 'contact-messages':
        case 'faqs':
        case 'pages':
          // These are handled by their own components
          setLoading(false)
          return
        default:
          return
      }

      // Handle data structure for different tabs
      if (activeTab === 'balance-requests') {
        setData({ [activeTab]: response.data.requests || [] })
        setPagination(response.data.pagination || {})
      } else if (activeTab === 'withdrawal-requests') {
        setData({ [activeTab]: response.data.withdrawalRequests || [] })
        setPagination(response.data.pagination || {})
      } else if (activeTab === 'refund-requests') {
        setData({ [activeTab]: response.data.refundRequests || [] })
        setPagination(response.data.pagination || {})
      } else if (activeTab === 'user-balances') {
        const balancesData = response.data.userBalances || response.data.balances || response.data || []
        setData({ [activeTab]: balancesData })
        setPagination(response.data.pagination || {})
      } else if (activeTab === 'payment-methods') {
        setData({ [activeTab]: response.data.paymentMethods || [] })
        setPagination({})
      } else {
        setData(response.data)
        setPagination(response.data.pagination || {})
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error)
      toast.error(`Failed to load ${activeTab}`)
    } finally {
      setLoading(false)
    }
  }, [activeTab, filters])

  useEffect(() => {
    if (activeTab !== 'overview') {
      fetchTabData()
    }
  }, [activeTab, fetchTabData])

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleUserStatusChange = async (userId, isActive, reason = '') => {
    try {
      await adminAPI.updateUserStatus(userId, { isActive, reason })
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`)
      fetchTabData()
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const handleUserDelete = async (userId, reason = '') => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      console.log('🗑️ Attempting to delete user:', userId, 'with reason:', reason)
      const response = await adminAPI.deleteUser(userId, { reason })
      console.log('🗑️ Delete user response:', response)
      toast.success('User deleted successfully')
      fetchTabData()
    } catch (error) {
      console.error('🗑️ Error deleting user:', error)
      console.error('🗑️ Error response:', error.response?.data)
      toast.error(`Failed to delete user: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleApproveBalanceRequest = async (requestId) => {
    try {
      // Find the request to get the requested amount
      const request = data['balance-requests']?.find(req => req._id === requestId);
      const approvedAmount = request?.requestedAmountPkr || 0;

      console.log('Approving request:', requestId);
      console.log('Request data:', request);
      console.log('Approved amount:', approvedAmount);

      await adminAPI.approveBalanceRequest(requestId, {
        finalApprovedAmountPkr: approvedAmount,
        adminNote: 'Approved by admin'
      })
      toast.success('Balance request approved successfully')
      fetchTabData()
    } catch (error) {
      console.error('Error approving balance request:', error)
      console.error('Error response:', error.response?.data)
      toast.error(`Failed to approve balance request: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleRejectBalanceRequest = async (requestId) => {
    const rejectionReason = prompt('Enter rejection reason:')
    if (!rejectionReason) return

    try {
      await adminAPI.rejectBalanceRequest(requestId, {
        rejectionReason
      })
      toast.success('Balance request rejected successfully')
      fetchTabData()
    } catch (error) {
      console.error('Error rejecting balance request:', error)
      toast.error('Failed to reject balance request')
    }
  }

  const handleApproveWithdrawalRequest = async (requestId) => {
    setWithdrawalModal({ open: true, requestId })
    setWithdrawalForm({ reference: '', note: '', proof: null })
  }

  const handleRejectWithdrawalRequest = async (requestId) => {
    const rejectionReason = prompt('Enter rejection reason:')
    if (!rejectionReason) return

    const adminNote = prompt('Enter admin note (optional):') || ''

    try {
      await adminAPI.rejectWithdrawalRequest(requestId, {
        rejectionReason,
        adminNote
      })
      toast.success('Withdrawal request rejected successfully')
      fetchTabData()
    } catch (error) {
      console.error('Error rejecting withdrawal request:', error)
      toast.error(`Failed to reject withdrawal request: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleDecideRefund = async (appointmentId, action) => {
    const notePrompt = action === 'reject' ? 'Enter reason for rejection:' : 'Add admin note (optional):'
    const adminNote = window.prompt(notePrompt) || ''
    try {
      await adminAPI.decideRefundRequest(appointmentId, { action, adminNote })
      toast.success(`Refund ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      fetchTabData()
    } catch (error) {
      console.error('Error updating refund request:', error)
      toast.error(error.response?.data?.message || 'Failed to update refund request')
    }
  }

  const handleWithdrawalInputChange = (e) => {
    const { name, value, files } = e.target
    if (name === 'proof') {
      setWithdrawalForm((prev) => ({ ...prev, proof: files?.[0] || null }))
    } else {
      setWithdrawalForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const submitWithdrawalModal = async (e) => {
    e.preventDefault()
    if (!withdrawalModal.requestId) return
    try {
      setWithdrawalModalLoading(true)
      const formData = new FormData()
      if (withdrawalForm.reference) formData.append('disbursementReference', withdrawalForm.reference)
      if (withdrawalForm.note) formData.append('adminNote', withdrawalForm.note)
      if (withdrawalForm.proof) formData.append('proof', withdrawalForm.proof)
      await adminAPI.approveWithdrawalRequest(withdrawalModal.requestId, formData)
      toast.success('Withdrawal request approved successfully')
      setWithdrawalModal({ open: false, requestId: null })
      setWithdrawalForm({ reference: '', note: '', proof: null })
      fetchTabData()
    } catch (error) {
      console.error('Error approving withdrawal request:', error)
      toast.error(`Failed to approve withdrawal request: ${error.response?.data?.message || error.message}`)
    } finally {
      setWithdrawalModalLoading(false)
    }
  }


  const handleViewUserDetails = (userId) => {
    setSelectedUserId(userId)
    setIsUserModalOpen(true)
  }

  const handleViewDocuments = (lawyer) => {
    setSelectedLawyer(lawyer)
    setIsDocumentsModalOpen(true)
  }

  const handleCloseUserModal = () => {
    setIsUserModalOpen(false)
    setSelectedUserId(null)
  }

  const sidebarGroups = [
    {
      title: 'Overview',
      items: [
        { id: 'overview', label: 'Dashboard', icon: BarChart3 }
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'appointments', label: 'Appointments', icon: Calendar }
      ]
    },
    {
      title: 'Financials',
      items: [
        { id: 'balance-requests', label: 'Balance Requests', icon: DollarSign },
        { id: 'withdrawal-requests', label: 'Withdrawal Requests', icon: CreditCard },
        { id: 'refund-requests', label: 'Refund Requests', icon: AlertCircle },
        { id: 'transactions', label: 'Transactions', icon: Activity },
        { id: 'user-balances', label: 'User Balances', icon: Users },
        { id: 'payment-methods', label: 'Payment Methods', icon: CreditCard }
      ]
    },
    {
      title: 'Content',
      items: [
        { id: 'services', label: 'Services', icon: Briefcase },
        { id: 'blogs', label: 'Blogs', icon: BookOpen },
        { id: 'contact-messages', label: 'Messages', icon: Mail },
        { id: 'faqs', label: 'FAQs', icon: HelpCircle },
        // Removed Pages from menu as requested
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'messaging', label: 'Messaging', icon: MessageCircle },
        { id: 'call-recordings', label: 'Call Recordings', icon: Video },
        { id: 'feedback', label: 'Feedback', icon: TrendingUp },
        { id: 'logs', label: 'Logs', icon: Activity },
        { id: 'data-reset', label: 'Data Reset', icon: Trash2 }
      ]
    }
  ]

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-100 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-secondary-200 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="h-16 flex items-center px-6 border-b border-secondary-200">
            <span className="text-xl font-bold text-secondary-900">Admin Panel</span>
          </div>

          {/* Sidebar Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-3 space-y-6">
              {sidebarGroups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <h3 className="px-3 text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-2">
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isActive = activeTab === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id)
                            setIsSidebarOpen(false)
                          }}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                            ${isActive
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-secondary-700 hover:bg-secondary-50 hover:text-secondary-900'}
                          `}
                        >
                          <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-secondary-400'}`} />
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-secondary-200">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 truncate">Admin User</p>
                <p className="text-xs text-secondary-500 truncate">legalmate.services@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-secondary-200 px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-secondary-900">Admin Panel</span>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md text-secondary-400 hover:text-secondary-500 hover:bg-secondary-100"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-end gap-3">
              <AdminNotificationBell />
              <button
                onClick={() => {
                  if (activeTab === 'overview') {
                    fetchAnalytics()
                    fetchPendingLawyers()
                    fetchRealtimeStats()
                  } else {
                    fetchTabData()
                  }
                }}
                disabled={isLoading.analytics || isLoading.lawyers || loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${(isLoading.analytics || isLoading.lawyers || loading) ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {activeTab === 'overview' ? (
              <OverviewTab
                analytics={analytics}
                realtimeStats={realtimeStats}
                pendingLawyers={pendingLawyers}
                isLoading={isLoading}
                onVerifyLawyer={handleVerifyLawyer}
                setSelectedLawyer={setSelectedLawyer}
                setIsLawyerProfileModalOpen={setIsLawyerProfileModalOpen}
                setIsDocumentsModalOpen={setIsDocumentsModalOpen}
              />
            ) : activeTab === 'services' ? (
              <ServicesManagement />
            ) : activeTab === 'blogs' ? (
              <BlogsManagement />
            ) : activeTab === 'contact-messages' ? (
              <ContactManagement />
            ) : activeTab === 'faqs' ? (
              <FAQsManagement />
            ) : activeTab === 'pages' ? (
              <PagesManagement />
            ) : activeTab === 'messaging' ? (
              <MessagingOversight />
            ) : activeTab === 'data-reset' ? (
              <DataResetManager />
            ) : activeTab === 'call-recordings' ? (
              <VideoCallOversight />
            ) : (
              <DataTab
                tab={activeTab}
                data={data}
                pagination={pagination}
                loading={loading}
                onFilterChange={handleFilterChange}
                onPageChange={handlePageChange}
                onUserStatusChange={handleUserStatusChange}
                onUserDelete={handleUserDelete}
                onVerifyLawyer={handleVerifyLawyer}
                onViewUserDetails={handleViewUserDetails}
                onViewDocuments={handleViewDocuments}
                onApproveBalanceRequest={handleApproveBalanceRequest}
                onRejectBalanceRequest={handleRejectBalanceRequest}
                onApproveWithdrawalRequest={handleApproveWithdrawalRequest}
                onRejectWithdrawalRequest={handleRejectWithdrawalRequest}
                onDecideRefundRequest={handleDecideRefund}
                onRefreshPaymentMethods={fetchTabData}
              />
            )}
          </div>
        </main>
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        userId={selectedUserId}
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
      />

      {/* Lawyer Profile Modal */}
      {selectedLawyer && (
        <LawyerProfileModal
          lawyer={selectedLawyer}
          isOpen={isLawyerProfileModalOpen}
          onClose={() => {
            setIsLawyerProfileModalOpen(false)
            setSelectedLawyer(null)
          }}
          onVerify={(lawyerId, action) => {
            handleVerifyLawyer(lawyerId, action)
            setIsLawyerProfileModalOpen(false)
            setSelectedLawyer(null)
          }}
        />
      )}

      {/* Documents Modal */}
      {selectedLawyer && (
        <DocumentsModal
          lawyer={selectedLawyer}
          isOpen={isDocumentsModalOpen}
          onClose={() => {
            setIsDocumentsModalOpen(false)
            setSelectedLawyer(null)
          }}
          onVerify={(lawyerId, action) => {
            handleVerifyLawyer(lawyerId, action)
            setIsDocumentsModalOpen(false)
            setSelectedLawyer(null)
          }}
        />
      )}

      {withdrawalModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Approve Withdrawal</h3>
            <form className="space-y-4" onSubmit={submitWithdrawalModal}>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Disbursement Reference</label>
                <input
                  type="text"
                  name="reference"
                  value={withdrawalForm.reference}
                  onChange={handleWithdrawalInputChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Transaction ID or bank reference"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Admin Note</label>
                <textarea
                  name="note"
                  value={withdrawalForm.note}
                  onChange={handleWithdrawalInputChange}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Optional note for the user"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Upload Proof</label>
                <input
                  type="file"
                  name="proof"
                  accept="image/*,application/pdf"
                  onChange={handleWithdrawalInputChange}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded text-secondary-700"
                  onClick={() => setWithdrawalModal({ open: false, requestId: null })}
                  disabled={withdrawalModalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  disabled={withdrawalModalLoading}
                >
                  {withdrawalModalLoading ? 'Saving...' : 'Approve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Overview Tab Component
const OverviewTab = ({
  analytics,
  realtimeStats,
  pendingLawyers,
  isLoading,
  onVerifyLawyer,
  setSelectedLawyer,
  setIsLawyerProfileModalOpen,
  setIsDocumentsModalOpen
}) => {
  // Real-time stats via socket
  const [liveStats, setLiveStats] = useState(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const [lastLiveUpdate, setLastLiveUpdate] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    const envUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    const socketUrl = envUrl || window.location?.origin || ''
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setSocketConnected(true)
      socket.emit('join-admin-notifications')
    })

    socket.on('disconnect', () => {
      setSocketConnected(false)
    })

    socket.on('connect_error', () => {
      setSocketConnected(false)
    })

    socket.on('admin-realtime-stats', (data) => {
      setLiveStats(data)
      setLastLiveUpdate(data?.timestamp ? new Date(data.timestamp) : new Date())
    })

    return () => {
      socket.emit('leave-admin-notifications')
      socket.disconnect()
    }
  }, [])

  // Never trust the legacy aggregate onlineUsers field: older backend builds
  // counted raw Socket.IO connections, so one person could appear multiple times.
  // The dashboard only counts real platform users: clients + lawyers.
  const onlineClients = liveStats?.onlineClients ?? (realtimeStats?.online?.clients || 0)
  const onlineLawyers = liveStats?.onlineLawyers ?? (realtimeStats?.online?.lawyers || 0)
  const onlineCount = onlineClients + onlineLawyers
  const pendingCount = liveStats?.pendingAppointments ?? (realtimeStats?.active?.pendingAppointments || 0)
  const activeChatsCount = liveStats?.activeChats ?? (realtimeStats?.active?.activeChats || 0)
  const overdueCount = liveStats?.overdueAppointments ?? (realtimeStats?.active?.overdueAppointments || 0)
  // Show loading skeleton if analytics is not yet loaded
  if (!analytics) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-secondary-900 mb-6">Platform Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-secondary-50 p-6 rounded-lg animate-pulse">
              <div className="h-4 bg-secondary-200 rounded mb-2"></div>
              <div className="h-8 bg-secondary-200 rounded mb-2"></div>
              <div className="h-3 bg-secondary-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-secondary-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  // Ensure all analytics sub-objects exist with fallback values
  const users = analytics.users || { total: 0, new: 0, lawyers: 0, clients: 0, active: 0 };
  const appointments = analytics.appointments || { total: 0, inPeriod: 0 };
  const payments = analytics.payments || { totalRevenue: 0, revenueInPeriod: 0, total: 0 };
  const chats = analytics.chats || { total: 0, inPeriod: 0 };
  const invoices = analytics.invoices || { paid: 0, overdue: 0, total: 0 };
  const feedback = analytics.feedback || { averageRating: 0, total: 0 };

  const statColorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' }
  }

  const stats = [
    {
      title: 'Total Users',
      value: users.total || 0,
      change: users.new || 0,
      changeLabel: 'new last 7 days',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Total Appointments',
      value: appointments.total || 0,
      change: appointments.inPeriod || 0,
      changeLabel: 'last 7 days',
      icon: Calendar,
      color: 'green'
    },
    {
      title: 'Platform Revenue',
      value: `PKR ${(payments.totalRevenue || 0).toLocaleString()}`,
      change: `${payments.total || 0} completed`,
      changeLabel: 'appointments',
      icon: CreditCard,
      color: 'purple'
    },
    {
      title: 'Feedback',
      value: feedback.total || 0,
      change: feedback.averageRating || 0,
      changeLabel: 'avg rating',
      icon: MessageSquare,
      color: 'orange'
    }
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-secondary-900 mb-6">Platform Overview</h2>

      {/* Real-time Stats */}
      <div className="mb-8 p-4 bg-primary-50 rounded-lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-primary-900 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Activity
          </h3>
          <div className="flex items-center gap-2 text-xs text-primary-700">
            <span className={`h-2 w-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-secondary-400'}`} />
            <span>{socketConnected ? 'Live' : 'Polling fallback'}</span>
            {lastLiveUpdate && (
              <span className="text-secondary-500">
                · updated {lastLiveUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 flex items-center justify-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              {onlineCount}
            </div>
            <div className="text-sm text-primary-700">Online Users</div>
            <div className="mt-1 text-[11px] text-primary-600">
              {onlineClients} clients · {onlineLawyers} lawyers
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{pendingCount}</div>
            <div className="text-sm text-green-700">Pending Appointments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{activeChatsCount}</div>
            <div className="text-sm text-orange-700">Active Chats</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <div className="text-sm text-red-700">Overdue Appointments</div>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="bg-secondary-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-secondary-900">{stat.value}</p>
                  <p className="text-sm text-secondary-500">
                    +{stat.change} {stat.changeLabel}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${statColorClasses[stat.color]?.bg || 'bg-secondary-100'}`}>
                  <Icon className={`h-6 w-6 ${statColorClasses[stat.color]?.text || 'text-secondary-600'}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Analytics */}
        <div className="bg-secondary-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">User Analytics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-secondary-600">Total Lawyers:</span>
              <span className="font-medium">{users.lawyers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">Total Clients:</span>
              <span className="font-medium">{users.clients || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">Enabled Accounts:</span>
              <span className="font-medium">{users.active || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">New Users:</span>
              <span className="font-medium">{users.new || 0}</span>
            </div>
          </div>
        </div>

        {/* Real-time Platform Analytics */}
        <div className="bg-secondary-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Platform Analytics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-secondary-600">Pending Appointments:</span>
              <span className="font-medium text-orange-600">{appointments.pending || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">Confirmed Appointments:</span>
              <span className="font-medium text-green-600">{appointments.confirmed || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">Completed Appointments:</span>
              <span className="font-medium">{appointments.completed || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">Verified Active Lawyers:</span>
              <span className="font-medium">{users.activeLawyers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">Appointments (7 days):</span>
              <span className="font-medium">{appointments.recent || 0} appointments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lawyer Verification Section */}
      <div className="mt-8">
        <div className="bg-secondary-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Lawyer Verification
          </h3>

          {isLoading.lawyers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : pendingLawyers.length === 0 ? (
            <p className="text-secondary-500 text-center py-8">No pending lawyer verifications</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Specialization</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Registration Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {(pendingLawyers || []).map((lawyer) => (
                    <tr key={lawyer._id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-secondary-900">
                        {lawyer.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-600">
                        {lawyer.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-600">
                        {lawyer.specialization}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-600">
                        {new Date(lawyer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                        <button
                          onClick={() => {
                            setSelectedLawyer(lawyer)
                            setIsLawyerProfileModalOpen(true)
                          }}
                          className="text-primary-600 hover:text-primary-800 font-medium text-xs sm:text-sm"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLawyer(lawyer)
                            setIsDocumentsModalOpen(true)
                          }}
                          className="text-purple-600 hover:text-purple-800 font-medium text-xs sm:text-sm"
                        >
                          Documents
                        </button>
                        <button
                          onClick={() => onVerifyLawyer(lawyer._id, 'approve')}
                          className="text-green-600 hover:text-green-800 font-medium text-xs sm:text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onVerifyLawyer(lawyer._id, 'reject')}
                          className="text-red-600 hover:text-red-800 font-medium text-xs sm:text-sm"
                        >
                          Reject
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// DataTab Component
const DataTab = ({
  tab,
  data,
  pagination,
  loading,
  onFilterChange,
  onPageChange,
  onUserStatusChange,
  onUserDelete,
  onVerifyLawyer,
  onViewUserDetails,
  onViewDocuments,
  onApproveBalanceRequest,
  onRejectBalanceRequest,
  onApproveWithdrawalRequest,
  onRejectWithdrawalRequest,
  onDecideRefundRequest,
  onRefreshPaymentMethods
}) => {
  const items = data[tab] || []
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')

  const renderTable = () => {
    switch (tab) {
      case 'users':
        return <UsersTable users={items} onStatusChange={onUserStatusChange} onDelete={onUserDelete} onViewDetails={onViewUserDetails} />
      case 'lawyers':
        return <LawyersTable lawyers={items} onVerify={onVerifyLawyer} onViewDetails={onViewUserDetails} onViewDocuments={onViewDocuments} />
      case 'clients':
        return <ClientsTable clients={items} onViewDetails={onViewUserDetails} />
      case 'appointments':
        return <AppointmentsTable appointments={items} />
      case 'payments':
      case 'balance-requests':
        return <BalanceRequestsTable requests={items} onApprove={onApproveBalanceRequest} onReject={onRejectBalanceRequest} />
      case 'withdrawal-requests':
        return <WithdrawalRequestsTable requests={items} loading={loading} error={null} onApprove={onApproveWithdrawalRequest} onReject={onRejectWithdrawalRequest} />
      case 'payment-methods':
        return <PaymentMethodsTable paymentMethods={items} onRefresh={onRefreshPaymentMethods} />
      case 'refund-requests':
        return <RefundRequestsTable requests={items} onDecide={onDecideRefundRequest} />
      case 'user-balances':
        return <UserBalancesTable balances={items} />
      case 'transactions':
        return <TransactionsTable transactions={items} />
      case 'feedback':
        return <FeedbackTable feedback={items} />
      case 'logs':
        return <LogsTable logs={items} />
      default:
        return <div>No data available</div>
    }
  }

  const handleSearch = () => {
    onFilterChange({ search: searchTerm || undefined })
  }

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    onFilterChange({ status: status === 'all' ? undefined : status })
  }

  const handleRoleFilter = (role) => {
    setRoleFilter(role)
    onFilterChange({ role: role === 'all' ? undefined : role })
  }

  const handleVerificationFilter = (verification) => {
    setVerificationFilter(verification)
    onFilterChange({ verification: verification === 'all' ? undefined : verification })
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setRoleFilter('all')
    setVerificationFilter('all')
    onFilterChange({ page: 1 })
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || roleFilter !== 'all' || verificationFilter !== 'all'

  return (
    <div className="p-3 sm:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-secondary-900 capitalize">{tab.replace('-', ' ')}</h2>
          <p className="text-secondary-600 text-sm sm:text-base mt-1">Manage and monitor {tab.replace('-', ' ')}</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                placeholder={`Search ${tab.replace('-', ' ')}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-64 text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Filters Container */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm flex-1 sm:flex-none"
            >
              <option value="all">All Status</option>
              {tab === 'users' && (
                <>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </>
              )}
              {tab === 'appointments' && (
                <>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </>
              )}
              {tab === 'refund-requests' && (
                <>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </>
              )}
            </select>

            {/* Role Filter - For Users and User Balances Tabs */}
            {(tab === 'users' || tab === 'user-balances') && (
              <select
                value={roleFilter}
                onChange={(e) => handleRoleFilter(e.target.value)}
                className="px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Roles</option>
                <option value="client">Clients</option>
                <option value="lawyer">Lawyers</option>
                <option value="admin">Admins</option>
              </select>
            )}

            {/* Verification Filter - Only for Users Tab */}
            {tab === 'users' && (
              <select
                value={verificationFilter}
                onChange={(e) => handleVerificationFilter(e.target.value)}
                className="px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Verifications</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            )}

            {/* Clear Filters Button - For Users and User Balances Tabs */}
            {(tab === 'users' || tab === 'user-balances') && hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {renderTable()}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-secondary-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-2 border border-secondary-300 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-secondary-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-2 border border-secondary-300 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Table Components
const UsersTable = ({ users, onStatusChange, onDelete, onVerifyLawyer, onViewDetails, onViewDocuments }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-secondary-200">
      <thead className="bg-secondary-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Email</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Role</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-secondary-200">
        {users.map((user) => (
          <tr key={user._id}>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-secondary-300 flex items-center justify-center">
                  <span className="text-sm font-medium text-secondary-700">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-secondary-900">{user.name}</div>
                  <div className="text-sm text-secondary-500">ID: {user._id}</div>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">{user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'lawyer' ? 'bg-primary-100 text-primary-800' : 'bg-green-100 text-green-800'
                }`}>
                {user.role}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => onViewDetails(user._id)}
                  className="flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs hover:bg-primary-200"
                >
                  <Eye className="h-3 w-3" />
                  View Details
                </button>

                <button
                  onClick={() => onStatusChange(user._id, !user.isActive)}
                  className={`px-2 py-1 rounded text-xs ${user.isActive
                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                >
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </button>

                {user.role === 'lawyer' && onVerifyLawyer && (
                  <>
                    <button
                      onClick={() => onViewDocuments(user)}
                      className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs hover:bg-purple-200"
                    >
                      <Eye className="h-3 w-3" />
                      View Documents
                    </button>

                    {!user.isVerified && user.verificationStatus !== 'rejected' && (
                      <button
                        onClick={() => onVerifyLawyer(user._id, 'approve')}
                        className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs hover:bg-green-200"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Verify
                      </button>
                    )}

                    {user.isVerified && (
                      <button
                        onClick={() => onVerifyLawyer(user._id, 'reject')}
                        className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs hover:bg-yellow-200"
                      >
                        <XCircle className="h-3 w-3" />
                        Unverify
                      </button>
                    )}

                    {user.verificationStatus === 'rejected' && (
                      <button
                        onClick={() => onVerifyLawyer(user._id, 'approve')}
                        className="flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs hover:bg-primary-200"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Re-verify
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={() => onDelete(user._id)}
                  className="px-2 py-1 rounded text-xs bg-red-100 text-red-800 hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const AppointmentsTable = ({ appointments }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-secondary-200">
      <thead className="bg-secondary-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Client</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Lawyer</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Date & Time</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Type</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Amount</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-secondary-200">
        {appointments.map((appointment) => (
          <tr key={appointment._id}>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm font-medium text-secondary-900">{appointment.client?.name}</div>
              <div className="text-sm text-secondary-500">{appointment.client?.email}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm font-medium text-secondary-900">{appointment.lawyer?.name}</div>
              <div className="text-sm text-secondary-500">{appointment.lawyer?.specialization}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
              <div>{new Date(appointment.date).toLocaleDateString()}</div>
              <div className="text-secondary-500">{appointment.time}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  appointment.status === 'completed' ? 'bg-primary-100 text-primary-800' :
                    'bg-red-100 text-red-800'
                }`}>
                {appointment.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
              {appointment.consultationType}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
              PKR {appointment.amount?.toLocaleString() || 0}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const PaymentsTable = ({ payments }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-secondary-200">
      <thead className="bg-secondary-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Transaction</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Client</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Lawyer</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Amount</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Date</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-secondary-200">
        {payments.map((payment) => (
          <tr key={payment._id}>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm font-medium text-secondary-900">{payment.transactionId}</div>
              <div className="text-sm text-secondary-500">{payment.paymentMethod}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm font-medium text-secondary-900">{payment.client?.name}</div>
              <div className="text-sm text-secondary-500">{payment.client?.email}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm font-medium text-secondary-900">{payment.lawyer?.name}</div>
              <div className="text-sm text-secondary-500">{payment.lawyer?.email}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
              PKR {payment.amount?.toLocaleString() || 0}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-secondary-100 text-secondary-800'
                }`}>
                {payment.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
              {new Date(payment.createdAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const FeedbackTable = ({ feedback }) => {
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [filterRating, setFilterRating] = useState('all')
  const [searchLawyer, setSearchLawyer] = useState('')

  const filteredFeedback = feedback.filter((item) => {
    const matchesRating = filterRating === 'all' || item.rating.toString() === filterRating
    const matchesLawyer = !searchLawyer ||
      item.lawyer?.name?.toLowerCase().includes(searchLawyer.toLowerCase())
    return matchesRating && matchesLawyer
  })

  const averageRating = feedback.length > 0
    ? (feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1)
    : 0

  const ratingDistribution = {
    5: feedback.filter(item => item.rating === 5).length,
    4: feedback.filter(item => item.rating === 4).length,
    3: feedback.filter(item => item.rating === 3).length,
    2: feedback.filter(item => item.rating === 2).length,
    1: feedback.filter(item => item.rating === 1).length,
  }

  if (selectedFeedback) {
    return (
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Feedback Details</h3>
          <button
            onClick={() => setSelectedFeedback(null)}
            className="px-4 py-2 bg-secondary-500 text-white rounded hover:bg-secondary-600"
          >
            ← Back to Feedback List
          </button>
        </div>

        <div className="bg-secondary-50 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Info */}
            <div>
              <h4 className="font-semibold text-secondary-900 mb-3">Client Information</h4>
              <div className="space-y-2">
                <div><span className="font-medium">Name:</span> {selectedFeedback.client?.name}</div>
                <div><span className="font-medium">Email:</span> {selectedFeedback.client?.email}</div>
              </div>
            </div>

            {/* Lawyer Info */}
            <div>
              <h4 className="font-semibold text-secondary-900 mb-3">Lawyer Information</h4>
              <div className="space-y-2">
                <div><span className="font-medium">Name:</span> {selectedFeedback.lawyer?.name}</div>
                <div><span className="font-medium">Email:</span> {selectedFeedback.lawyer?.email}</div>
                <div><span className="font-medium">Specialization:</span> {selectedFeedback.lawyer?.specialization}</div>
              </div>
            </div>
          </div>

          {/* Rating and Date */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-secondary-900 mb-3">Rating</h4>
              <div className="flex items-center space-x-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={`text-2xl ${i < selectedFeedback.rating ? 'text-yellow-400' : 'text-secondary-300'}`}>
                    ★
                  </span>
                ))}
                <span className="ml-3 text-lg font-semibold">({selectedFeedback.rating}/5)</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-secondary-900 mb-3">Submitted</h4>
              <div className="text-secondary-700">
                {new Date(selectedFeedback.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="mt-6">
            <h4 className="font-semibold text-secondary-900 mb-3">Feedback Comment</h4>
            <div className="bg-white p-4 rounded border">
              {selectedFeedback.comment ? (
                <p className="text-secondary-700 whitespace-pre-wrap">{selectedFeedback.comment}</p>
              ) : (
                <p className="text-secondary-500 italic">No comment provided</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Feedback Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-primary-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-primary-600">{feedback.length}</div>
          <div className="text-sm text-primary-700">Total Reviews</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-green-600">{averageRating}</span>
            <div className="flex">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`text-lg ${i < Math.floor(averageRating) ? 'text-yellow-400' : 'text-secondary-300'}`}>
                  ★
                </span>
              ))}
            </div>
          </div>
          <div className="text-sm text-green-700">Average Rating</div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {Math.round((ratingDistribution[5] / feedback.length) * 100) || 0}%
          </div>
          <div className="text-sm text-yellow-700">5-Star Reviews</div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-secondary-50 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-secondary-900 mb-3">Rating Distribution</h4>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center space-x-3">
              <span className="w-8 text-sm">{rating} ★</span>
              <div className="flex-1 bg-secondary-200 rounded-full h-3">
                <div
                  className="bg-primary-500 h-3 rounded-full"
                  style={{
                    width: `${feedback.length > 0 ? (ratingDistribution[rating] / feedback.length) * 100 : 0}%`
                  }}
                ></div>
              </div>
              <span className="text-sm text-secondary-600 w-12">{ratingDistribution[rating]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Filter by Rating</label>
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Search Lawyer</label>
          <input
            type="text"
            value={searchLawyer}
            onChange={(e) => setSearchLawyer(e.target.value)}
            placeholder="Search by lawyer name..."
            className="px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Feedback Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Lawyer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Comment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {filteredFeedback.map((item) => (
              <tr key={item._id} className="hover:bg-secondary-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-secondary-900">{item.client?.name}</div>
                  <div className="text-sm text-secondary-500">{item.client?.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-secondary-900">{item.lawyer?.name}</div>
                  <div className="text-sm text-secondary-500">{item.lawyer?.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={`text-lg ${i < item.rating ? 'text-yellow-400' : 'text-secondary-300'}`}>
                        ★
                      </span>
                    ))}
                    <span className="ml-2 text-sm text-secondary-600">({item.rating}/5)</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-secondary-900 max-w-xs">
                  <div className="truncate" title={item.comment}>
                    {item.comment || 'No comment'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedFeedback(item)}
                    className="inline-flex items-center px-3 py-1 border border-primary-300 rounded-md text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredFeedback.length === 0 && (
        <div className="text-center py-8">
          <p className="text-secondary-500">No feedback matches your current filters</p>
        </div>
      )}
    </div>
  )
}

const LogsTable = ({ logs }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-secondary-200">
      <thead className="bg-secondary-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Timestamp</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Level</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Message</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">User</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Action</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-secondary-200">
        {logs.map((log, index) => (
          <tr key={index}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
              {new Date(log.timestamp).toLocaleString()}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${log.level === 'error' ? 'bg-red-100 text-red-800' :
                log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                {log.level}
              </span>
            </td>
            <td className="px-6 py-4 text-sm text-secondary-900">{log.message}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
              {typeof log.user === 'object' ?
                `${log.user.name} (${log.user.email})` :
                log.user || 'System'
              }
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">{log.action}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

// Balance Requests Table
const BalanceRequestsTable = ({ requests, onApprove, onReject }) => {

  const navigate = useNavigate();



  const handleViewRequest = (requestId) => {

    navigate(`/balance-request/${requestId}`);

  };



  return (

    <div className="overflow-x-auto">

      <table className="min-w-full divide-y divide-secondary-200">

        <thead className="bg-secondary-50">

          <tr>

            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">User</th>

            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Amount (PKR)</th>

            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Method</th>

            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Status</th>

            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Date</th>

            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Actions</th>

          </tr>

        </thead>

        <tbody className="bg-white divide-y divide-secondary-200">

          {(requests || []).map((request) => {

            // Buy Balance requests use 'method' field, not 'payoutMethod'
            const paymentMethod = request.method || request.payoutMethod;
            const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod;

            return (

              <tr key={request._id}>

                <td className="px-6 py-4 whitespace-nowrap">

                  <div className="text-sm font-medium text-secondary-900">{request.user?.name}</div>

                  <div className="text-sm text-secondary-500">{request.user?.email}</div>

                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">

                  ₨{request.requestedAmountPkr?.toLocaleString()}

                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">

                  <div className="font-medium">{methodLabel}</div>

                  {request.userReference && (

                    <div className="text-xs text-secondary-500">

                      Ref: {request.userReference}

                    </div>

                  )}

                </td>

                <td className="px-6 py-4 whitespace-nowrap">

                  <span

                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :

                      request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :

                        request.status === 'PENDING_PROOF_REVIEW' ? 'bg-yellow-100 text-yellow-800' :

                          'bg-secondary-100 text-secondary-800'

                      }`}

                  >

                    {request.status}

                  </span>

                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">

                  {new Date(request.createdAt).toLocaleDateString()}

                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">

                  <div className="flex items-center gap-2">

                    <button

                      onClick={() => handleViewRequest(request._id)}

                      className="text-primary-600 hover:text-primary-900 text-xs font-medium"

                    >

                      View

                    </button>

                    {request.status === 'PENDING_PROOF_REVIEW' && (

                      <>

                        <button

                          onClick={() => onApprove(request._id)}

                          className="px-2 py-1 text-xs font-semibold text-white bg-green-600 rounded"

                        >

                          Approve

                        </button>

                        <button

                          onClick={() => onReject(request._id)}

                          className="px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded"

                        >

                          Reject

                        </button>

                      </>

                    )}

                  </div>

                </td>

              </tr>

            )

          })}

        </tbody>

      </table>

    </div>

  );

};



// WithdrawalRequestsTable component for managing withdrawal requests
const WithdrawalRequestsTable = ({ requests, loading, error, onApprove, onReject }) => {
  const [expandedRequestId, setExpandedRequestId] = useState(null);

  const toggleDetails = (requestId) => {
    setExpandedRequestId((prev) => (prev === requestId ? null : requestId));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-4">
        Error loading withdrawal requests: {error}
      </div>
    )
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center py-8 text-secondary-500">
        No withdrawal requests found
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-secondary-200">
        <thead className="bg-secondary-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Method
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Created Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-secondary-200">
          {requests.map((request) => (
            <React.Fragment key={request._id}>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-secondary-900">
                    {request.lawyer?.name || 'Unknown User'}
                  </div>
                  <div className="text-sm text-secondary-500">
                    {request.lawyer?.email || 'No email'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                  PKR {request.requestedAmountPkr?.toLocaleString() || '0'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-secondary-900">
                    {PAYMENT_METHOD_LABELS[request.payoutMethod] || request.payoutMethod}
                  </div>
                  {request.payoutDetailsSnapshot?.accountNumberOrIban && (
                    <div className="text-xs text-secondary-500">
                      Acc: {request.payoutDetailsSnapshot.accountNumberOrIban}
                    </div>
                  )}
                  <button
                    onClick={() => toggleDetails(request._id)}
                    className="text-xs text-primary-600 hover:text-primary-800 mt-1"
                  >
                    {expandedRequestId === request._id ? 'Hide payout info' : 'View payout details'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${request.status === 'PENDING_ADMIN_ACTION'
                    ? 'bg-yellow-100 text-yellow-800'
                    : request.status === 'PAID'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                    }`}>
                    {request.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                  {new Date(request.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {request.status === 'PENDING_ADMIN_ACTION' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onApprove(request._id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onReject(request._id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {request.status !== 'PENDING_ADMIN_ACTION' && (
                    <span className="text-secondary-400">No actions available</span>
                  )}
                </td>
              </tr>
              {expandedRequestId === request._id && (
                <tr>
                  <td colSpan={6} className="bg-secondary-50 px-6 py-4 text-sm text-secondary-700 space-y-2">
                    <div>
                      <span className="font-semibold text-secondary-900">Payment Method:</span>{' '}
                      {PAYMENT_METHOD_LABELS[request.payoutMethod] || request.payoutMethod}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-secondary-600">
                      <div>
                        <span className="font-medium text-secondary-800">Account Holder:</span>{' '}
                        {request.payoutDetailsSnapshot?.accountName || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium text-secondary-800">Account/IBAN:</span>{' '}
                        {request.payoutDetailsSnapshot?.accountNumberOrIban || 'N/A'}
                      </div>
                      {request.payoutDetailsSnapshot?.extra?.instructions && (
                        <div className="w-full">
                          <span className="font-medium text-secondary-800">Instructions:</span>{' '}
                          {request.payoutDetailsSnapshot.extra.instructions}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-secondary-800">User Note:</span>{' '}
                      {request.adminNote || 'No note provided'}
                    </div>
                    {request.disbursementReference && (
                      <div>
                        <span className="font-medium text-secondary-800">Transaction ID:</span>{' '}
                        {request.disbursementReference}
                      </div>
                    )}
                    {request.adminProofUrl && (
                      <div>
                        <a
                          href={request.adminProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 underline"
                        >
                          View receipt / proof
                        </a>
                      </div>
                    )}
                    <p className="text-xs text-secondary-500">
                      Transfer funds manually to the above account before marking the request paid. Upload the payment proof and enter the reference while approving.
                    </p>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const RefundRequestsTable = ({ requests = [], onDecide }) => {
  if (!requests.length) {
    return <div className="text-center py-8 text-secondary-500">No refund requests</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-secondary-200">
        <thead className="bg-secondary-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Client</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Lawyer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Reason</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Requested</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-secondary-200">
          {requests.map((request) => (
            <tr key={request._id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                <div className="font-medium">{request.client?.name}</div>
                <div className="text-secondary-500">{request.client?.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                <div className="font-medium">{request.lawyer?.name}</div>
                <div className="text-secondary-500">{request.lawyer?.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                ₨{request.amount?.toLocaleString() || request.amount?.toString() || '0'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600 max-w-xs">
                {request.refundReason || '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs rounded-full ${request.refundStatus === 'REQUESTED'
                  ? 'bg-yellow-100 text-yellow-800'
                  : request.refundStatus === 'APPROVED'
                    ? 'bg-green-100 text-green-800'
                    : request.refundStatus === 'REJECTED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-secondary-100 text-secondary-700'
                  }`}>
                  {request.refundStatus}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                {request.refundRequestedAt ? new Date(request.refundRequestedAt).toLocaleString() : '—'}
              </td>
              <td className="px-6 py-4 text-sm font-medium">
                <div className="flex flex-col gap-2">
                  {/* Display all refund proofs if available */}
                  {request.refundProofUrls && request.refundProofUrls.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {request.refundProofUrls.map((proofUrl, index) => (
                        <a
                          key={index}
                          href={proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-2 py-1 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded text-xs border border-primary-200"
                        >
                          📎 Proof {index + 1}
                        </a>
                      ))}
                    </div>
                  ) : request.refundProofUrl ? (
                    // Fallback to single proof URL for backward compatibility
                    <a
                      href={request.refundProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-600 hover:text-primary-800"
                    >
                      View Proof
                    </a>
                  ) : null}

                  {/* Action buttons */}
                  {request.refundStatus === 'REQUESTED' && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => onDecide(request._id, 'approve')}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onDecide(request._id, 'reject')}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default AdminDashboard
