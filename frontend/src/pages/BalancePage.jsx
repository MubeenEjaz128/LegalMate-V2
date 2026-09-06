import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { DollarSign, Plus, Minus, History, Upload, CheckCircle, XCircle, Clock } from 'lucide-react';

import { balanceAPI } from '../services/api';

import { useAuthStore } from '../stores/authStore';

import toast from 'react-hot-toast';



const WITHDRAWAL_METHOD_LABELS = {

  JAZZCASH: 'JazzCash',

  EASYPAYSA: 'EasyPaisa',

  NAYAPAY: 'NayaPay',

  BANK: 'Bank Transfer'

};



const BalancePage = () => {

  const navigate = useNavigate();

  const { user } = useAuthStore();

  const [balance, setBalance] = useState(null);

  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('overview');

  const [transactions, setTransactions] = useState([]);

  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const [withdrawRequests, setWithdrawRequests] = useState([]);

  const [confirmingId, setConfirmingId] = useState(null);



  useEffect(() => {

    if (!user) {

      navigate('/login');

      return;

    }

    fetchBalanceData();

  }, [user, navigate]);



  const fetchBalanceData = async () => {

    try {

      setLoading(true);

      setTransactionsLoading(true);

      

      if (user.role === 'client') {

        const [balanceRes, requestsRes, txRes, withdrawRes] = await Promise.all([

          balanceAPI.getBalance(),

          balanceAPI.getRequests(),

          balanceAPI.getWalletTransactions({ limit: 10 }),

          balanceAPI.getWithdrawalRequests()

        ]);

        setBalance(balanceRes.data);

        setRequests(requestsRes.data.requests || []);

        setTransactions(txRes.data.transactions || []);

        setWithdrawRequests(withdrawRes.data.requests || []);

      } else {

        const [balanceRes, txRes] = await Promise.all([

          balanceAPI.getBalance(),

          balanceAPI.getWalletTransactions({ limit: 10 })

        ]);

        setBalance(balanceRes.data);

        setRequests([]);

        setTransactions(txRes.data.transactions || []);

        setWithdrawRequests([]);

      }

    } catch (error) {

      console.error('Error fetching balance data:', error);

      toast.error('Failed to fetch balance information');

    } finally {

      setLoading(false);

      setTransactionsLoading(false);

    }

  };

  const handleConfirmReceipt = async (requestId, status, note) => {
    try {
      setConfirmingId(requestId);
      await balanceAPI.confirmWithdrawalRequest(requestId, {
        status,
        ...(note ? { note } : {})
      });
      toast.success('Withdrawal status updated');
      fetchBalanceData();
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      toast.error(error.response?.data?.message || 'Failed to update withdrawal status');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleViewRequest = (requestId) => {
    navigate(`/balance-request/${requestId}`);
  };



  const getStatusBadge = (status) => {

    const statusConfig = {

      'PENDING_PROOF_REVIEW': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },

      'APPROVED': { color: 'bg-success-100 text-green-800', icon: CheckCircle },

      'REJECTED': { color: 'bg-red-100 text-red-800', icon: XCircle },

      'NEEDS_MORE_INFO': { color: 'bg-orange-100 text-orange-800', icon: Upload }

    };

    

    const config = statusConfig[status] || statusConfig['PENDING_PROOF_REVIEW'];

    const Icon = config.icon;

    

    return (

      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>

        <Icon className="h-3 w-3" />

        {status.replace(/_/g, ' ')}

      </span>

    );

  };



  const formatDate = (dateString) => {

    return new Date(dateString).toLocaleDateString('en-US', {

      year: 'numeric',

      month: 'short',

      day: 'numeric',

      hour: '2-digit',

      minute: '2-digit'

    });

  };



  if (loading) {

    return (

      <div className="max-w-6xl mx-auto px-4 py-8">

        <div className="animate-pulse">

          <div className="h-8 bg-secondary-300 rounded w-1/3 mb-6"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

            <div className="h-32 bg-secondary-300 rounded"></div>

            <div className="h-32 bg-secondary-300 rounded"></div>

            <div className="h-32 bg-secondary-300 rounded"></div>

          </div>

        </div>

      </div>

    );

  }



  return (

    <div className="max-w-6xl mx-auto px-4 py-8">

      <div className="mb-8">

        <h1 className="text-3xl font-bold text-secondary-900 mb-2">Balance Management</h1>

        <p className="text-secondary-600">Manage your PKR balance and payment requests</p>

      </div>



      {/* Balance Overview */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        <div className="bg-white rounded-lg shadow-sm border p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-medium text-secondary-600">Current Balance</p>

              <p className="text-2xl font-bold text-secondary-900">

                ₨{balance?.balancePkr?.toLocaleString() || '0'}

              </p>

            </div>

            <DollarSign className="h-8 w-8 text-success-600" />

          </div>

        </div>



        <div className="bg-white rounded-lg shadow-sm border p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-medium text-secondary-600">Total Deposited</p>

              <p className="text-2xl font-bold text-secondary-900">

                ₨{balance?.totalDeposited?.toLocaleString() || '0'}

              </p>

            </div>

            <Plus className="h-8 w-8 text-primary-600" />

          </div>

        </div>



        <div className="bg-white rounded-lg shadow-sm border p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-medium text-secondary-600">Total Withdrawn</p>

              <p className="text-2xl font-bold text-secondary-900">

                ₨{balance?.totalWithdrawn?.toLocaleString() || '0'}

              </p>

            </div>

            <Minus className="h-8 w-8 text-red-600" />

          </div>

        </div>

      </div>



      {/* Tabs */}

      <div className="mb-6">

        <div className="border-b border-secondary-200">

          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">

            <button

              onClick={() => setActiveTab('overview')}

              className={`py-2 px-1 border-b-2 font-medium text-sm ${

                activeTab === 'overview'

                  ? 'border-primary-500 text-primary-600'

                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'

              }`}

            >

              Overview

            </button>

            {user?.role === 'client' && (

              <>

                <button

                  onClick={() => setActiveTab('requests')}

                  className={`py-2 px-1 border-b-2 font-medium text-sm ${

                    activeTab === 'requests'

                      ? 'border-primary-500 text-primary-600'

                      : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'

                  }`}

                >

                  Payment Requests

                </button>

                <button

                  onClick={() => setActiveTab('withdrawals')}

                  className={`py-2 px-1 border-b-2 font-medium text-sm ${

                    activeTab === 'withdrawals'

                      ? 'border-primary-500 text-primary-600'

                      : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'

                  }`}

                >

                  Recent Withdrawals

                </button>

              </>

            )}

            <button

              onClick={() => setActiveTab('history')}

              className={`py-2 px-1 border-b-2 font-medium text-sm ${

                activeTab === 'history'

                  ? 'border-primary-500 text-primary-600'

                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'

              }`}

            >

              Transaction History

            </button>

          </nav>

        </div>

      </div>



      {/* Tab Content */}

      {activeTab === 'overview' && (

        <div className="space-y-6">

          <div className="bg-white rounded-lg shadow-sm border p-6">

            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Quick Actions</h3>

            <div className={`grid grid-cols-1 ${user?.role === 'client' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>

              {user?.role === 'client' && (

                <button

                  onClick={() => navigate('/buy-balance')}

                  className="flex items-center justify-center p-4 border-2 border-dashed border-secondary-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"

                >

                  <Plus className="h-6 w-6 text-primary-600 mr-3" />

                  <div className="text-left">

                    <p className="font-medium text-secondary-900">Buy Balance</p>

                    <p className="text-sm text-secondary-600">Add funds to your account</p>

                  </div>

                </button>

              )}

              <button

                onClick={() => navigate('/sell-balance')}

                className="flex items-center justify-center p-4 border-2 border-dashed border-secondary-300 rounded-lg hover:border-success-500 hover:bg-success-50 transition-colors"

              >

                <Minus className="h-6 w-6 text-success-600 mr-3" />

                <div className="text-left">

                  <p className="font-medium text-secondary-900">Sell Balance</p>

                  <p className="text-sm text-secondary-600">

                    {user?.role === 'client' ? 'Withdraw funds from your account' : 'Withdraw your earnings'}

                  </p>

                </div>

              </button>

            </div>

          </div>

        </div>

      )}

      {activeTab === 'withdrawals' && (
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
                      <p className="text-lg font-semibold text-secondary-900">
                        ₨{request.requestedAmountPkr?.toLocaleString()}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-secondary-600">
                    <p>
                      <span className="font-medium">Method:</span>{' '}
                      {WITHDRAWAL_METHOD_LABELS[request.payoutMethod] || request.payoutMethod}
                    </p>
                    <p>
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">Confirmation:</span>{' '}
                      {request.recipientConfirmationStatus}
                    </p>
                    <p>
                      <span className="font-medium">Account Holder:</span>{' '}
                      {request.payoutDetailsSnapshot?.accountName || 'N/A'}
                    </p>
                    <p>
                      <span className="font-medium">Account/IBAN:</span>{' '}
                      {request.payoutDetailsSnapshot?.accountNumberOrIban || 'N/A'}
                    </p>
                    {request.payoutDetailsSnapshot?.extra?.instructions && (
                      <p>
                        <span className="font-medium">Instructions:</span>{' '}
                        {request.payoutDetailsSnapshot.extra.instructions}
                      </p>
                    )}
                    {request.adminProofUrl && (
                      <p>
                        <span className="font-medium">Proof: </span>
                        <a
                          href={request.adminProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 underline"
                        >
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
                      <p>
                        <span className="font-medium">Transaction Reference:</span>{' '}
                        {request.disbursementReference}
                      </p>
                    )}
                    {request.adminNote && (
                      <p>
                        <span className="font-medium">Admin Note:</span>{' '}
                        {request.adminNote}
                      </p>
                    )}
                  </div>

                  {request.status === 'PAID' && request.recipientConfirmationStatus === 'PENDING' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmReceipt(request._id, 'CONFIRMED')}
                        className="px-4 py-2 bg-success-600 text-white rounded hover:bg-success-700 text-sm"
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
      )}



      {activeTab === 'requests' && user?.role === 'client' && (

        <div className="space-y-6">

          <div className="flex justify-between items-center">

            <h3 className="text-lg font-semibold text-secondary-900">Payment Requests</h3>

            <button

              onClick={() => navigate('/buy-balance')}

              className="btn-primary"

            >

              New Request

            </button>

          </div>



          {requests.length === 0 ? (

            <div className="text-center py-12">

              <History className="h-12 w-12 text-secondary-400 mx-auto mb-4" />

              <h3 className="text-lg font-medium text-secondary-900 mb-2">No payment requests</h3>

              <p className="text-secondary-600 mb-4">You haven't made any payment requests yet.</p>

              <button

                onClick={() => navigate('/buy-balance')}

                className="btn-primary"

              >

                Make your first request

              </button>

            </div>

          ) : (

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">

              <div className="overflow-x-auto">

                <table className="min-w-full divide-y divide-secondary-200">

                  <thead className="bg-secondary-50">

                    <tr>

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

                        Date

                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">

                        Actions

                      </th>

                    </tr>

                  </thead>

                  <tbody className="bg-white divide-y divide-secondary-200">

                    {(requests || []).map((request) => {

                      // Buy Balance requests use 'method' field
                      const paymentMethod = request.method || request.payoutMethod;
                      const methodLabel = WITHDRAWAL_METHOD_LABELS[paymentMethod] || paymentMethod;

                      return (

                        <tr key={request._id}>

                          <td className="px-6 py-4 whitespace-nowrap">

                            <div className="text-sm font-medium text-secondary-900">

                              ₨{request.requestedAmountPkr?.toLocaleString()}

                            </div>

                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">

                            <div className="text-sm font-medium text-secondary-900">{methodLabel}</div>

                            {request.userReference && (

                              <div className="text-xs text-secondary-500">

                                Ref: {request.userReference}

                              </div>

                            )}

                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">

                            <span

                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${

                                request.status === "APPROVED" ? "bg-success-100 text-green-800" :

                                request.status === "REJECTED" ? "bg-red-100 text-red-800" :

                                request.status === "PENDING_PROOF_REVIEW" ? "bg-yellow-100 text-yellow-800" :

                                "bg-secondary-100 text-secondary-800"

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

                            </div>

                          </td>

                        </tr>

                      )

                    })}

                  </tbody>

                </table>

              </div>

            </div>

          )}

        </div>

      )}



      {activeTab === 'history' && (

        <div className="space-y-6">

          <h3 className="text-lg font-semibold text-secondary-900">Transaction History</h3>

          {transactionsLoading ? (

            <div className="text-center py-12">

              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>

              <p className="text-secondary-600">Loading transactions...</p>

            </div>

          ) : transactions.length === 0 ? (

            <div className="text-center py-12">

              <History className="h-12 w-12 text-secondary-400 mx-auto mb-4" />

              <p className="text-secondary-600">No transactions recorded yet.</p>

            </div>

          ) : (

            <div className="bg-white border rounded-lg overflow-x-auto">

              <table className="min-w-full divide-y divide-secondary-200">

                <thead className="bg-secondary-50">

                  <tr>

                    <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Date</th>

                    <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Type</th>

                    <th className="px-4 py-2 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Amount</th>

                    <th className="px-4 py-2 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Balance</th>

                    <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Description</th>

                  </tr>

                </thead>

                <tbody className="bg-white divide-y divide-secondary-200">

                  {transactions.map((tx) => (

                    <tr key={tx._id}>

                      <td className="px-4 py-2 text-sm text-secondary-900">

                        {new Date(tx.createdAt).toLocaleString()}

                      </td>

                      <td className="px-4 py-2 text-sm text-secondary-700">{tx.type?.replace(/_/g, ' ')}</td>

                      <td className={`px-4 py-2 text-sm text-right ${tx.amountPkr < 0 ? 'text-red-600' : 'text-success-600'}`}>

                        {tx.amountPkr < 0 ? '-' : '+'}₨{Math.abs(tx.amountPkr).toLocaleString()}

                      </td>

                      <td className="px-4 py-2 text-sm text-right text-secondary-900">

                        ₨{tx.balanceAfter?.toLocaleString() ?? '—'}

                      </td>

                      <td className="px-4 py-2 text-sm text-secondary-600">{tx.description}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </div>

      )}

    </div>

  );

};



export default BalancePage;
