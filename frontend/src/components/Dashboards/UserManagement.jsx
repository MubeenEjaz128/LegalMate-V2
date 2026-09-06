import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Users, Search, Filter, Edit, Eye, Trash2, CheckCircle, XCircle, Mail, Phone, MapPin, Calendar, Shield } from 'lucide-react';
import api, { adminAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const UserManagement = ({ onClose }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  const { token, user } = useAuthStore();

  // Check authentication and admin role
  useEffect(() => {
    if (!token) {
      toast.error('Please login to access user management');
      onClose();
      return;
    }
    
    if (user && user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      onClose();
      return;
    }
  }, [token, user, onClose]);

  useEffect(() => {
    fetchUsers();
  }, [currentPage]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Fetching users...');
      const response = await adminAPI.getUserList({
        page: currentPage,
        limit: 10
      });
      console.log('✅ Users fetched successfully:', response.data);
      setUsers(response.data.users || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => 
        statusFilter === 'active' ? user.isActive : !user.isActive
      );
    }

    setFilteredUsers(filtered);
  };

  const handleUpdateUserStatus = async (userId, isActive) => {
    try {
      await adminAPI.updateUserStatus(userId, { isActive });
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
      console.error('Error updating user status:', error);
    }
  };

  const handleUpdateUserVerification = async (userId, isVerified) => {
    try {
      console.log(`🔄 Updating user ${userId} verification status to: ${isVerified}`);
      console.log('🔑 Current token:', token ? token.substring(0, 20) + '...' : 'No token');
      console.log('👤 Current user:', user);
      
      // Direct API call for debugging
      const response = await api.patch(`/admin/users/${userId}/status`, { isVerified });
      console.log('✅ Verification update response:', response.data);
      toast.success(`User ${isVerified ? 'verified' : 'unverified'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('❌ Error updating user verification:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      const backendMsg = error?.response?.data?.message || error.message || 'Failed to update user verification';
      toast.error(`Verification update failed: ${backendMsg}`);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  // Delete user handler
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
      closeUserModal();
    } catch (error) {
      console.error('Error deleting user:', error);
      const backendMsg = error?.response?.data?.message || error.message || 'Failed to delete user';
      toast.error(`Delete failed: ${backendMsg}`);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'badge-error',
      lawyer: 'badge-primary',
      client: 'badge-success'
    };
    return badges[role] || 'badge-secondary';
  };

  const getStatusBadge = (isActive) => {
    return isActive ? 'badge-success' : 'badge-error';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Test function for debugging
  const testUnverifyAPI = async () => {
    try {
      const lawyers = users.filter(u => u.role === 'lawyer');
      if (lawyers.length === 0) {
        toast.error('No lawyers found to test with');
        return;
      }
      
      const testLawyer = lawyers[0];
      console.log('🧪 Testing unverify API with lawyer:', testLawyer.name);
      
      const response = await api.patch(`/admin/users/${testLawyer._id}/status`, { 
        isVerified: !testLawyer.isVerified 
      });
      
      console.log('✅ Test successful:', response.data);
      toast.success('Test successful! Check console for details.');
      fetchUsers();
    } catch (error) {
      console.error('❌ Test failed:', error);
      toast.error('Test failed! Check console for details.');
    }
  };
  

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-secondary-200">
            <div>
              <h2 className="text-2xl font-bold text-secondary-900">User Management</h2>
              <p className="text-secondary-600">Manage all users in the system</p>
            </div>
            <button
              onClick={onClose}
              className="text-secondary-400 hover:text-secondary-600 transition-colors"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-secondary-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="select-field"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="lawyer">Lawyer</option>
                <option value="client">Client</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select-field"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={fetchUsers}
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* User List */}
          <div className="overflow-y-auto max-h-[60vh]">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
                <p className="text-secondary-600">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <p className="text-secondary-600">No users found</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid gap-4">
                  {filteredUsers.map((user) => (
                    <div key={user._id} className="border border-secondary-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-secondary-900">{user.name}</h3>
                            <p className="text-sm text-secondary-600">{user.email}</p>
                            <div className="flex gap-2 mt-1">
                              <span className={`badge ${getRoleBadge(user.role)}`}>
                                {user.role}
                              </span>
                              <span className={`badge ${getStatusBadge(user.isActive)}`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                              {user.role === 'lawyer' && (
                                <span className={`badge ${user.isVerified ? 'badge-success' : 'badge-warning'}`}>
                                  {user.isVerified ? 'Verified' : 'Pending'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="btn-outline px-3 py-2 text-sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => handleUpdateUserStatus(user._id, !user.isActive)}
                            className={`px-3 py-2 text-sm rounded-lg ${
                              user.isActive 
                                ? 'bg-error-100 text-error-700 hover:bg-error-200' 
                                : 'bg-success-100 text-success-700 hover:bg-success-200'
                            }`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          {user.role === 'lawyer' && (
                            <button
                              onClick={() => handleUpdateUserVerification(user._id, !user.isVerified)}
                              className={`px-3 py-2 text-sm rounded-lg ${
                                user.isVerified 
                                  ? 'bg-warning-100 text-warning-700 hover:bg-warning-200' 
                                  : 'bg-success-100 text-success-700 hover:bg-success-200'
                              }`}
                            >
                              {user.isVerified ? 'Unverify' : 'Verify'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-secondary-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-secondary-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="btn-outline px-3 py-2 text-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-outline px-3 py-2 text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-secondary-200">
              <div>
                <h2 className="text-xl font-bold text-secondary-900">User Details</h2>
                <p className="text-secondary-600">Detailed information about {selectedUser.name}</p>
              </div>
              <button
                onClick={closeUserModal}
                className="text-secondary-400 hover:text-secondary-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Full Name</label>
                      <p className="text-secondary-900 font-medium">{selectedUser.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Email</label>
                      <p className="text-secondary-900 font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Phone</label>
                      <p className="text-secondary-900 font-medium">{selectedUser.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Address</label>
                      <p className="text-secondary-900 font-medium">{selectedUser.address || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Role</label>
                      <span className={`badge ${getRoleBadge(selectedUser.role)}`}>
                        {selectedUser.role}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
                      <span className={`badge ${getStatusBadge(selectedUser.isActive)}`}>
                        {selectedUser.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {selectedUser.role === 'lawyer' && (
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Verification</label>
                        <span className={`badge ${selectedUser.isVerified ? 'badge-success' : 'badge-warning'}`}>
                          {selectedUser.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">Member Since</label>
                      <p className="text-secondary-900 font-medium">{formatDate(selectedUser.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Lawyer-specific Information */}
                {selectedUser.role === 'lawyer' && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">Lawyer Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Specialization</label>
                        <p className="text-secondary-900 font-medium">{selectedUser.specialization || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Bar Number</label>
                        <p className="text-secondary-900 font-medium">{selectedUser.barNumber || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Hourly Rate</label>
                        <p className="text-secondary-900 font-medium">
                          {selectedUser.hourlyRate ? `$${selectedUser.hourlyRate}/hour` : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Languages</label>
                        <p className="text-secondary-900 font-medium">
                          {selectedUser.languages && selectedUser.languages.length > 0 
                            ? selectedUser.languages.join(', ') 
                            : 'Not specified'}
                        </p>
                      </div>
                      {selectedUser.bio && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-secondary-700 mb-1">Bio</label>
                          <p className="text-secondary-900">{selectedUser.bio}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Account Actions */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">Account Actions</h3>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => {
                        handleUpdateUserStatus(selectedUser._id, !selectedUser.isActive);
                        closeUserModal();
                      }}
                      className={`px-4 py-2 text-sm rounded-lg ${
                        selectedUser.isActive 
                          ? 'bg-error-100 text-error-700 hover:bg-error-200' 
                          : 'bg-success-100 text-success-700 hover:bg-success-200'
                      }`}
                    >
                      {selectedUser.isActive ? 'Deactivate Account' : 'Activate Account'}
                    </button>
                    {selectedUser.role === 'lawyer' && (
                      <button
                        onClick={() => {
                          handleUpdateUserVerification(selectedUser._id, !selectedUser.isVerified);
                          closeUserModal();
                        }}
                        className={`px-4 py-2 text-sm rounded-lg ${
                          selectedUser.isVerified 
                            ? 'bg-warning-100 text-warning-700 hover:bg-warning-200' 
                            : 'bg-success-100 text-success-700 hover:bg-success-200'
                        }`}
                      >
                        {selectedUser.isVerified ? 'Unverify Lawyer' : 'Verify Lawyer'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(selectedUser._id)}
                      className="px-4 py-2 text-sm rounded-lg bg-error-600 text-white hover:bg-error-700"
                    >
                      Delete User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement; 