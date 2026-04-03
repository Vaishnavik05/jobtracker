import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { useAuth } from "./context/AuthContext";
import api from './api/client';
import './App.css';

const STATUS_OPTIONS = ['Applied', 'Interview', 'Offer', 'Rejected']
const STATUS_BADGE_COLORS = {
  Applied: 'bg-blue-100 text-blue-800',
  Interview: 'bg-yellow-100 text-yellow-800',
  Offer: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
}

const emptyForm = {
  company: '',
  role: '',
  status: 'Applied',
  appliedDate: '',
  notes: '',
}

async function request(path = '', options = {}) {
  try {
    const response = await fetch(`http://localhost:8080/api/applications${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        ...(options.headers || {}),
      },
      ...options,
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || `Request failed with status ${response.status}`)
    }

    if (response.status === 204) {
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return response.json()
    }

    return null
  } catch (err) {
    throw err
  }
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function Dashboard() {
  const { logout, token } = useAuth()
  const [applications, setApplications] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)

  const loadApplications = async () => {
    setLoading(true)
    setError('')
    try {
      const query = filterStatus === 'All' ? '' : `?status=${encodeURIComponent(filterStatus)}`
      const data = await request(query)
      setApplications(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Unable to load applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadApplications()
    }
  }, [filterStatus, token])

  const stats = useMemo(() => {
    return {
      total: applications.length,
      applied: applications.filter(a => a.status === 'Applied').length,
      interview: applications.filter(a => a.status === 'Interview').length,
      offer: applications.filter(a => a.status === 'Offer').length,
      rejected: applications.filter(a => a.status === 'Rejected').length,
    }
  }, [applications])

  const filteredApplications = useMemo(() => {
    return applications.filter(
      (app) =>
        app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.role.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [applications, searchTerm])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setSuccess('')
    setShowForm(false)
  }

  const startEdit = (application) => {
    setEditingId(application.id)
    setForm({
      company: application.company || '',
      role: application.role || '',
      status: application.status || 'Applied',
      appliedDate: application.appliedDate || '',
      notes: application.notes || '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      company: form.company.trim(),
      role: form.role.trim(),
      status: form.status,
      appliedDate: form.appliedDate,
      notes: form.notes.trim(),
    }

    try {
      if (editingId) {
        await request(`/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        setSuccess('Application updated successfully!')
      } else {
        await request('', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setSuccess('Application added successfully!')
      }

      setForm(emptyForm)
      setEditingId(null)
      setShowForm(false)
      await loadApplications()
    } catch (err) {
      setError(err.message || 'Unable to save application')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this application?')) return

    setError('')
    setSuccess('')

    try {
      await request(`/${id}`, {
        method: 'DELETE',
      })
      setSuccess('Application deleted successfully!')
      if (editingId === id) {
        resetForm()
      }
      await loadApplications()
    } catch (err) {
      setError(err.message || 'Unable to delete application')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg font-bold">J</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Job Tracker</h1>
                <p className="text-xs text-gray-500">Track your applications</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium border border-gray-300 rounded-full hover:bg-gray-100 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-900">✕</button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3 items-start">
            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-green-800 text-sm font-medium">{success}</p>
            </div>
            <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-900">✕</button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Apps</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Applied</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.applied}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Interviews</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.interview}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Offers</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.offer}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏆</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✕</span>
              </div>
            </div>
          </div>
        </div>

        {/* Add Form Card */}
        {showForm && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingId ? '✏️ Edit Application' : '➕ Add New Application'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                  <input
                    type="text"
                    name="company"
                    placeholder="e.g., Google, Amazon, Microsoft"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.company}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                  <input
                    type="text"
                    name="role"
                    placeholder="e.g., Senior Frontend Developer"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.role}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                  <select
                    name="status"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.status}
                    onChange={handleChange}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Applied Date *</label>
                  <input
                    type="date"
                    name="appliedDate"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.appliedDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  name="notes"
                  placeholder="Interview feedback, referral info, follow-up date..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                  value={form.notes}
                  onChange={handleChange}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  {editingId ? '💾 Update' : '✓ Add Application'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Search</label>
              <input
                type="text"
                placeholder="Search by company or title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📋 Filter by Status</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => { resetForm(); setShowForm(true) }}
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition"
              >
                ➕ Add Application
              </button>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">
            📝 Applications ({filteredApplications.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-blue-900">No applications found. {searchTerm && 'Try adjusting your search.'}</p>
            </div>
          ) : (
            filteredApplications.map((app) => (
              <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{app.company}</h3>
                      <p className="text-gray-600 font-medium">{app.role}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_BADGE_COLORS[app.status]}`}>
                      {app.status}
                    </span>
                  </div>
                  
                  <div className="flex gap-6 text-sm text-gray-600 mb-3">
                    <span>📅 {formatDate(app.appliedDate)}</span>
                    {app.notes && <span className="max-w-md">📝 {app.notes.substring(0, 50)}...</span>}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => startEdit(app)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(app.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium transition"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}