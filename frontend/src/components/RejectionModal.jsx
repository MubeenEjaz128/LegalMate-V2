import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const RejectionModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Reject Appointment",
  appointmentDetails = null,
  loading = false 
}) => {
  const [reason, setReason] = useState('');
  const [selectedPresetReason, setSelectedPresetReason] = useState('');

  // Preset rejection reasons
  const presetReasons = [
    "Schedule conflict",
    "Insufficient information provided",
    "Outside area of expertise",
    "Client requirements not clear",
    "Technical issues",
    "Personal emergency",
    "Double booking",
    "Inappropriate consultation request",
    "Other"
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason = selectedPresetReason === 'Other' ? reason : selectedPresetReason || reason;
    
    if (!finalReason.trim()) {
      return;
    }

    onConfirm(finalReason.trim());
  };

  const handlePresetReasonChange = (preset) => {
    setSelectedPresetReason(preset);
    if (preset !== 'Other') {
      setReason(preset);
    } else {
      setReason('');
    }
  };

  const handleClose = () => {
    setReason('');
    setSelectedPresetReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <h2 className="text-lg font-semibold text-secondary-900">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-secondary-400 hover:text-secondary-600"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {appointmentDetails && (
          <div className="mb-4 p-3 bg-secondary-50 rounded-lg">
            <div className="text-sm text-secondary-600">
              <p><strong>Client:</strong> {appointmentDetails.client?.name}</p>
              <p><strong>Date:</strong> {new Date(appointmentDetails.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {appointmentDetails.time}</p>
              <p><strong>Type:</strong> {appointmentDetails.consultationType}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Select a reason for rejection:
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {presetReasons.map((preset) => (
                <label key={preset} className="flex items-center">
                  <input
                    type="radio"
                    name="rejectionReason"
                    value={preset}
                    checked={selectedPresetReason === preset}
                    onChange={() => handlePresetReasonChange(preset)}
                    className="mr-2"
                    disabled={loading}
                  />
                  <span className="text-sm text-secondary-700">{preset}</span>
                </label>
              ))}
            </div>
          </div>

          {(selectedPresetReason === 'Other' || !selectedPresetReason) && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                {selectedPresetReason === 'Other' ? 'Please specify:' : 'Or enter custom reason:'}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-error-500"
                rows="3"
                maxLength="500"
                required={selectedPresetReason === 'Other' || !selectedPresetReason}
                disabled={loading}
              />
              <div className="text-xs text-secondary-500 mt-1">
                {reason.length}/500 characters
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-secondary-700 bg-secondary-100 rounded-md hover:bg-secondary-200 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-error-600 text-white rounded-md hover:bg-error-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || (!reason.trim() && !selectedPresetReason)}
            >
              {loading ? 'Rejecting...' : 'Reject Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectionModal;