import React, { useState, useEffect, useCallback } from 'react'
import {
  Video, Play, Trash2, Eye, Download, MessageCircle, Clock,
  Search, ChevronLeft, ChevronRight, RefreshCw, X,
  Calendar, AlertTriangle, CheckCircle, XCircle, Filter,
  HardDrive, Timer, Film, BarChart3
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

const STATUS_STYLES = {
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Completed', icon: CheckCircle },
  'in-progress': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'In Progress', icon: Clock },
  failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Failed', icon: XCircle },
}

const END_REASON_LABELS = {
  manual: 'Manual',
  session_expired: 'Session Expired',
  disconnected: 'Disconnected',
  error: 'Error',
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatFileSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function VideoCallOversight() {
  const [recordings, setRecordings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRecording, setSelectedRecording] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchRecordings = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 15 }
      if (search.trim()) params.search = search.trim()
      if (statusFilter) params.status = statusFilter
      const res = await adminAPI.getVideoRecordings(params)
      const data = res.data
      setRecordings(data.recordings || [])
      setTotalPages(data.pagination?.pages || data.totalPages || 1)
      setTotalCount(data.pagination?.total || data.total || 0)
      if (data.stats) setStats(data.stats)
    } catch (err) {
      toast.error('Failed to load recordings')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchRecordings()
  }, [fetchRecordings])

  const viewDetails = async (id) => {
    setDetailLoading(true)
    try {
      const res = await adminAPI.getVideoRecording(id)
      setSelectedRecording(res.data.recording)
    } catch (err) {
      toast.error('Failed to load recording details')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDelete = async (id) => {
    setDeleting(true)
    try {
      await adminAPI.deleteVideoRecording(id)
      toast.success('Recording deleted')
      setShowDeleteConfirm(null)
      setSelectedRecording(null)
      fetchRecordings()
    } catch (err) {
      toast.error('Failed to delete recording')
    } finally {
      setDeleting(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchRecordings()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
              <Film className="h-5 w-5 text-white" />
            </div>
            Video Call Recordings
          </h2>
          <p className="text-secondary-500 mt-1 text-sm">Monitor and manage all video call recordings and chat logs</p>
        </div>
        <button
          onClick={() => { setPage(1); fetchRecordings() }}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-200 disabled:opacity-50 shadow-md shadow-indigo-200 font-medium text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-secondary-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-secondary-500 text-xs font-semibold uppercase tracking-wider">Total Recordings</span>
              <div className="p-2 bg-blue-50 rounded-lg">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-secondary-900">{stats.totalRecordings || 0}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-secondary-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-secondary-500 text-xs font-semibold uppercase tracking-wider">Completed</span>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-600">{stats.completedRecordings || 0}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-secondary-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-secondary-500 text-xs font-semibold uppercase tracking-wider">Total Storage</span>
              <div className="p-2 bg-purple-50 rounded-lg">
                <HardDrive className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-purple-600">{formatFileSize(stats.totalSize || stats.totalStorageUsed || 0)}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-secondary-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-secondary-500 text-xs font-semibold uppercase tracking-wider">Avg Duration</span>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Timer className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-amber-600">{formatDuration(Math.round(stats.avgDuration || 0))}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client or lawyer name..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-secondary-200 rounded-xl text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all shadow-sm"
            />
          </div>
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm">
            Search
          </button>
        </form>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-secondary-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="bg-white border border-secondary-200 rounded-xl text-secondary-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecording && (
        <RecordingDetailModal
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
          onDelete={(id) => setShowDeleteConfirm(id)}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-secondary-100">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-secondary-900 text-center mb-2">Delete Recording?</h3>
            <p className="text-secondary-500 text-sm text-center mb-6 leading-relaxed">
              This will permanently delete the recording file and all associated chat logs. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-red-200"
              >
                {deleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recordings Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="p-3 bg-indigo-50 rounded-2xl">
            <RefreshCw className="h-7 w-7 text-indigo-600 animate-spin" />
          </div>
          <span className="text-secondary-500 text-sm font-medium">Loading recordings...</span>
        </div>
      ) : recordings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-secondary-200 shadow-sm">
          <div className="w-16 h-16 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Video className="h-8 w-8 text-secondary-400" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-900 mb-1">No Recordings Found</h3>
          <p className="text-secondary-500 text-sm">Video call recordings will appear here once calls are made.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-secondary-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-200 bg-secondary-50">
                  <th className="text-left text-secondary-500 font-semibold text-xs uppercase tracking-wider px-5 py-3.5">Date</th>
                  <th className="text-left text-secondary-500 font-semibold text-xs uppercase tracking-wider px-5 py-3.5">Client</th>
                  <th className="text-left text-secondary-500 font-semibold text-xs uppercase tracking-wider px-5 py-3.5">Lawyer</th>
                  <th className="text-left text-secondary-500 font-semibold text-xs uppercase tracking-wider px-5 py-3.5">Duration</th>
                  <th className="text-left text-secondary-500 font-semibold text-xs uppercase tracking-wider px-5 py-3.5">Size</th>
                  <th className="text-left text-secondary-500 font-semibold text-xs uppercase tracking-wider px-5 py-3.5">Chats</th>
                  <th className="text-left text-secondary-500 font-semibold text-xs uppercase tracking-wider px-5 py-3.5">Status</th>
                  <th className="text-left text-secondary-500 font-semibold text-xs uppercase tracking-wider px-5 py-3.5">End Reason</th>
                  <th className="text-right text-secondary-500 font-semibold text-xs uppercase tracking-wider px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {recordings.map((rec) => {
                  const statusStyle = STATUS_STYLES[rec.status] || STATUS_STYLES.completed
                  const StatusIcon = statusStyle.icon
                  return (
                    <tr key={rec._id} className="hover:bg-secondary-50 transition-colors duration-150">
                      <td className="px-5 py-3.5 text-secondary-600 whitespace-nowrap text-sm">
                        {formatDate(rec.callStartedAt || rec.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {rec.client?.name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <span className="text-secondary-900 text-sm font-medium truncate max-w-[130px]">{rec.client?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {rec.lawyer?.name?.[0]?.toUpperCase() || 'L'}
                          </div>
                          <span className="text-secondary-900 text-sm font-medium truncate max-w-[130px]">{rec.lawyer?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-secondary-700 font-mono text-xs bg-secondary-100 px-2 py-1 rounded-md">{formatDuration(rec.recordingDuration)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-secondary-600 whitespace-nowrap text-xs">
                        {formatFileSize(rec.recordingSize)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-secondary-600 bg-secondary-50 px-2.5 py-1 rounded-lg text-xs border border-secondary-200">
                          <MessageCircle className="h-3 w-3 text-indigo-500" />
                          {rec.chatMessages?.length || 0}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-secondary-500 text-xs">
                        {END_REASON_LABELS[rec.endReason] || rec.endReason || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => viewDetails(rec._id)}
                            className="p-2 text-secondary-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-150"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {rec.recordingUrl && (
                            <a
                              href={rec.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-secondary-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-150"
                              title="Play Recording"
                            >
                              <Play className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => setShowDeleteConfirm(rec._id)}
                            className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-secondary-200 bg-secondary-50">
              <span className="text-secondary-500 text-sm">
                Page <span className="text-secondary-900 font-semibold">{page}</span> of <span className="text-secondary-900 font-semibold">{totalPages}</span> ({totalCount} total)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 text-secondary-400 hover:text-secondary-700 hover:bg-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-secondary-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 text-secondary-400 hover:text-secondary-700 hover:bg-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-secondary-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// DETAIL MODAL — View recording, chat log, metadata
// ═══════════════════════════════════════════════════
function RecordingDetailModal({ recording, onClose, onDelete }) {
  const [activeTab, setActiveTab] = useState('info')
  const rec = recording

  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

  return (
    <div className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-secondary-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-secondary-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
              <Video className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-secondary-900">Recording Details</h3>
              <p className="text-secondary-500 text-sm mt-0.5">
                {formatDate(rec.callStartedAt || rec.createdAt)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-xl transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-secondary-100 px-5 gap-1">
          {[
            { id: 'info', label: 'Info', icon: Eye },
            { id: 'video', label: 'Video', icon: Play },
            { id: 'chat', label: `Chat (${rec.chatMessages?.length || 0})`, icon: MessageCircle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-secondary-400 hover:text-secondary-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'info' && (
            <div className="space-y-5">
              {/* Participants */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="text-blue-600 text-xs font-semibold uppercase tracking-wider mb-3">Client</div>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-200">
                      {rec.client?.name?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      <div className="text-secondary-900 font-semibold">{rec.client?.name || '—'}</div>
                      <div className="text-secondary-500 text-sm">{rec.client?.email || '—'}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <div className="text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-3">Lawyer</div>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-200">
                      {rec.lawyer?.name?.[0]?.toUpperCase() || 'L'}
                    </div>
                    <div>
                      <div className="text-secondary-900 font-semibold">{rec.lawyer?.name || '—'}</div>
                      <div className="text-secondary-500 text-sm">{rec.lawyer?.email || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Status', value: STATUS_STYLES[rec.status]?.label || rec.status, color: 'text-emerald-600' },
                  { label: 'End Reason', value: END_REASON_LABELS[rec.endReason] || rec.endReason || '—', color: 'text-secondary-700' },
                  { label: 'Duration', value: formatDuration(rec.recordingDuration), color: 'text-amber-600' },
                  { label: 'File Size', value: formatFileSize(rec.recordingSize), color: 'text-purple-600' },
                  { label: 'Format', value: rec.recordingFormat || '—', color: 'text-secondary-700' },
                  { label: 'Session Limit', value: formatDuration(rec.sessionDurationLimit), color: 'text-secondary-700' },
                  { label: 'Call Started', value: formatDate(rec.callStartedAt), color: 'text-blue-600' },
                  { label: 'Call Ended', value: formatDate(rec.callEndedAt), color: 'text-red-500' },
                  { label: 'Initiated By', value: rec.initiatorRole || '—', color: 'text-secondary-700' },
                ].map((item, i) => (
                  <div key={i} className="bg-secondary-50 rounded-xl p-3 border border-secondary-100">
                    <div className="text-secondary-400 text-xs font-medium mb-1">{item.label}</div>
                    <div className={`text-sm font-semibold ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Appointment Details */}
              <div className="bg-secondary-50 rounded-xl p-4 border border-secondary-100">
                <div className="text-secondary-500 text-xs font-semibold uppercase tracking-wider mb-2">Appointment</div>
                {rec.appointment && typeof rec.appointment === 'object' ? (
                  <div className="space-y-2">
                    <div className="text-secondary-700 text-sm font-mono break-all bg-white px-3 py-1.5 rounded-lg border border-secondary-200">ID: {rec.appointment._id}</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {rec.appointment.date && (
                        <span className="text-xs bg-blue-50 px-2.5 py-1 rounded-lg text-blue-700 font-medium border border-blue-200">
                          {new Date(rec.appointment.date).toLocaleDateString()}
                        </span>
                      )}
                      {rec.appointment.time && (
                        <span className="text-xs bg-purple-50 px-2.5 py-1 rounded-lg text-purple-700 font-medium border border-purple-200">
                          {rec.appointment.time}
                        </span>
                      )}
                      {rec.appointment.consultationType && (
                        <span className="text-xs bg-emerald-50 px-2.5 py-1 rounded-lg text-emerald-700 font-medium border border-emerald-200">
                          {rec.appointment.consultationType}
                        </span>
                      )}
                      {rec.appointment.status && (
                        <span className="text-xs bg-amber-50 px-2.5 py-1 rounded-lg text-amber-700 font-medium border border-amber-200">
                          {rec.appointment.status}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-secondary-700 text-sm font-mono break-all">{String(rec.appointment || '—')}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {rec.recordingUrl && (
                  <a
                    href={rec.recordingUrl.startsWith('http') ? rec.recordingUrl : `${baseUrl}${rec.recordingUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-indigo-200"
                  >
                    <Download className="h-4 w-4" />
                    Download Recording
                  </a>
                )}
                <button
                  onClick={() => onDelete(rec._id)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-all border border-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-4">
              {rec.recordingUrl ? (
                <div className="rounded-2xl overflow-hidden bg-secondary-900 border border-secondary-200 shadow-lg">
                  <video
                    src={rec.recordingUrl.startsWith('http') ? rec.recordingUrl : `${baseUrl}${rec.recordingUrl}`}
                    controls
                    className="w-full max-h-[60vh]"
                    controlsList="nodownload"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary-50 rounded-2xl border border-secondary-200">
                  <div className="w-16 h-16 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Video className="h-8 w-8 text-secondary-400" />
                  </div>
                  <h4 className="text-secondary-900 font-semibold mb-1">No Recording Available</h4>
                  <p className="text-secondary-500 text-sm">
                    {rec.status === 'in-progress'
                      ? 'Recording is still in progress'
                      : 'The recording file is not available'}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-2">
              {!rec.chatMessages || rec.chatMessages.length === 0 ? (
                <div className="text-center py-20 bg-secondary-50 rounded-2xl border border-secondary-200">
                  <div className="w-16 h-16 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-secondary-400" />
                  </div>
                  <h4 className="text-secondary-900 font-semibold mb-1">No Chat Messages</h4>
                  <p className="text-secondary-500 text-sm">No messages were exchanged during this call.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-2">
                  {rec.chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-3.5 ${
                        msg.senderRole === 'lawyer'
                          ? 'bg-emerald-50 border border-emerald-100'
                          : msg.senderRole === 'client'
                            ? 'bg-blue-50 border border-blue-100'
                            : 'bg-secondary-50 border border-secondary-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            msg.senderRole === 'lawyer' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {msg.senderRole === 'lawyer' ? 'Lawyer' : 'Client'}
                          </span>
                          <span className="text-secondary-900 text-sm font-medium">{msg.senderName || 'Unknown'}</span>
                        </div>
                        <span className="text-secondary-400 text-xs font-mono">
                          {msg.timestamp
                            ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : '—'}
                        </span>
                      </div>
                      <p className="text-secondary-700 text-sm break-words pl-1 leading-relaxed">{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}