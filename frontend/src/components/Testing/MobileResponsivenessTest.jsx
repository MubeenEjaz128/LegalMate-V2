import React, { useState } from 'react'
import { Smartphone, Tablet, Monitor, X, Check, AlertTriangle } from 'lucide-react'

const MobileResponsivenessTest = ({ onClose }) => {
  const [currentDevice, setCurrentDevice] = useState('mobile')
  const [testResults, setTestResults] = useState([])
  const [isTesting, setIsTesting] = useState(false)

  const devices = [
    {
      id: 'mobile',
      name: 'Mobile',
      icon: Smartphone,
      width: '375px',
      height: '667px',
      description: 'iPhone/Android Phone'
    },
    {
      id: 'tablet',
      name: 'Tablet',
      icon: Tablet,
      width: '768px',
      height: '1024px',
      description: 'iPad/Android Tablet'
    },
    {
      id: 'desktop',
      name: 'Desktop',
      icon: Monitor,
      width: '1024px',
      height: '768px',
      description: 'Desktop/Laptop'
    }
  ]

  const testCases = [
    {
      category: 'Navigation',
      tests: [
        'Mobile menu opens/closes properly',
        'Navigation links work correctly',
        'Touch targets are appropriately sized (44px+)',
        'No horizontal scrolling',
        'Logo and branding are visible'
      ]
    },
    {
      category: 'Forms',
      tests: [
        'Login form works on mobile',
        'Registration form works on mobile',
        'Input fields are properly sized',
        'Form validation works',
        'Submit buttons are accessible'
      ]
    },
    {
      category: 'Dashboards',
      tests: [
        'Cards stack properly on mobile',
        'Text is readable on small screens',
        'Buttons are touch-friendly',
        'Content doesn\'t overflow',
        'Loading states are clear'
      ]
    },
    {
      category: 'Video Calls',
      tests: [
        'Video call interface works on mobile',
        'Controls are touch-friendly',
        'Picture-in-picture works',
        'Screen sharing works',
        'Chat interface is usable'
      ]
    },
    {
      category: 'General',
      tests: [
        'Font sizes are readable',
        'Colors have sufficient contrast',
        'Images scale properly',
        'Animations are smooth',
        'Performance is acceptable'
      ]
    }
  ]

  const runTests = async () => {
    setIsTesting(true)
    const results = []

    for (const category of testCases) {
      for (const test of category.tests) {
        // Simulate test execution
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Random pass/fail for demonstration
        const passed = Math.random() > 0.2 // 80% pass rate
        results.push({
          category: category.category,
          test,
          status: passed ? 'PASS' : 'FAIL',
          device: currentDevice
        })
      }
    }

    setTestResults(results)
    setIsTesting(false)
  }

  const getDeviceIcon = (deviceId) => {
    const device = devices.find(d => d.id === deviceId)
    return device ? device.icon : Monitor
  }

  const passedTests = testResults.filter(r => r.status === 'PASS').length
  const failedTests = testResults.filter(r => r.status === 'FAIL').length
  const totalTests = testResults.length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Mobile Responsiveness Test</h2>
              <p className="text-primary-100 mt-1">Test the app on different screen sizes</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-primary-100 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Device Selector */}
          <div className="w-80 bg-secondary-50 border-r border-secondary-200 p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Device Preview</h3>
            
            <div className="space-y-3">
              {devices.map((device) => {
                const Icon = device.icon
                return (
                  <button
                    key={device.id}
                    onClick={() => setCurrentDevice(device.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                      currentDevice === device.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-secondary-200 bg-white text-secondary-700 hover:border-secondary-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">{device.name}</div>
                        <div className="text-sm text-secondary-500">{device.description}</div>
                        <div className="text-xs text-secondary-400">{device.width} × {device.height}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6">
              <button
                onClick={runTests}
                disabled={isTesting}
                className="w-full btn-primary"
              >
                {isTesting ? 'Running Tests...' : 'Run Responsiveness Tests'}
              </button>
            </div>

            {testResults.length > 0 && (
              <div className="mt-6 p-4 bg-white rounded-xl border border-secondary-200">
                <h4 className="font-semibold text-secondary-900 mb-2">Test Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Tests:</span>
                    <span className="font-medium">{totalTests}</span>
                  </div>
                  <div className="flex justify-between text-success-600">
                    <span>Passed:</span>
                    <span className="font-medium">{passedTests}</span>
                  </div>
                  <div className="flex justify-between text-error-600">
                    <span>Failed:</span>
                    <span className="font-medium">{failedTests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-medium">
                      {totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Test Results */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center space-x-3 mb-6">
              {getDeviceIcon(currentDevice)({ className: 'h-6 w-6 text-primary-600' })}
              <h3 className="text-lg font-semibold text-secondary-900">
                Test Results for {devices.find(d => d.id === currentDevice)?.name}
              </h3>
            </div>

            {testResults.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-secondary-400 mb-4">
                  <Monitor className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-secondary-600">Click "Run Responsiveness Tests" to start testing</p>
              </div>
            ) : (
              <div className="space-y-6">
                {testCases.map((category) => {
                  const categoryResults = testResults.filter(
                    r => r.category === category.category && r.device === currentDevice
                  )
                  
                  if (categoryResults.length === 0) return null

                  return (
                    <div key={category.category} className="bg-secondary-50 rounded-xl p-4">
                      <h4 className="font-semibold text-secondary-900 mb-3">{category.category}</h4>
                      <div className="space-y-2">
                        {categoryResults.map((result, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            {result.status === 'PASS' ? (
                              <Check className="h-4 w-4 text-success-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-error-500" />
                            )}
                            <span className={`text-sm ${
                              result.status === 'PASS' ? 'text-success-700' : 'text-error-700'
                            }`}>
                              {result.test}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileResponsivenessTest 