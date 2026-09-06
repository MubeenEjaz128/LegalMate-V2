import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
// Use relative path for single port deployment
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000, // Increased timeout to 60 seconds for AI processing
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include credentials for same-origin requests
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const authStorage = localStorage.getItem('auth-storage');

    if (authStorage) {
      try {
        const authData = JSON.parse(authStorage);
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`;
        }
      } catch (error) {
        console.error('Error parsing auth token:', error);
        // Clear corrupted storage
        localStorage.removeItem('auth-storage');
      }
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, config } = error;

    if (response) {
      switch (response.status) {
        case 401: {
          const isSessionReplaced = response.data?.code === 'SESSION_REPLACED';
          localStorage.removeItem('auth-storage');
          if (isSessionReplaced) {
            // Store message so login page can show it
            sessionStorage.setItem('session-replaced', '1');
          }
          window.location.href = '/login';
          break;
        }
        case 403:
          toast.error('Access denied. You do not have permission to perform this action.');
          break;
        case 404:
          // Skip toast for chat history endpoint to let frontend handle it
          // Skip toast for chat history endpoint to let frontend handle it
          if (config.url.includes('/chat/history/') || config.url.includes('/system-settings/')) {
            return Promise.reject(error);
          }
          toast.error('Resource not found.');
          break;
        case 422:
          const errors = response.data?.errors || response.data?.message;
          if (Array.isArray(errors)) {
            errors.forEach((err) => toast.error(err));
          } else {
            toast.error(errors || 'Validation failed');
          }
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(response.data?.message || 'An error occurred');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred');
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  getUserProfile: (id) => api.get(`/auth/user/${id}`), // Generic user profile
  toggleAvailability: () => api.patch('/auth/toggle-availability'),
};

export const lawyerAPI = {
  search: (filters) => api.get('/lawyers/search', { params: filters }),
  getById: (id) => api.get(`/lawyers/${id}`),
  getProfile: (id) => api.get(`/lawyers/profile/${id}`),
  getAvailability: (id, date) => api.get(`/lawyers/availability/${id}`, { params: { date } }),
  getReviews: (id) => api.get(`/lawyers/reviews/${id}`),
};

export const appointmentAPI = {
  book: (appointmentData) => api.post('/appointments', appointmentData),
  list: (filters) => api.get('/appointments', { params: filters }),
  getById: (id) => api.get(`/appointments/${id}`),
  cancel: (id) => api.patch(`/appointments/${id}/cancel`),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  updateStatus: (id, statusData) => api.patch(`/appointments/${id}/status`, statusData),
  adminUpdateStatus: (id, statusData) => api.patch(`/appointments/${id}/admin-status`, statusData),
  pay: (id) => api.post(`/appointments/${id}/pay`),
  requestRefund: (id, formData) => api.post(`/appointments/${id}/request-refund`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  decideRefund: (id, data) => api.patch(`/appointments/${id}/refund-decision`, data),
  adminApprove: (id) => api.post(`/appointments/${id}/approve`),
  adminApproveRefund: (id) => api.post(`/appointments/${id}/approve-refund`),
  reschedule: (id, rescheduleData) => api.patch(`/appointments/${id}/reschedule`, rescheduleData),
  submitFeedback: (id, feedbackData) => api.post(`/appointments/${id}/feedback`, feedbackData),
};

export const feedbackAPI = {
  submit: (feedbackData) => api.post('/feedback/submit', feedbackData),
  getByLawyer: (lawyerId) => api.get(`/feedback/lawyer/${lawyerId}`),
  list: (filters) => api.get('/feedback/list', { params: filters }),
};

export const chatAPI = {
  getHistory: (userId) => api.get(`/chat/history/${userId}`),
  getHistoryForLawyer: (lawyerId) => api.get(`/chat/history/lawyer/${lawyerId}`),
  sendMessage: (messageData) => api.post('/chat/message', messageData, {
    headers: messageData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
  }),
  sendMessageDirect: (conversationId, messageData) => api.post(`/chat/${conversationId}/message`, messageData, {
    headers: messageData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
  }),
  getConversation: (conversationId) => api.get(`/chat/conversation/${conversationId}`),
  getConversationMessages: (conversationId) => api.get(`/chat/${conversationId}`),
  markAsRead: (conversationId) => api.patch(`/chat/${conversationId}/read`),
  uploadAttachment: (formData) => api.post(`/chat/${formData.get('conversationId')}/attachment`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  createGroup: (data) => api.post('/chat/group', data),
  listConversations: () => api.get('/chat/conversations'),
  addGroupMember: (groupId, memberId) => api.post(`/chat/group/${groupId}/add`, { memberId }),
  removeGroupMember: (groupId, memberId) => api.post(`/chat/group/${groupId}/remove`, { memberId }),
  sendGroupMessage: (conversationId, messageData) => api.post(`/chat/${conversationId}/group-message`, messageData, {
    headers: messageData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
  }),
  updateGroupAvatar: (groupId, formData) => api.post(`/chat/group/${groupId}/avatar`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  addGroupAdmin: (groupId, adminId) => api.post(`/chat/group/${groupId}/add-admin`, { adminId }),
  removeGroupAdmin: (groupId, adminId) => api.post(`/chat/group/${groupId}/remove-admin`, { adminId }),
  deleteConversation: (conversationId) => api.delete(`/chat/conversation/${conversationId}`),
  getFileUrl: (filename) => `${api.defaults.baseURL}/chat/file/${filename}`,
};

export const adminAPI = {
  // Messaging Oversight
  getMessagingConversations: (filters) => api.get('/admin/messaging/conversations', { params: filters }),
  getMessagingStats: () => api.get('/admin/messaging/stats'),
  updateConversationNotes: (conversationId, data) => api.patch(`/admin/messaging/conversations/${conversationId}/notes`, data),
  archiveConversation: (conversationId, data) => api.post(`/admin/messaging/conversations/${conversationId}/archive`, data),
  deleteConversation: (conversationId) => api.delete(`/admin/messaging/conversations/${conversationId}`),
  deleteMessage: (messageId) => api.delete(`/admin/messaging/messages/${messageId}`),
  getConversationMessages: (conversationId) => api.get(`/admin/messaging/conversations/${conversationId}/messages`),
  verifyLawyer: (lawyerId, status) => api.put(`/admin/verify-lawyer/${lawyerId}`, { status }),
  getPendingLawyers: () => api.get('/admin/pending-lawyers'),
  moderateContent: (contentId, action) => api.put(`/admin/moderate-content/${contentId}`, { action }),
  getAnalytics: () => api.get('/admin/stats'),
  getRealtimeStats: () => api.get('/admin/stats'),
  getUsers: (filters) => api.get('/admin/users', { params: filters }),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
  getAppointments: (filters) => api.get('/admin/appointments', { params: filters }),
  getPayments: (filters) => api.get('/admin/payments', { params: filters }),
  getChats: (filters) => api.get('/admin/chats', { params: filters }),
  getInvoices: (filters) => api.get('/admin/invoices', { params: filters }),
  getFeedback: (filters) => api.get('/admin/feedback', { params: filters }),
  getLogs: (filters) => api.get('/admin/logs', { params: filters }),
  getUserList: (filters) => api.get('/admin/users', { params: filters }),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  updateUserStatus: (userId, statusData) => api.patch(`/admin/users/${userId}/status`, statusData),
  deleteUser: (userId, data) => api.delete(`/admin/users/${userId}`, { data }),
  getChatLogs: (params) => api.get('/admin/chat-logs', { params }),
  getVideoCallLogs: (params) => api.get('/admin/video-call-logs', { params }),
  // PKR Balance Management
  getBalanceRequests: (filters) => api.get('/buy-balance/admin/requests', { params: filters }),
  getBalanceRequest: (requestId) => api.get(`/buy-balance/admin/requests/${requestId}`),
  approveBalanceRequest: (requestId, data) => api.patch(`/buy-balance/admin/requests/${requestId}/approve`, data),
  rejectBalanceRequest: (requestId, data) => api.patch(`/buy-balance/admin/requests/${requestId}/reject`, data),
  needMoreInfoBalanceRequest: (requestId, data) => api.patch(`/buy-balance/admin/requests/${requestId}/need-info`, data),
  getUserBalances: (filters) => api.get('/admin/user-balances', { params: filters }),
  getTransactions: (filters) => api.get('/admin/transactions', { params: filters }),
  // Payment Methods Management
  getAllPaymentMethods: () => api.get('/payment-methods/admin/all'),
  createPaymentMethod: (data) => api.post('/payment-methods/admin', data),
  updatePaymentMethod: (id, data) => api.put(`/payment-methods/admin/${id}`, data),
  deletePaymentMethod: (id) => api.delete(`/payment-methods/admin/${id}`),
  togglePaymentMethod: (id) => api.patch(`/payment-methods/admin/${id}/toggle`),
  // Withdrawal Requests Management
  getWithdrawalRequests: (filters) => api.get('/admin/withdrawal-requests', { params: filters }),
  approveWithdrawalRequest: (requestId, data) =>
    api.patch(`/admin/withdrawal-requests/${requestId}/approve`, data),
  rejectWithdrawalRequest: (requestId, data) => api.patch(`/admin/withdrawal-requests/${requestId}/reject`, data),
  // Refund Requests Management
  getRefundRequests: (filters) => api.get('/admin/refund-requests', { params: filters }),
  decideRefundRequest: (appointmentId, data) => api.patch(`/appointments/${appointmentId}/refund-decision`, data),
  // System Settings
  getSystemSetting: (key) => api.get(`/admin/system-settings/${key}`),
  getPublicSystemSetting: (key) => api.get(`/admin/system-settings/public/${key}`),
  updateSystemSetting: (key, value) => api.post(`/admin/system-settings/${key}`, { value }),
  // Data Reset Management
  getResetCollections: () => api.get('/admin/data-reset/collections'),
  resetCollections: (collections, confirmText) => api.post('/admin/data-reset/reset', { collections, confirmText }),
  // Video Call Recordings Oversight
  getVideoRecordings: (params) => api.get('/video-recordings/admin/all', { params }),
  getVideoRecording: (id) => api.get(`/video-recordings/admin/${id}`),
  deleteVideoRecording: (id) => api.delete(`/video-recordings/admin/${id}`),

  // Notifications
  getNotifications: (params) => api.get('/admin/notifications', { params }),
  getUnreadNotificationCount: () => api.get('/admin/notifications/unread-count'),
  markNotificationRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/admin/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/admin/notifications/${id}`),
};

export const aiAPI = {
  chat: (message, sessionId, config = {}) => api.post('/ai/chat', {
    message,
    sessionId
  }, {
    timeout: 120000, ...config // Default 120s, allow override
  }),
  createSession: () => api.post('/ai/sessions'),
  getSessions: () => api.get('/ai/sessions'),
  getSessionMessages: (sessionId) => api.get(`/ai/sessions/${sessionId}/messages`),

  // Legacy/Unused endpoints (kept for compatibility if needed, but should be phased out)
  initSession: (sessionId) => api.post('/ai/chat/session/init', { sessionId }),
  getChatHistory: (sessionId, limit = 50) => api.get(`/ai/chat/history/${sessionId}`, {
    params: { limit }
  }),
  getChatSessions: (limit = 20) => api.get('/ai/chat/sessions', {
    params: { limit }
  }),
  deleteSession: (sessionId) => api.delete(`/ai/chat/sessions/${sessionId}`),
  getChatStats: () => api.get('/ai/chat/stats'),
};



export const balanceAPI = {
  // Balance management
  getBalance: () => api.get('/buy-balance/balance'),
  getBalanceInfo: () => api.get('/lawyer-withdraw/balance'), // Balance and limits info
  getPaymentMethods: () => api.get('/buy-balance/payment-methods'),

  // Buy balance requests
  createRequest: (data) => api.post('/buy-balance/request', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
  }),
  getRequests: (params) => api.get('/buy-balance/requests', { params }),
  getRequest: (id) => api.get(`/buy-balance/requests/${id}`),
  getWithdrawalRequest: (id) => api.get(`/lawyer-withdraw/requests/${id}`),
  cancelRequest: (id) => api.delete(`/buy-balance/requests/${id}`),

  // Payout profiles
  getPayoutProfiles: () => api.get('/lawyer-payout-profiles'),
  getPayoutProfile: (id) => api.get(`/lawyer-payout-profiles/${id}`),
  createPayoutProfile: (data) => api.post('/lawyer-payout-profiles', data),
  updatePayoutProfile: (id, data) => api.put(`/lawyer-payout-profiles/${id}`, data),
  deletePayoutProfile: (id) => api.delete(`/lawyer-payout-profiles/${id}`),
  setDefaultPayoutProfile: (id) => api.post(`/lawyer-payout-profiles/${id}/set-default`),

  // Withdrawal requests
  createWithdrawalRequest: (data) => api.post('/lawyer-withdraw/request', data),
  getWithdrawalRequests: (params) => api.get('/lawyer-withdraw/requests', { params }),
  getWithdrawalRequest: (id) => api.get(`/lawyer-withdraw/requests/${id}`),
  cancelWithdrawalRequest: (id) => api.patch(`/lawyer-withdraw/requests/${id}/cancel`),
  confirmWithdrawalRequest: (id, data) => api.patch(`/lawyer-withdraw/requests/${id}/confirm`, data),

  // Transaction history
  getTransactionHistory: (params) => api.get('/wallet/transactions', { params }),
  getWalletTransactions: (params) => api.get('/wallet/transactions', { params })
};

// Services API
export const servicesAPI = {
  getServices: () => api.get('/services'),
  getService: (id) => api.get(`/services/${id}`),
  // Admin
  getAllServices: (params) => api.get('/services/admin/all', { params }),
  createService: (data) => api.post('/services', data),
  updateService: (id, data) => api.put(`/services/${id}`, data),
  deleteService: (id) => api.delete(`/services/${id}`)
};

// Contact API
export const contactAPI = {
  sendMessage: (data) => api.post('/contact', data),
  // Admin
  getMessages: (params) => api.get('/contact', { params }),
  getMessage: (id) => api.get(`/contact/${id}`),
  replyMessage: (id, data) => api.post(`/contact/${id}/reply`, data),
  deleteMessage: (id) => api.delete(`/contact/${id}`)
};

// Blogs API
export const blogsAPI = {
  getBlogs: (params) => api.get('/blogs', { params }),
  getBlogBySlug: (slug) => api.get(`/blogs/slug/${slug}`),
  likeBlog: (id) => api.post(`/blogs/${id}/like`),
  // Admin
  getAllBlogs: (params) => api.get('/blogs/admin/all', { params }),
  getBlogById: (id) => api.get(`/blogs/admin/${id}`),
  createBlog: (data) => api.post('/blogs', data),
  updateBlog: (id, data) => api.put(`/blogs/${id}`, data),
  deleteBlog: (id) => api.delete(`/blogs/${id}`)
};

// Pages API
export const pagesAPI = {
  getPage: (name) => api.get(`/pages/${name}`),
  // Admin
  getAllPages: () => api.get('/pages/admin/all'),
  updatePage: (name, data) => api.put(`/pages/${name}`, data)
};

// FAQs API
export const faqsAPI = {
  getFAQs: (params) => api.get('/faqs', { params }),
  // Admin
  getAllFAQs: (params) => api.get('/faqs/admin/all', { params }),
  createFAQ: (data) => api.post('/faqs', data),
  updateFAQ: (id, data) => api.put(`/faqs/${id}`, data),
  deleteFAQ: (id) => api.delete(`/faqs/${id}`)
};

// Public Stats API (no auth required — home page real-time data)
export const publicAPI = {
  getStats: () => api.get('/public/stats'),
};

export default api;
