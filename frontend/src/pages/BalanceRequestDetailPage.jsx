import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Clock, CheckCircle, XCircle, Upload, AlertCircle, Calendar, User, CreditCard, FileText } from 'lucide-react';
import { balanceAPI, adminAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const WITHDRAWAL_METHOD_LABELS = {
  JAZZCASH: 'JazzCash',
  EASYPAYSA: 'EasyPaisa',
  NAYAPAY: 'NayaPay',
  BANK: 'Bank Transfer'
};

const BalanceRequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethodDetails, setPaymentMethodDetails] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchRequestDetails();
  }, [id, user, navigate]);

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      // Use admin API if user is admin, otherwise use client API
      const response = user?.role === 'admin' 
        ? await adminAPI.getBalanceRequest(id)
        : await balanceAPI.getRequest(id);

      console.log('Request details response:', response.data);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      const requestData = response.data?.request || response.data;
      setRequest(requestData);
      
      // Fetch payment method details if method is available
      if (requestData.method) {
        try {
          const methodsResponse = await balanceAPI.getPaymentMethods();
          const methods = methodsResponse.data?.paymentMethods || [];
          const matchingMethod = methods.find(m => m.method === requestData.method);
          setPaymentMethodDetails(matchingMethod || null);
        } catch (err) {
          console.error('Error fetching payment methods:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to fetch request details');
      navigate(user?.role === 'admin' ? '/dashboard' : '/balance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      'PENDING_PROOF_REVIEW': { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: Clock,
        text: 'Pending Review'
      },
      'APPROVED': { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: CheckCircle,
        text: 'Approved'
      },
      'REJECTED': { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: XCircle,
        text: 'Rejected'
      },
      'NEEDS_MORE_INFO': { 
        color: 'bg-orange-100 text-orange-800 border-orange-200', 
        icon: AlertCircle,
        text: 'Needs More Info'
      }
    };
    
    return configs[status] || configs['PENDING_PROOF_REVIEW'];
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      console.log('No date string provided');
      return 'No date available';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.log('Invalid date string:', dateString);
      return 'Invalid date';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCancelRequest = async () => {
    if (request.status !== 'PENDING_PROOF_REVIEW') {
      toast.error('Only pending requests can be cancelled');
      return;
    }
    
    if (!window.confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    try {
      await balanceAPI.cancelRequest(id);
      toast.success('Request cancelled successfully');
      navigate(user?.role === 'admin' ? '/dashboard' : '/balance');
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel request');
    }
  };

  const handleApproveRequest = async () => {
    const amountInput = window.prompt(
      `Enter the approved amount (PKR):\n\nRequested: ₨${request.requestedAmountPkr?.toLocaleString()}`,
      request.requestedAmountPkr
    );
    
    if (!amountInput) return;
    
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount');
      return;
    }

    const note = window.prompt('Add admin note (optional):');

    try {
      await adminAPI.approveBalanceRequest(id, {
        finalApprovedAmountPkr: amount,
        adminNote: note || ''
      });
      toast.success('Request approved successfully');
      fetchRequestDetails();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async () => {
    const reason = window.prompt('Enter rejection reason:');
    
    if (!reason) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      await adminAPI.rejectBalanceRequest(id, { reason });
      toast.success('Request rejected successfully');
      fetchRequestDetails();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-secondary-300 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-secondary-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-secondary-900 mb-4">Request Not Found</h1>
          <p className="text-secondary-600 mb-4">The requested balance request could not be found.</p>
          <button
            onClick={() => navigate(user?.role === 'admin' ? '/dashboard' : '/balance')}
            className="btn-primary"
          >
            Back to {user?.role === 'admin' ? 'Dashboard' : 'Balance'}
          </button>
        </div>
      </div>
    );
  }

  console.log('Request data for display:', request);
  console.log('Proof attachment URL:', request.proofAttachmentUrl);
  console.log('Request ID:', request._id);
  console.log('Requested Amount:', request.requestedAmountPkr);
  console.log('Payment Method:', request.payoutMethod);
  console.log('Created At:', request.createdAt);
  console.log('Status:', request.status);

  const statusConfig = getStatusConfig(request.status);
  const StatusIcon = statusConfig.icon;
  
  // For Buy Balance requests, method is stored in 'method' field
  const paymentMethod = request.method || request.payoutMethod;
  const methodLabel = WITHDRAWAL_METHOD_LABELS[paymentMethod] || paymentMethod;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/balance')}
          className="flex items-center text-secondary-600 hover:text-secondary-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Balance
        </button>
        <h1 className="text-3xl font-bold text-secondary-900">Balance Request Details</h1>
      </div>

      {/* Request Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${statusConfig.color}`}>
              <StatusIcon className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-secondary-900">Request Status</h2>
              <p className="text-secondary-600">{statusConfig.text}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-secondary-500">Request ID</p>
            <p className="font-mono text-sm text-secondary-900">{request._id}</p>
          </div>
        </div>
      </div>

      {/* Request Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Amount and Payment Method */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Payment Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700">Requested Amount</label>
              <p className="text-2xl font-bold text-secondary-900">₨{request.requestedAmountPkr?.toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700">Payment Method</label>
              <div className="flex items-center mt-1">
                <CreditCard className="h-4 w-4 text-secondary-400 mr-2" />
                <span className="text-secondary-900">{methodLabel}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700">
                Admin Payment Account
                <span className="text-xs text-secondary-500 ml-1">(Where you sent money)</span>
              </label>
              <div className="text-secondary-900 text-sm mt-1">
                {paymentMethodDetails ? (
                  <>
                    <p>
                      <span className="font-medium">Account Name:</span>{' '}
                      {paymentMethodDetails.accountName}
                    </p>
                    <p>
                      <span className="font-medium">Account Number:</span>{' '}
                      {paymentMethodDetails.accountNumber}
                    </p>
                  </>
                ) : (
                  <p className="text-secondary-500 italic">Payment method details not available</p>
                )}
              </div>
            </div>
            {request.userReference && (
              <div>
                <label className="block text-sm font-medium text-secondary-700">
                  Your Transaction Reference
                </label>
                <p className="text-secondary-900 font-mono text-sm mt-1">{request.userReference}</p>
              </div>
            )}
          </div>
        </div>

        {/* Request Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Request Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700">Requested Date</label>
              <p className="text-secondary-900">{formatDate(request.createdAt)}</p>
            </div>
            {request.updatedAt && request.updatedAt !== request.createdAt && (
              <div>
                <label className="block text-sm font-medium text-secondary-700">Last Updated</label>
                <p className="text-secondary-900">{formatDate(request.updatedAt)}</p>
              </div>
            )}
            {request.adminNote && (
              <div>
                <label className="block text-sm font-medium text-secondary-700">Admin Note</label>
                <p className="text-secondary-900 bg-secondary-50 p-3 rounded-lg">{request.adminNote}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Note */}
      {request.userNote && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Your Note
          </h3>
          <p className="text-secondary-900 bg-secondary-50 p-4 rounded-lg">{request.userNote}</p>
        </div>
      )}

      {/* Payment Proof */}
      {request.proofAttachmentUrl && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Payment Proof
          </h3>
          <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-secondary-400 mr-3" />
              <div>
                <p className="font-medium text-secondary-900">Payment Proof Document</p>
                <p className="text-sm text-secondary-500">Uploaded on {formatDate(request.createdAt)}</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (request.proofAttachmentUrl) {
                  console.log('Opening document URL:', request.proofAttachmentUrl);
                  window.open(request.proofAttachmentUrl, '_blank');
                } else {
                  console.log('No proof attachment URL found');
                  toast.error('No document available');
                }
              }}
              className="btn-outline"
            >
              View Document
            </button>
          </div>
        </div>
      )}
      {request.adminProofUrl && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Admin Transfer Proof
          </h3>
          <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-secondary-400 mr-3" />
              <div>
                <p className="font-medium text-secondary-900">Admin Uploaded Receipt</p>
                <p className="text-sm text-secondary-500">Displayed after manual transfer</p>
              </div>
            </div>
            <a
              href={request.adminProofUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 hover:text-primary-800 underline"
            >
              View Admin Proof
            </a>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Actions</h3>
        <div className="flex gap-4 flex-wrap">
          {/* Admin Actions */}
          {user?.role === 'admin' && request.status === 'PENDING_PROOF_REVIEW' && (
            <>
              <button
                onClick={handleApproveRequest}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Approve Request
              </button>
              <button
                onClick={handleRejectRequest}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Reject Request
              </button>
            </>
          )}
          
          {/* Client Actions */}
          {user?.role === 'client' && request.status === 'PENDING_PROOF_REVIEW' && (
            <button
              onClick={handleCancelRequest}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Cancel Request
            </button>
          )}
          
          <button
            onClick={() => navigate(user?.role === 'admin' ? '/dashboard' : '/balance')}
            className="btn-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {user?.role === 'admin' ? 'Dashboard' : 'Balance'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BalanceRequestDetailPage;
