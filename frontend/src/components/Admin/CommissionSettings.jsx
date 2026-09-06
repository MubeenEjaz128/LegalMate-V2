import React, { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import { Card, Button, Input } from '../UI'
import toast from 'react-hot-toast'
import { Loader2, Save, Settings } from 'lucide-react'

const CommissionSettings = () => {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    consultationCommission: 10,
    documentReviewCommission: 10,
    legalAdviceCommission: 10,
    courtRepresentationCommission: 10,
    consultationFixedFee: 0,
    documentReviewFixedFee: 0,
    legalAdviceFixedFee: 0,
    courtRepresentationFixedFee: 0,
    currency: 'PKR',
    notes: ''
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getCommissionSettings()
      const currentSettings = response.data
      setSettings(currentSettings)
      setFormData({
        consultationCommission: currentSettings.consultationCommission,
        documentReviewCommission: currentSettings.documentReviewCommission,
        legalAdviceCommission: currentSettings.legalAdviceCommission,
        courtRepresentationCommission: currentSettings.courtRepresentationCommission,
        consultationFixedFee: currentSettings.consultationFixedFee,
        documentReviewFixedFee: currentSettings.documentReviewFixedFee,
        legalAdviceFixedFee: currentSettings.legalAdviceFixedFee,
        courtRepresentationFixedFee: currentSettings.courtRepresentationFixedFee,
        currency: currentSettings.currency,
        notes: ''
      })
    } catch (error) {
      console.error('Error loading commission settings:', error)
      toast.error('Failed to load commission settings')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await adminAPI.updateCommissionSettings(formData)
      toast.success('Commission settings updated successfully')
      await loadSettings() // Reload to get the new settings
    } catch (error) {
      console.error('Error updating commission settings:', error)
      toast.error('Failed to update commission settings')
    } finally {
      setSaving(false)
    }
  }

  const serviceTypes = [
    { key: 'consultation', label: 'Legal Consultation', description: 'General legal advice and consultation' },
    { key: 'documentReview', label: 'Document Review', description: 'Review and analysis of legal documents' },
    { key: 'legalAdvice', label: 'Legal Advice', description: 'Specialized legal advice and guidance' },
    { key: 'courtRepresentation', label: 'Court Representation', description: 'Representation in court proceedings' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Commission Settings</h2>
          <p className="text-secondary-600">
            Manage commission percentages and fixed fees for different service types
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-secondary-500" />
          <span className="text-sm text-secondary-500">
            Current Currency: {settings?.currency}
          </span>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-secondary-900">Commission Configuration</h3>
        </div>
        
        <div className="space-y-6">
          {/* Currency Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="currency" className="block text-sm font-medium text-secondary-700">Currency</label>
              <select 
                id="currency"
                value={formData.currency} 
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="PKR">PKR (Pakistani Rupee)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>
          </div>

          {/* Commission Settings for each service type */}
          {serviceTypes.map((service) => (
            <div key={service.key} className="border rounded-lg p-4 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{service.label}</h3>
                <p className="text-sm text-secondary-600">{service.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor={`${service.key}Commission`} className="block text-sm font-medium text-secondary-700">
                    Commission Percentage (%)
                  </label>
                  <Input
                    id={`${service.key}Commission`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData[`${service.key}Commission`]}
                    onChange={(e) => handleInputChange(`${service.key}Commission`, e.target.value)}
                    placeholder="Enter percentage"
                  />
                  <p className="text-xs text-secondary-500">
                    Percentage of consultation fee taken as commission
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor={`${service.key}FixedFee`} className="block text-sm font-medium text-secondary-700">
                    Fixed Fee ({formData.currency})
                  </label>
                  <Input
                    id={`${service.key}FixedFee`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData[`${service.key}FixedFee`]}
                    onChange={(e) => handleInputChange(`${service.key}FixedFee`, e.target.value)}
                    placeholder="Enter fixed fee"
                  />
                  <p className="text-xs text-secondary-500">
                    Additional fixed fee per transaction
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="block text-sm font-medium text-secondary-700">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes about this commission update..."
              rows={3}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Current Settings Summary */}
      {settings && (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-secondary-900">Current Settings Summary</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {serviceTypes.map((service) => (
              <div key={service.key} className="border rounded-lg p-3">
                <h4 className="font-medium text-sm">{service.label}</h4>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-secondary-600">
                    Commission: {settings[`${service.key}Commission`]}%
                  </p>
                  <p className="text-xs text-secondary-600">
                    Fixed Fee: {settings.currency} {settings[`${service.key}FixedFee`]}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {settings.notes && (
            <div className="mt-4 p-3 bg-secondary-50 rounded-lg">
              <p className="text-sm text-secondary-600">
                <strong>Notes:</strong> {settings.notes}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default CommissionSettings 