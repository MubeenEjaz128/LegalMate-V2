import React, { useState, useEffect } from 'react'
import {
  Trash2, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  Database, Shield, Search, ChevronDown, ChevronUp, Info
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

// Group collections into logical categories
const COLLECTION_GROUPS = {
  'Appointments & Meetings': ['appointments'],
  'Chat & Messaging': ['chatMessages', 'conversations', 'aiChats', 'chatSessions'],
  'Content (CMS)': ['blogs', 'faqs', 'pages', 'services', 'contactMessages'],
  'Feedback & Ratings': ['feedback'],
  'Financial': ['walletTransactions', 'userBalances', 'buyBalanceRequests', 'withdrawRequests', 'creditPurchases', 'transactions', 'paymentMethods', 'payoutProfiles', 'payoutPolicy'],
  'System': ['systemSettings', 'auditLogs'],
}

export default function DataResetManager() {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [confirmText, setConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)
  const [results, setResults] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedGroups, setExpandedGroups] = useState(new Set(Object.keys(COLLECTION_GROUPS)))

  const fetchCollections = async () => {
    setLoading(true)
    try {
      const res = await adminAPI.getResetCollections()
      setCollections(res.data.collections)
    } catch (err) {
      toast.error('Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCollections() }, [])

  const toggleGroup = (group) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })
  }

  const toggleSelect = (key) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
    setResults(null)
  }

  const selectAllInGroup = (groupKeys) => {
    setSelected(prev => {
      const next = new Set(prev)
      const allSelected = groupKeys.every(k => next.has(k))
      groupKeys.forEach(k => allSelected ? next.delete(k) : next.add(k))
      return next
    })
    setResults(null)
  }

  const selectAll = () => {
    if (selected.size === collections.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(collections.map(c => c.key)))
    }
    setResults(null)
  }

  const totalSelectedDocs = collections
    .filter(c => selected.has(c.key))
    .reduce((sum, c) => sum + c.count, 0)

  const handleReset = async () => {
    if (confirmText !== 'RESET DATA') {
      toast.error('Type "RESET DATA" to confirm')
      return
    }
    if (selected.size === 0) {
      toast.error('Select at least one collection')
      return
    }

    setResetting(true)
    setResults(null)
    try {
      const res = await adminAPI.resetCollections([...selected], confirmText)
      setResults(res.data)
      toast.success(res.data.message)
      setSelected(new Set())
      setConfirmText('')
      fetchCollections() // refresh counts
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Reset failed'
      toast.error(msg)
    } finally {
      setResetting(false)
    }
  }

  const filteredCollections = collections.filter(c =>
    c.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.key.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getGroupCollections = (groupKeys) =>
    groupKeys.map(key => filteredCollections.find(c => c.key === key)).filter(Boolean)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-primary-600 mr-3" />
        <span className="text-secondary-600">Loading collections...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-secondary-200 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-50 rounded-xl">
            <Database className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-secondary-900">Database Reset Manager</h2>
            <p className="text-secondary-500 mt-1">
              Select individual collections or entire groups to clear their data. This action is <strong className="text-red-600">irreversible</strong>.
            </p>
          </div>
          <button
            onClick={fetchCollections}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <strong>Warning:</strong> Resetting data will permanently delete all records from selected collections.
          This cannot be undone. Make sure you have a backup if needed.
        </div>
      </div>

      {/* Search + Select All */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        <button
          onClick={selectAll}
          className="px-4 py-2.5 text-sm font-medium border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors whitespace-nowrap"
        >
          {selected.size === collections.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Collection Groups */}
      <div className="space-y-3">
        {Object.entries(COLLECTION_GROUPS).map(([groupName, groupKeys]) => {
          const groupCollections = getGroupCollections(groupKeys)
          if (groupCollections.length === 0) return null

          const allGroupKeys = groupCollections.map(c => c.key)
          const allGroupSelected = allGroupKeys.length > 0 && allGroupKeys.every(k => selected.has(k))
          const someGroupSelected = allGroupKeys.some(k => selected.has(k))
          const groupTotal = groupCollections.reduce((s, c) => s + c.count, 0)
          const isExpanded = expandedGroups.has(groupName)

          return (
            <div key={groupName} className="bg-white rounded-xl border border-secondary-200 overflow-hidden">
              {/* Group Header */}
              <div
                className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-secondary-50 transition-colors"
                onClick={() => toggleGroup(groupName)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); selectAllInGroup(allGroupKeys) }}
                  className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                    allGroupSelected
                      ? 'bg-red-600 border-red-600 text-white'
                      : someGroupSelected
                        ? 'bg-red-100 border-red-400'
                        : 'border-secondary-300 hover:border-red-400'
                  }`}
                >
                  {allGroupSelected && <CheckCircle className="h-3.5 w-3.5" />}
                  {someGroupSelected && !allGroupSelected && <div className="h-2 w-2 bg-red-500 rounded-sm" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-secondary-900">{groupName}</span>
                  <span className="text-xs text-secondary-400 ml-2">
                    ({groupCollections.length} collection{groupCollections.length > 1 ? 's' : ''} · {groupTotal.toLocaleString()} record{groupTotal !== 1 ? 's' : ''})
                  </span>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-secondary-400" /> : <ChevronDown className="h-4 w-4 text-secondary-400" />}
              </div>

              {/* Group Items */}
              {isExpanded && (
                <div className="border-t border-secondary-100">
                  {groupCollections.map((col) => (
                    <label
                      key={col.key}
                      className={`flex items-center gap-4 px-5 py-3 cursor-pointer transition-colors border-b border-secondary-50 last:border-b-0 ${
                        selected.has(col.key) ? 'bg-red-50/60' : 'hover:bg-secondary-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(col.key)}
                        onChange={() => toggleSelect(col.key)}
                        className="sr-only"
                      />
                      <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                        selected.has(col.key) ? 'bg-red-600 border-red-600 text-white' : 'border-secondary-300'
                      }`}>
                        {selected.has(col.key) && <CheckCircle className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary-800">{col.label}</p>
                        <p className="text-xs text-secondary-400">{col.description}</p>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${col.count > 0 ? 'text-secondary-700' : 'text-secondary-300'}`}>
                        {col.count.toLocaleString()}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Confirmation & Action */}
      {selected.size > 0 && (
        <div className="bg-white rounded-xl border-2 border-red-200 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-secondary-900">
                Confirm Reset: {selected.size} collection{selected.size > 1 ? 's' : ''} ({totalSelectedDocs.toLocaleString()} record{totalSelectedDocs !== 1 ? 's' : ''})
              </p>
              <p className="text-sm text-secondary-500 mt-1">
                Type <code className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-mono text-xs">RESET DATA</code> below to confirm.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder='Type "RESET DATA" to confirm'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="flex-1 px-4 py-2.5 border-2 border-red-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none placeholder:text-secondary-400"
            />
            <button
              onClick={handleReset}
              disabled={resetting || confirmText !== 'RESET DATA'}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {resetting ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Resetting...</>
              ) : (
                <><Trash2 className="h-4 w-4" /> Reset Selected</>
              )}
            </button>
          </div>

          {/* Selected collections summary */}
          <div className="flex flex-wrap gap-1.5">
            {[...selected].map(key => {
              const col = collections.find(c => c.key === key)
              return col ? (
                <span key={key} className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                  {col.label}
                  <button
                    onClick={() => toggleSelect(key)}
                    className="hover:text-red-900"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </span>
              ) : null
            })}
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white rounded-xl border border-secondary-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold text-secondary-900">{results.message}</p>
              <p className="text-sm text-secondary-500">Total records deleted: {results.totalDeleted.toLocaleString()}</p>
            </div>
          </div>
          <div className="divide-y divide-secondary-100">
            {results.results.map((r, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2.5">
                {r.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                ) : r.status === 'error' ? (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                ) : (
                  <Info className="h-4 w-4 text-yellow-500 shrink-0" />
                )}
                <span className="text-sm font-medium text-secondary-700 flex-1">{r.label || r.key}</span>
                {r.status === 'success' ? (
                  <span className="text-xs text-green-600">{r.deletedCount.toLocaleString()} deleted</span>
                ) : (
                  <span className="text-xs text-red-600">{r.reason}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
