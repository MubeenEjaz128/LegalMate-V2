import React, { useState } from 'react'
import { Plus, Edit, Trash2, X, Save, Loader2 } from 'lucide-react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

export const PAYMENT_METHOD_LABELS = {
  JAZZCASH: 'JazzCash',
  EASYPAYSA: 'EasyPaisa',
  NAYAPAY: 'NayaPay',
  BANK: 'Bank Transfer'
}

const PaymentMethodsTable = ({ paymentMethods, onRefresh }) => {
  const [showModal, setShowModal] = useState(false)
  const [editingMethod, setEditingMethod] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    method: 'JAZZCASH',
    accountName: '',
    accountNumber: '',
    displayOrder: 0,
    isActive: true
  })

  const handleAdd = () => {
    setEditingMethod(null)
    setFormData({
      method: 'JAZZCASH',
      accountName: '',
      accountNumber: '',
      displayOrder: 0,
      isActive: true
    })
    setShowModal(true)
  }

  const handleEdit = (method) => {
    setEditingMethod(method)
    setFormData({
      method: method.method,
      accountName: method.accountName,
      accountNumber: method.accountNumber,
      displayOrder: method.displayOrder ?? 0,
      isActive: method.isActive ?? true
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) return

    try {
      await adminAPI.deletePaymentMethod(id)
      toast.success('Payment method deleted successfully')
      onRefresh()
    } catch (error) {
      console.error('Error deleting payment method:', error)
      toast.error(error.response?.data?.message || 'Failed to delete payment method')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingMethod) {
        await adminAPI.updatePaymentMethod(editingMethod._id, formData)
        toast.success('Payment method updated successfully')
      } else {
        await adminAPI.createPaymentMethod(formData)
        toast.success('Payment method created successfully')
      }
      setShowModal(false)
      onRefresh()
    } catch (error) {
      console.error('Error saving payment method:', error)
      toast.error(error.response?.data?.message || 'Failed to save payment method')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-secondary-900">Payment Methods</h3>
          <p className="text-sm text-secondary-600">Manage payment methods for balance purchases</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Method
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="text-center py-12 bg-secondary-50 rounded-lg border-2 border-dashed border-secondary-300">
          <p className="text-secondary-500 mb-4">No payment methods configured yet</p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add First Payment Method
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="bg-secondary-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {paymentMethods.map((method) => (
                <tr key={method._id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3 text-sm text-secondary-900">
                    {PAYMENT_METHOD_LABELS[method.method] || method.method}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-900">
                    <div className="font-medium">{method.accountName}</div>
                    <div className="text-xs text-secondary-500">{method.accountNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      method.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-secondary-100 text-secondary-800'
                    }`}>
                      {method.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-900">{method.displayOrder ?? 0}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(method)}
                        className="text-primary-600 hover:text-primary-800 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(method._id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-secondary-900">
                {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-secondary-400 hover:text-secondary-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Payment Method *
                </label>
                <select
                  name="method"
                  value={formData.method}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="EASYPAYSA">EasyPaisa</option>
                  <option value="NAYAPAY">NayaPay</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleInputChange}
                  placeholder="e.g., LegalMate Platform"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., 03001234567"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  name="displayOrder"
                  value={formData.displayOrder}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-secondary-700">
                  Active (visible to users)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentMethodsTable
