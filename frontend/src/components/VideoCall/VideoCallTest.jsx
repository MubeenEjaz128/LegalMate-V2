import React, { useState } from 'react'
import VideoCall from './VideoCall'

const VideoCallTest = () => {
  const [showVideoCall, setShowVideoCall] = useState(false)
  const [testConsultationId, setTestConsultationId] = useState('test-consultation-123')

  const handleStartTest = () => {
    setShowVideoCall(true)
  }

  const handleCloseTest = () => {
    setShowVideoCall(false)
  }

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-secondary-900 mb-6 text-center">
          WebRTC Video Call Test
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Test Consultation ID
            </label>
            <input
              type="text"
              value={testConsultationId}
              onChange={(e) => setTestConsultationId(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter consultation ID"
            />
          </div>
          
          <button
            onClick={handleStartTest}
            className="w-full btn-primary py-3"
          >
            Start Test Video Call
          </button>
          
          <div className="text-sm text-secondary-600 text-center">
            <p>This will test the WebRTC video call functionality.</p>
            <p className="mt-2">Make sure to allow camera and microphone permissions.</p>
          </div>
        </div>

        {showVideoCall && (
          <VideoCall
            consultationId={testConsultationId}
            userRole="client"
            onClose={handleCloseTest}
          />
        )}
      </div>
    </div>
  )
}

export default VideoCallTest 