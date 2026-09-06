import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'react-hot-toast'
import { getProfilePictureUrlWithPreview } from '../utils/imageUtils'
import api, { adminAPI, balanceAPI } from '../services/api'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  Lock,
  Save,
  Edit3,
  XCircle,
  UploadCloud,
  Globe,
  Unlock,
  FileText,
  CheckCircle,
  X,
  UserCircle2,
  Upload,
  File,
  Download,
  Trash2,
  Building2,
  CreditCard,
  Plus
} from 'lucide-react'
import { useLocation } from 'react-router-dom'

const ProfilePage = () => {
  const { user, updateProfile } = useAuthStore()
  const location = useLocation()
  const [isEditing, setIsEditing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    bio: user?.bio || '',
    profilePicture: user?.profilePicture || '',
    status: user?.isAvailable ? 'online' : 'offline',
    specialization: user?.specialization || '',
    languages: user?.languages || [],
    hourlyRate: user?.hourlyRate || '',
    barNumber: user?.barNumber || '',
    social: user?.social || { facebook: '', twitter: '', linkedin: '' },
    document: '',
    profileVisibility: user?.profileVisibility || 'public',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [profilePicFile, setProfilePicFile] = useState(null)
  const [uploadedDocuments, setUploadedDocuments] = useState([])
  const [documentUploading, setDocumentUploading] = useState(false)
  const [documentUploadProgress, setDocumentUploadProgress] = useState(0)
  const [docFile, setDocFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [payoutProfiles, setPayoutProfiles] = useState([])
  const [showAddPayout, setShowAddPayout] = useState(false)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const PAYOUT_METHOD_OPTIONS = [
    { value: 'BANK', label: 'Bank Transfer' },
    { value: 'JAZZCASH', label: 'JazzCash' },
    { value: 'EASYPAYSA', label: 'Easypaisa' },
    { value: 'NAYAPAY', label: 'NayaPay' }
  ]

  const payoutFormInitial = {
    method: 'BANK',
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    accountType: 'current',
  }
  const [payoutForm, setPayoutForm] = useState(payoutFormInitial)

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        bio: user.bio || '',
        profilePicture: user.profilePicture || '',
        status: user.isAvailable ? 'online' : 'offline',
        specialization: user.specialization || '',
        languages: user.languages || [],
        hourlyRate: user.hourlyRate || '',
        barNumber: user.barNumber || '',
        social: user.social || { facebook: '', twitter: '', linkedin: '' },
        document: '',
        profileVisibility: user.profileVisibility || 'public',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    }
  }, [user])

  // Fetch uploaded documents on component mount
  useEffect(() => {
    if (!user) return

    if (user.role === 'lawyer') {
      fetchUploadedDocuments()
    }

    if (['lawyer', 'client'].includes(user.role)) {
      fetchPayoutProfiles()
    }
  }, [user])

  const fetchPayoutProfiles = async () => {
    try {
      const response = await balanceAPI.getPayoutProfiles()
      setPayoutProfiles(response.data.profiles || response.data || [])
    } catch (error) {
      console.error('Error fetching payout profiles:', error)
      setPayoutProfiles([])
    }
  }

  const fetchUploadedDocuments = async () => {
    try {
      const response = await api.get('/documents/lawyer')
      setUploadedDocuments(response.data)
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const handlePayoutInputChange = (e) => {
    const { name, value } = e.target
    setPayoutForm(prev => ({ ...prev, [name]: value }))
  }

  const resetPayoutForm = () => {
    setPayoutForm(payoutFormInitial)
  }

  const handleAddPayoutProfile = async (e) => {
    e.preventDefault()
    setPayoutLoading(true)
    try {
      const payload = {
        method: payoutForm.method,
        accountName: payoutForm.accountTitle,
        accountNumberOrIban: payoutForm.accountNumber,
        extra: {
          bankName: payoutForm.bankName,
          accountType: payoutForm.accountType
        }
      }
      const response = await balanceAPI.createPayoutProfile(payload)
      const newProfile = response.data.profile || response.data
      setPayoutProfiles(prev => [...prev, newProfile])
      setMessage({ type: 'success', text: 'Payout profile added' })
      setShowAddPayout(false)
      resetPayoutForm()
    } catch (error) {
      console.error('Error adding payout profile:', error)
      const serverMessage = error.response?.data?.message
      const validationErrors = error.response?.data?.errors
      const message = validationErrors?.length
        ? validationErrors.map(err => err.msg).join(', ')
        : serverMessage || 'Failed to add payout profile'
      setMessage({ type: 'error', text: message })
    } finally {
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      setPayoutLoading(false)
    }
  }

  const handleDocumentUpload = async (file, documentType) => {
    if (!file) return

    setDocumentUploading(true)
    setDocumentUploadProgress(0)

    const formData = new FormData()
    formData.append('document', file)
    formData.append('documentType', documentType)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setDocumentUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      clearInterval(progressInterval)
      setDocumentUploadProgress(100)

      const uploadedDoc = response.data.document || response.data
      setUploadedDocuments(prev => {
        // Replace if same documentType already exists, otherwise add
        const existingIndex = prev.findIndex(doc => doc.documentType === uploadedDoc.documentType)
        if (existingIndex !== -1) {
          const updated = [...prev]
          updated[existingIndex] = uploadedDoc
          return updated
        }
        return [...prev, uploadedDoc]
      })
      setMessage({ type: 'success', text: 'Document uploaded successfully!' })
      setDocFile(null)
    } catch (error) {
      console.error('Error uploading document:', error)
      setMessage({ type: 'error', text: 'Failed to upload document' })
    } finally {
      setDocumentUploading(false)
      setDocumentUploadProgress(0)
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const handleDocumentDelete = async (documentId) => {
    try {
      await api.delete(`/documents/${documentId}`)
      setUploadedDocuments(prev => prev.filter(doc => doc.id !== documentId))
      setMessage({ type: 'success', text: 'Document deleted successfully!' })
    } catch (error) {
      console.error('Error deleting document:', error)
      setMessage({ type: 'error', text: 'Error deleting document' })
    } finally {
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const handleViewDocument = async (doc) => {
    try {
      const response = await api.get(`/documents/view/${doc.id}`, {
        responseType: 'blob'
      })
      
      // Create a blob URL for viewing
      const blob = new Blob([response.data], { type: response.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      
      // Clean up the blob URL after a short delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error('Error viewing document:', error)
      setMessage({ type: 'error', text: 'Failed to view document' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const handleDownloadDocument = async (doc) => {
    try {
      const response = await api.get(`/documents/view/${doc.id}`, {
        responseType: 'blob'
      })
      
      // Create a blob URL for downloading
      const blob = new Blob([response.data], { type: response.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      
      // Create a temporary anchor element for download
      const a = document.createElement('a')
      a.href = url
      a.download = doc.name || 'document'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      setMessage({ type: 'error', text: 'Failed to download document' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name.startsWith('social.')) {
      const key = name.split('.')[1]
      setFormData(prev => ({ ...prev, social: { ...prev.social, [key]: value } }))
    } else if (name === 'languages') {
      const valArr = Array.from(e.target.selectedOptions, option => option.value)
      setFormData(prev => ({ ...prev, languages: valArr }))
    } else if (name === 'profileVisibility') {
      setFormData(prev => ({ ...prev, profileVisibility: value }))
    } else if (name === 'status') {
      setFormData(prev => ({ ...prev, status: value }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleProfilePicChange = (e) => {
    setProfilePicFile(e.target.files[0])
    setFormData(prev => ({ ...prev, profilePicture: URL.createObjectURL(e.target.files[0]) }))
  }
  const handleDocChange = (e) => {
    setDocFile(e.target.files[0])
  }

  const validateForm = () => {
    // Check if any profile fields are empty
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' })
      return false
    }
    if (!formData.phone.trim()) {
      setMessage({ type: 'error', text: 'Phone number is required' })
      return false
    }
    if (!formData.address.trim()) {
      setMessage({ type: 'error', text: 'Address is required' })
      return false
    }

    // Validate password change if requested
    if (formData.newPassword || formData.currentPassword) {
      if (!formData.currentPassword) {
        setMessage({ type: 'error', text: 'Current password is required to change password' })
        return false
      }
      if (!formData.newPassword) {
        setMessage({ type: 'error', text: 'New password is required' })
        return false
      }
      const pw = formData.newPassword
      const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(pw)
      if (!strong) {
        setMessage({ type: 'error', text: 'Password must be 8+ chars with uppercase, lowercase, and special character' })
        return false
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'New passwords do not match' })
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage({ type: '', text: '' })

    try {
      if (!validateForm()) {
        setIsLoading(false)
        return
      }


      // Prepare data for update
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        bio: formData.bio,
        status: formData.status,
        specialization: formData.specialization,
        barNumber: formData.barNumber,
        social: formData.social,
        profileVisibility: formData.profileVisibility
      };
      // Only add hourlyRate if not empty
      if (formData.hourlyRate !== '' && formData.hourlyRate !== undefined && formData.hourlyRate !== null) {
        updateData.hourlyRate = formData.hourlyRate;
      }
      // Only add languages if array and not empty
      if (Array.isArray(formData.languages) && formData.languages.length > 0) {
        updateData.languages = formData.languages;
      }
      // Add password data if changing password
      if (formData.currentPassword && formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      // Handle file uploads (profile picture, document)
      const formPayload = new FormData();
      // Always append required fields as strings
      formPayload.append('name', formData.name ? formData.name : '');
      formPayload.append('phone', formData.phone ? formData.phone : '');
      formPayload.append('address', formData.address ? formData.address : '');
      // Append other fields
      Object.entries(updateData).forEach(([key, val]) => {
        if (["name","phone","address"].includes(key)) return; // already appended
        // For languages, always append as 'languages[]' (even if only one)
        if (key === 'languages' && Array.isArray(val)) {
          val.forEach(lang => formPayload.append('languages[]', lang));
        } else if (typeof val === 'object' && val !== null && key !== 'languages') {
          formPayload.append(key, JSON.stringify(val));
        } else if (val !== undefined && val !== null) {
          formPayload.append(key, val);
        }
      });
      if (profilePicFile) formPayload.append('profilePictureFile', profilePicFile);
      if (docFile) formPayload.append('documentFile', docFile);

      // Update profile (assume updateProfile can handle FormData)
      const result = await updateProfile(formPayload)

      if (result.success) {
        toast.success('Profile updated successfully!')
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        setIsEditing(false)
        setProfilePicFile(null)
        setDocFile(null)
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }))
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update profile' })
      }
    } catch (error) {
      console.error('Profile update error:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setMessage({ type: '', text: '' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-secondary-100">
      <div className="container-custom py-6 sm:py-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary-900 mb-2">Profile Settings</h1>
          <p className="text-secondary-600 text-sm sm:text-base">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-secondary-900">Personal Information</h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="btn-outline"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Message */}
                {message.text && (
                  <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                    message.type === 'success' 
                      ? 'bg-success-50 border border-success-200 text-success-800'
                      : 'bg-error-50 border border-error-200 text-error-800'
                  }`}>
                    {message.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-success-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-error-600" />
                    )}
                    {message.text}
                  </div>
                )}

                {/* Personal Info + Advanced Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Profile Picture */}
                  <div className="flex flex-col items-center gap-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Profile Picture</label>
                    <img src={getProfilePictureUrlWithPreview(formData.profilePicture, profilePicFile)} alt="Profile" className="w-24 h-24 rounded-full object-cover border" />
                    {isEditing && (
                      <label className="btn-outline mt-2 cursor-pointer">
                        <UploadCloud className="h-4 w-4 mr-1" /> Upload
                        <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />
                      </label>
                    )}
                  </div>
                  {/* Name, Email, Phone, Address */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="input-field"
                      placeholder="Enter your full name"
                    />
                    <label className="block text-sm font-medium text-secondary-700 mb-2 mt-4">
                      <Mail className="h-4 w-4 inline mr-2" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled={true}
                      className="input-field bg-secondary-50 cursor-not-allowed"
                      placeholder="Email cannot be changed"
                    />
                    <p className="text-xs text-secondary-500 mt-1">Email address cannot be changed for security reasons</p>
                    <label className="block text-sm font-medium text-secondary-700 mb-2 mt-4">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="input-field"
                      placeholder="Enter your phone number"
                    />
                    <label className="block text-sm font-medium text-secondary-700 mb-2 mt-4">
                      <MapPin className="h-4 w-4 inline mr-2" />
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="input-field"
                      placeholder="Enter your address"
                    />
                  </div>
                  {/* Bio/About */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Bio/About</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="input-field min-h-[80px]"
                      placeholder="Write something about yourself..."
                      maxLength={1000}
                    />
                  </div>
                  {/* Lawyer-specific fields */}
                  {user?.role === 'lawyer' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">Specialization</label>
                        <input
                          type="text"
                          name="specialization"
                          value={formData.specialization}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="input-field"
                          placeholder="e.g. Family Law, Corporate Law"
                        />
                        <label className="block text-sm font-medium text-secondary-700 mb-2 mt-4">Bar Number</label>
                        <input
                          type="text"
                          name="barNumber"
                          value={formData.barNumber}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="input-field"
                          placeholder="Bar Registration Number"
                        />
                        <label className="block text-sm font-medium text-secondary-700 mb-2 mt-4">Hourly Rate (PKR)</label>
                        <input
                          type="number"
                          name="hourlyRate"
                          value={formData.hourlyRate}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="input-field"
                          placeholder="Enter hourly rate"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">Languages</label>
                        <select
                          name="languages"
                          multiple
                          value={formData.languages}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="input-field"
                        >
                          <option value="English">English</option>
                          <option value="Urdu">Urdu</option>
                          <option value="Punjabi">Punjabi</option>
                        </select>
                      </div>
                    </>
                  )}
                  {/* Social Links */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Social Links</label>
                    <input
                      type="text"
                      name="social.facebook"
                      value={formData.social?.facebook || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="input-field mb-2"
                      placeholder="Facebook URL"
                    />
                    <input
                      type="text"
                      name="social.twitter"
                      value={formData.social?.twitter || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="input-field mb-2"
                      placeholder="Twitter URL"
                    />
                    <input
                      type="text"
                      name="social.linkedin"
                      value={formData.social?.linkedin || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="input-field"
                      placeholder="LinkedIn URL"
                    />
                  </div>
                  {/* Online/Offline/Busy Status */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="input-field"
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="busy">Busy</option>
                    </select>
                  </div>
                  {/* Profile Visibility */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Profile Visibility</label>
                    <select
                      name="profileVisibility"
                      value={formData.profileVisibility}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="input-field"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>

                {/* Password Change */}
                {isEditing && (
                  <div className="border-t border-secondary-200 pt-6 mb-8">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">Change Password</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          <Lock className="h-4 w-4 inline mr-2" />
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleInputChange}
                            className="input-field pr-10"
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          <Lock className="h-4 w-4 inline mr-2" />
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            className="input-field pr-10"
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          <Lock className="h-4 w-4 inline mr-2" />
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className="input-field pr-10"
                            placeholder="Confirm new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>

            {['lawyer', 'client'].includes(user?.role) && (
              <div className="card mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-secondary-900">Payout Profiles</h3>
                    <p className="text-sm text-secondary-600">
                      Add your payout account so you can withdraw funds from the balance page.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddPayout(prev => !prev)}
                    className="btn-outline flex items-center text-sm self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {showAddPayout ? 'Hide form' : 'Add payout profile'}
                  </button>
                </div>

                {showAddPayout && (
                  <form onSubmit={handleAddPayoutProfile} className="space-y-4 border border-secondary-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-secondary-600">Payout Method</label>
                        <select
                          name="method"
                          value={payoutForm.method}
                          onChange={handlePayoutInputChange}
                          className="input-field mt-1"
                        >
                          {PAYOUT_METHOD_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-secondary-600">Bank Name</label>
                        <input
                          type="text"
                          name="bankName"
                          value={payoutForm.bankName}
                          onChange={handlePayoutInputChange}
                          className="input-field mt-1"
                          placeholder="e.g. Allied Bank"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-secondary-600">Account Title</label>
                        <input
                          type="text"
                          name="accountTitle"
                          value={payoutForm.accountTitle}
                          onChange={handlePayoutInputChange}
                          className="input-field mt-1"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-secondary-600">Account Number / IBAN</label>
                        <input
                          type="text"
                          name="accountNumber"
                          value={payoutForm.accountNumber}
                          onChange={handlePayoutInputChange}
                          className="input-field mt-1"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-secondary-600">Account Type</label>
                        <select
                          name="accountType"
                          value={payoutForm.accountType}
                          onChange={handlePayoutInputChange}
                          className="input-field mt-1"
                        >
                          <option value="current">Current</option>
                          <option value="savings">Savings</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddPayout(false)
                          resetPayoutForm()
                        }}
                        className="btn-outline"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary" disabled={payoutLoading}>
                        {payoutLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                )}

                {payoutProfiles.length === 0 ? (
                  <div className="text-sm text-secondary-500 py-4">
                    No payout profiles found. Add one using the form above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payoutProfiles.map(profile => (
                      <div key={profile._id} className="border border-secondary-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary-50 rounded">
                            <Building2 className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm uppercase text-secondary-500">
                              {profile.extra?.bankName || profile.method || 'Payout'}
                            </p>
                            <h4 className="font-medium text-secondary-900">{profile.accountName}</h4>
                            <p className="text-sm text-secondary-500">Account: {profile.accountNumberOrIban}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Account Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-secondary-600">Account Type</span>
                  <span className="font-medium text-secondary-900 capitalize">{user?.role || 'client'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-600">Member Since</span>
                  <span className="font-medium text-secondary-900">
                    {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-600">Status</span>
                  <span className="badge badge-success">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Documents */}
            {user?.role === 'lawyer' && (
              <div className="card">
                <h3 className="text-lg font-semibold text-secondary-900 mb-4">Verification Documents</h3>
                <div className="space-y-6">
                  
                  {/* Required Documents */}
                  {[
                    { type: 'lawDegree', label: 'Law Degree Certificate', backendType: 'Law Degree Certificate', required: true },
                    { type: 'barLicense', label: 'Bar Council License', backendType: 'Bar Council License', required: true },
                    { type: 'professionalId', label: 'Professional ID Card', backendType: 'Professional ID Card', required: true }
                  ].map((docType) => {
                    const existingDoc = uploadedDocuments.find(doc => doc.documentType === docType.backendType)
                    
                    return (
                      <div key={docType.type} className="border border-secondary-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-secondary-900">{docType.label}</h4>
                          {existingDoc && (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              existingDoc.status === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : existingDoc.status === 'rejected'
                                ? 'bg-error-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {existingDoc.status === 'approved' ? 'Approved' : 
                               existingDoc.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                            </span>
                          )}
                        </div>
                        
                        {existingDoc ? (
                          /* Show uploaded document */
                          <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                            <div className="flex items-center">
                              <File className="h-4 w-4 text-secondary-500 mr-2" />
                              <div>
                                <p className="text-sm font-medium text-secondary-900">{docType.label}</p>
                                <p className="text-xs text-secondary-500">
                                  Uploaded: {new Date(existingDoc.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewDocument(existingDoc)}
                                className="text-primary-600 hover:text-primary-800"
                                title="View Document"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadDocument(existingDoc)}
                                className="text-green-600 hover:text-green-800"
                                title="Download Document"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDocumentDelete(existingDoc.id)}
                                className="text-error-500 hover:text-error-700"
                                title="Delete Document"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Show upload area */
                          <div className="border-2 border-dashed border-secondary-300 rounded-lg p-4">
                            <div className="text-center">
                              <Upload className="h-6 w-6 text-secondary-400 mx-auto mb-2" />
                              <p className="text-sm text-secondary-600 mb-2">Upload {docType.label}</p>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files[0]
                                  if (file) {
                                    handleDocumentUpload(file, docType.backendType)
                                  }
                                }}
                                className="hidden"
                                id={`upload-${docType.type}`}
                              />
                              <label
                                htmlFor={`upload-${docType.type}`}
                                className="btn btn-outline btn-sm cursor-pointer"
                              >
                                Choose File
                              </label>
                            </div>
                          </div>
                        )}
                        
                        {documentUploading && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm text-secondary-600 mb-1">
                              <span>Uploading...</span>
                              <span>{documentUploadProgress}%</span>
                            </div>
                            <div className="w-full bg-secondary-200 rounded-full h-2">
                              <div
                                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${documentUploadProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Status */}
                  <div className="p-3 bg-primary-50 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary-600 mr-2" />
                      <span className="text-sm text-primary-800">
                        Upload all three required documents for verification. Documents will be reviewed by admin.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}



          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage 
