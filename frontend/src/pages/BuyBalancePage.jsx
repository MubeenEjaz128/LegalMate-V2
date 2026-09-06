import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Upload, ArrowLeft, CheckCircle, Info, X, Copy } from 'lucide-react';
import { balanceAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const METHOD_LABELS = {
  JAZZCASH: 'JazzCash',
  EASYPAYSA: 'Easypaisa',
  NAYAPAY: 'NayaPay',
  BANK: 'Bank Transfer'
};

const BuyBalancePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    requestedAmountPkr: '',
    method: '',
    userReference: '',
    userNote: ''
  });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [proofFile, setProofFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchPaymentMethods();
  }, [user, navigate]);

  const fetchPaymentMethods = async () => {
    try {
      setMethodsLoading(true);
      const response = await balanceAPI.getPaymentMethods();
      setPaymentMethods(response.data.paymentMethods || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to fetch payment methods');
    } finally {
      setMethodsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleShowPaymentDetails = () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method first.');
      return;
    }
    setShowPaymentDetails(true);
  };

  useEffect(() => {
    if (!formData.method) {
      setSelectedMethod(null);
      return;
    }
    const match = paymentMethods.find((m) => m.method === formData.method);
    setSelectedMethod(match || null);
  }, [formData.method, paymentMethods]);

  const formatMethodLabel = (method) => {
    const friendly = METHOD_LABELS[method.method] || method.method;
    return method.accountName ? `${friendly} — ${method.accountName}` : friendly;
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid image (JPG, PNG) or PDF file');
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setProofFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.requestedAmountPkr || !formData.method || !proofFile) {
      toast.error('Please fill in all required fields and upload payment proof');
      return;
    }
    if (paymentMethods.length === 0) {
      toast.error('No payment methods are available at the moment.');
      return;
    }

    if (parseFloat(formData.requestedAmountPkr) < 100) {
      toast.error('Minimum amount is 100 PKR');
      return;
    }

    try {
      setLoading(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('requestedAmountPkr', formData.requestedAmountPkr);
      formDataToSend.append('method', formData.method);
      formDataToSend.append('userReference', formData.userReference);
      formDataToSend.append('userNote', formData.userNote);
      formDataToSend.append('proof', proofFile);

      await balanceAPI.createRequest(formDataToSend);
      
      toast.success('Balance request submitted successfully! It will be reviewed within 24-48 hours.');
      navigate('/balance');
    } catch (error) {
      console.error('Error creating balance request:', error);
      toast.error('Failed to submit balance request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (methodsLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-secondary-300 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-secondary-300 rounded"></div>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">Buy Balance</h1>
        <p className="text-secondary-600">Add funds to your account by making a local payment</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Amount (PKR) *
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
                step="1"
                className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <p className="text-sm text-secondary-500 mt-1">Minimum amount is 100 PKR</p>
          </div>

          {/* Payment Method */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-secondary-700">
                Payment Method *
              </label>
              {paymentMethods.length > 0 && (
                <button
                  type="button"
                  onClick={handleShowPaymentDetails}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 transition-colors"
                  title="View selected payment method details"
                >
                  <Info className="h-4 w-4" />
                  View Details
                </button>
              )}
            </div>
            {paymentMethods.length === 0 ? (
              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-900 space-y-3">
                <p>No payment methods are available yet. Please contact the administrator or try again later.</p>
                {user?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard?tab=payment-methods')}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition-colors"
                  >
                    Manage Payment Methods
                  </button>
                )}
              </div>
            ) : (
              <>
                <select
                  name="method"
                  value={formData.method}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map((method) => (
                    <option key={method._id} value={method.method}>
                      {formatMethodLabel(method)}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-secondary-500 mt-1">Choose your preferred payment method</p>
              </>
            )}
          </div>

          {/* Transaction Reference */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Transaction Reference
            </label>
            <input
              type="text"
              name="userReference"
              value={formData.userReference}
              onChange={handleInputChange}
              placeholder="Enter transaction ID or reference number"
              maxLength="100"
              className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-sm text-secondary-500 mt-1">Optional: Transaction ID or reference number</p>
          </div>

          {/* Payment Proof */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Payment Proof *
            </label>
            <div className="border-2 border-dashed border-secondary-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
              <input
                type="file"
                id="proof"
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="hidden"
                required
              />
              <label
                htmlFor="proof"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-8 w-8 text-secondary-400 mb-2" />
                <span className="text-sm font-medium text-secondary-900">
                  {proofFile ? proofFile.name : 'Click to upload payment proof'}
                </span>
                <span className="text-xs text-secondary-500 mt-1">
                  PNG, JPG, or PDF (max 10MB)
                </span>
              </label>
            </div>
            {proofFile && (
              <div className="mt-2 flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                File selected: {proofFile.name}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Additional Notes
            </label>
            <textarea
              name="userNote"
              value={formData.userNote}
              onChange={handleInputChange}
              placeholder="Any additional information about your payment"
              rows="3"
              maxLength="500"
              className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-sm text-secondary-500 mt-1">
              {formData.userNote.length}/500 characters
            </p>
          </div>

          {/* Important Information */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-primary-900 mb-2">Important Information</h3>
            <ul className="text-sm text-primary-800 space-y-1">
              <li>• Your payment will be reviewed within 24-48 hours</li>
              <li>• Make sure to upload a clear payment proof</li>
              <li>• The amount will be added to your balance once approved</li>
              <li>• You can track your request status in the Balance page</li>
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
              disabled={loading}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>

      {/* Payment Details Modal */}
      {showPaymentDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-secondary-900">
                {selectedMethod ? `${selectedMethod.method} Payment Details` : 'All Payment Methods'}
              </h2>
              <button
                onClick={() => {
                  setShowPaymentDetails(false);
                  setSelectedMethod(null);
                }}
                className="text-secondary-400 hover:text-secondary-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              {selectedMethod ? (
                // Single method details
                <div className="space-y-4">
                  <div className="bg-secondary-50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-primary-100 rounded-lg">
                        <DollarSign className="h-6 w-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-secondary-900">{selectedMethod.method}</h3>
                        <p className="text-sm text-secondary-600">{selectedMethod.bankName || 'Payment Service'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-secondary-700">Account Name</label>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-secondary-900 bg-white px-3 py-2 rounded border flex-1">
                              {selectedMethod.accountName}
                            </p>
                            <button
                              onClick={() => handleCopyText(selectedMethod.accountName)}
                              className="p-2 text-secondary-500 hover:text-secondary-700 transition-colors"
                              title="Copy account name"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-secondary-700">Account Number</label>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-secondary-900 bg-white px-3 py-2 rounded border flex-1 font-mono">
                              {selectedMethod.accountNumber}
                            </p>
                            <button
                              onClick={() => handleCopyText(selectedMethod.accountNumber)}
                              className="p-2 text-secondary-500 hover:text-secondary-700 transition-colors"
                              title="Copy account number"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {selectedMethod.bankName && (
                          <div>
                            <label className="text-sm font-medium text-secondary-700">Bank/Service</label>
                            <p className="text-sm text-secondary-900 bg-white px-3 py-2 rounded border mt-1">
                              {selectedMethod.bankName}
                            </p>
                          </div>
                        )}
                        
                        {selectedMethod.description && (
                          <div>
                            <label className="text-sm font-medium text-secondary-700">Instructions</label>
                            <p className="text-sm text-secondary-700 bg-white px-3 py-2 rounded border mt-1">
                              {selectedMethod.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                      <h4 className="text-sm font-medium text-primary-900 mb-2">Payment Instructions:</h4>
                      <ol className="text-sm text-primary-800 space-y-1">
                        <li>1. Transfer your desired amount to the above account</li>
                        <li>2. Take a screenshot or photo of the payment confirmation</li>
                        <li>3. Fill in the payment form with transaction details</li>
                        <li>4. Upload the payment proof</li>
                        <li>5. Submit your request for review</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                // All methods overview
                <div className="space-y-4">
                  <p className="text-secondary-600 mb-6">Choose any of the following payment methods to add funds to your account:</p>
                  
                  {paymentMethods.map((method) => (
                    <div key={method._id} className="border border-secondary-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary-100 rounded-lg">
                            <DollarSign className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-secondary-900">{method.method}</h3>
                            <p className="text-sm text-secondary-600">{method.accountName}</p>
                            <p className="text-sm text-secondary-500 font-mono">{method.accountNumber}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedMethod(method)}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t p-6">
              <div className="flex justify-end gap-3">
                {selectedMethod && (
                  <button
                    onClick={() => setSelectedMethod(null)}
                    className="px-4 py-2 border border-secondary-300 rounded-lg text-secondary-700 hover:bg-secondary-50 transition-colors"
                  >
                    Back to All Methods
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowPaymentDetails(false);
                    setSelectedMethod(null);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyBalancePage;
