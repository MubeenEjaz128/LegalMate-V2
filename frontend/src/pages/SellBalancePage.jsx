import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { balanceAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const WITHDRAWAL_METHOD_LABELS = {
  JAZZCASH: 'JazzCash',
  EASYPAYSA: 'EasyPaisa',
  NAYAPAY: 'NayaPay',
  BANK: 'Bank Transfer'
};

const SellBalancePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    requestedAmountPkr: '',
    payoutProfileId: ''
  });
  const [payoutProfiles, setPayoutProfiles] = useState([]);
  const [balance, setBalance] = useState(null);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      const [balanceRes, profilesRes, requestsRes] = await Promise.all([
        balanceAPI.getBalanceInfo(),
        balanceAPI.getPayoutProfiles(),
        balanceAPI.getWithdrawalRequests()
      ]);
      
      setBalance(balanceRes.data);
      setPayoutProfiles(profilesRes.data.profiles || profilesRes.data.payoutProfiles || []);
      setWithdrawRequests(requestsRes.data.requests || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch account information');
    } finally {
      setDataLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.requestedAmountPkr || !formData.payoutProfileId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const requestedAmount = parseFloat(formData.requestedAmountPkr);
    if (requestedAmount < 100) {
      toast.error('Minimum withdrawal amount is 100 PKR');
      return;
    }

    if (requestedAmount > balance.balancePkr) {
      toast.error('Insufficient balance. You cannot withdraw more than your current balance.');
      return;
    }

    try {
      setLoading(true);
      
      await balanceAPI.createWithdrawalRequest({
        requestedAmountPkr: requestedAmount,
        payoutProfileId: formData.payoutProfileId
      });
      
      toast.success('Withdrawal request submitted successfully! It will be processed within 24-48 hours.');
      navigate('/balance');
    } catch (error) {
      console.error('Error creating withdrawal request:', error);
      toast.error('Failed to submit withdrawal request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = async (requestId, status, note = '') => {
    try {
      setConfirmingId(requestId);
      await balanceAPI.confirmWithdrawalRequest(requestId, { status, note });
      toast.success(status === 'CONFIRMED' ? 'Marked as received.' : 'Dispute submitted.');
      fetchData();
    } catch (error) {
      console.error('Error updating confirmation status:', error);
      toast.error('Failed to update confirmation status');
    } finally {
      setConfirmingId(null);
    }
  };

  if (dataLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-secondary-300 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-secondary-300 rounded"></div>
        </div>
      </div>
    );
  }

  const renderStatusBadge = (status) => {
    const map = {
      PENDING_ADMIN_ACTION: 'bg-warning-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-secondary-100 text-secondary-700',
    };
    const label = status?.replace(/_/g, ' ') || 'UNKNOWN';
    return <span className={`px-2 py-1 rounded text-xs font-medium ${map[status] || 'bg-secondary-100 text-secondary-800'}`}>{label}</span>;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/balance')}
          className="flex items-center text-secondary-600 hover:text-secondary-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Balance
        </button>
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">Sell Balance</h1>
        <p className="text-secondary-600">Withdraw funds from your account</p>
      </div>

      {/* Current Balance */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-secondary-600">Available Balance</p>
            <p className="text-2xl font-bold text-secondary-900">
              ₨{balance?.balancePkr?.toLocaleString() || '0'}
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Withdrawal Amount (PKR) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
              <input
                type="number"
                name="requestedAmountPkr"
                value={formData.requestedAmountPkr}
                onChange={handleInputChange}
                placeholder="Enter amount (minimum 100 PKR)"
                min="100"
                max={balance?.balancePkr || 0}
                step="1"
                className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <p className="text-sm text-secondary-500 mt-1">
              Minimum: 100 PKR | Maximum: ₨{balance?.balancePkr?.toLocaleString() || '0'}
            </p>
          </div>

          {/* Payout Profile */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Payout Method *
            </label>
            {payoutProfiles.length === 0 ? (
              <div className="border border-secondary-300 rounded-lg p-4 text-center">
                <AlertCircle className="h-8 w-8 text-warning-500 mx-auto mb-2" />
                <p className="text-sm text-secondary-600 mb-3">No payout profiles found</p>
                <button
                  type="button"
                  onClick={() => navigate('/profile#payout-methods')}
                  className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                >
                  Add payout profile first
                </button>
              </div>
            ) : (
              <select
                name="payoutProfileId"
                value={formData.payoutProfileId}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Select payout method</option>
                {payoutProfiles.map((profile) => (
                  <option key={profile._id} value={profile._id}>
                    {profile.method} - {profile.accountName} ({profile.accountNumberOrIban})
                  </option>
                ))}
              </select>
            )}
            <p className="text-sm text-secondary-500 mt-1">Choose your preferred payout method</p>
          </div>

          {/* Important Information */}
          <div className="bg-warning-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-900 mb-2">Important Information</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Withdrawal requests are processed within 24-48 hours</li>
              <li>• You must have a verified payout profile</li>
              <li>• The amount will be deducted from your balance immediately</li>
              <li>• You can track your withdrawal status in the Balance page</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/balance')}
              className="px-6 py-3 border border-secondary-300 rounded-lg text-secondary-700 hover:bg-secondary-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || payoutProfiles.length === 0}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Withdrawal'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">Recent Withdrawal Requests</h2>
        {withdrawRequests.length === 0 ? (
          <p className="text-sm text-secondary-500">No withdrawal requests yet.</p>
        ) : (
          <div className="space-y-4">
            {withdrawRequests.map((request) => (
              <div key={request._id} className="border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                  <div>
                    <p className="text-sm text-secondary-500">Amount</p>
                    <p className="text-lg font-semibold text-secondary-900">₨{request.requestedAmountPkr?.toLocaleString()}</p>
                  </div>
                  {renderStatusBadge(request.status)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-secondary-600">
                  <p>
                    <span className="font-medium">Method:</span>{' '}
                    {WITHDRAWAL_METHOD_LABELS[request.payoutMethod] || request.payoutMethod}
                  </p>
                  <p><span className="font-medium">Created:</span> {new Date(request.createdAt).toLocaleString()}</p>
                  <p><span className="font-medium">Confirmation:</span> {request.recipientConfirmationStatus}</p>
                  <p><span className="font-medium">Account Holder:</span> {request.payoutDetailsSnapshot?.accountName || 'N/A'}</p>
                  <p><span className="font-medium">Account/IBAN:</span> {request.payoutDetailsSnapshot?.accountNumberOrIban || 'N/A'}</p>
                  {request.payoutDetailsSnapshot?.extra?.instructions && (
                    <p><span className="font-medium">Instructions:</span> {request.payoutDetailsSnapshot.extra.instructions}</p>
                  )}
                  {request.adminProofUrl && (
                    <p>
                      <span className="font-medium">Proof: </span>
                      <a href={request.adminProofUrl} target="_blank" rel="noreferrer" className="text-primary-600 underline">
                        View Receipt
                      </a>
                    </p>
                  )}
                  {!request.adminProofUrl && request.status === 'PAID' && (
                    <p className="text-xs text-secondary-500">
                      Waiting for admin to upload proof and share the transaction reference.
                    </p>
                  )}
                  {request.disbursementReference && (
                    <p><span className="font-medium">Transaction Reference:</span> {request.disbursementReference}</p>
                  )}
                  {request.adminNote && (
                    <p><span className="font-medium">Admin Note:</span> {request.adminNote}</p>
                  )}
                </div>

                {request.status === 'PAID' && request.recipientConfirmationStatus === 'PENDING' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmReceipt(request._id, 'CONFIRMED')}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      disabled={confirmingId === request._id}
                    >
                      {confirmingId === request._id ? 'Saving...' : 'Mark as Received'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const note = window.prompt('Describe the issue you faced');
                        if (note) {
                          handleConfirmReceipt(request._id, 'DISPUTED', note);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      Report Issue
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellBalancePage;
