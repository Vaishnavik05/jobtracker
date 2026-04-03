import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')
const API_URL = `${API_BASE_URL}/api/applications`
const STATUS_OPTIONS = ['Applied', 'Interview', 'Offer', 'Rejected']
const STATUS_COLORS = {
  Applied: 'badge-info',
  Interview: 'badge-warning',
  Offer: 'badge-success',
  Rejected: 'badge-error',
}

const emptyForm = {
  company: '',
  role: '',
  status: 'Applied',
  appliedDate: '',
  notes: '',
}

async function request(path = '', options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
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

export default function App() {
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
    loadApplications()
  }, [filterStatus])

  const stats = useMemo(() => {
    const byStatus = STATUS_OPTIONS.reduce((acc, status) => {
      acc[status] = applications.filter((item) => item.status === status).length
      return acc
    }, {})
    return {
      total: applications.length,
      byStatus,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-blue-600">My Job Applications</h1>
              <p className="text-sm text-slate-600 mt-1">Track your job search journey</p>
            </div>
            <button
              className={`btn gap-2 ${showForm ? 'btn-outline' : 'btn-primary'}`}
              onClick={() => {
                if (!showForm) {
                  resetForm()
                }
                setShowForm(!showForm)
              }}
            >
              {showForm ? (
                <>
                  <span>✕</span> Close Form
                </>
              ) : (
                <>
                  <span>+</span> Add Application
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Alerts */}
        {error && (
          <div className="alert alert-error shadow-lg mb-6 border-l-4">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m8-8l2 2m0 0l2 2m-2-2l-2 2m2-2l2-2" />
              </svg>
              <span>{error}</span>
              <button
                className="ml-auto btn btn-sm btn-ghost"
                onClick={() => setError('')}
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {success && (
          <div className="alert alert-success shadow-lg mb-6 border-l-4">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{success}</span>
              <button
                className="ml-auto btn btn-sm btn-ghost"
                onClick={() => setSuccess('')}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="stat bg-white shadow rounded-lg border border-slate-200">
            <div className="stat-figure text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 10 15.5 10 14 10.67 14 11.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 10 8.5 10 7 10.67 7 11.5 7.67 13 8.5 13z" />
              </svg>
            </div>
            <div className="stat-title">Total Applications</div>
            <div className="stat-value text-2xl text-primary font-bold">{stats.total}</div>
          </div>

          <div className="stat bg-white shadow rounded-lg border border-slate-200">
            <div className="stat-figure text-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div className="stat-title">Applied</div>
            <div className="stat-value text-2xl text-info font-bold">{stats.byStatus.Applied}</div>
          </div>

          <div className="stat bg-white shadow rounded-lg border border-slate-200">
            <div className="stat-figure text-warning">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z" />
              </svg>
            </div>
            <div className="stat-title">Interviews</div>
            <div className="stat-value text-2xl text-warning font-bold">{stats.byStatus.Interview}</div>
          </div>

          <div className="stat bg-white shadow rounded-lg border border-slate-200">
            <div className="stat-figure text-success">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>
            <div className="stat-title">Offers</div>
            <div className="stat-value text-2xl text-success font-bold">{stats.byStatus.Offer}</div>
          </div>

          <div className="stat bg-white shadow rounded-lg border border-slate-200">
            <div className="stat-figure text-error">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
              </svg>
            </div>
            <div className="stat-title">Rejected</div>
            <div className="stat-value text-2xl text-error font-bold">{stats.byStatus.Rejected}</div>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card bg-white shadow-lg border border-slate-200 mb-8">
            <div className="card-body p-6">
              <h2 className="card-title text-2xl font-bold text-slate-800 mb-6">
                {editingId ? '✎ Edit Application' : '+ Add New Application'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-slate-700">Company Name</span>
                    </label>
                    <input
                      type="text"
                      name="company"
                      placeholder="e.g., Google, Microsoft, Amazon"
                      className="input input-bordered input-lg focus:input-primary"
                      value={form.company}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-slate-700">Job Title</span>
                    </label>
                    <input
                      type="text"
                      name="role"
                      placeholder="e.g., Senior Frontend Developer"
                      className="input input-bordered input-lg focus:input-primary"
                      value={form.role}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-slate-700">Status</span>
                    </label>
                    <select
                      name="status"
                      className="select select-bordered select-lg focus:select-primary"
                      value={form.status}
                      onChange={handleChange}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-slate-700">Applied Date</span>
                    </label>
                    <input
                      type="date"
                      name="appliedDate"
                      className="input input-bordered input-lg focus:input-primary"
                      value={form.appliedDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700">Notes</span>
                  </label>
                  <textarea
                    name="notes"
                    placeholder="Interview feedback, referral info, follow-up date..."
                    className="textarea textarea-bordered textarea-lg focus:textarea-primary h-24"
                    value={form.notes}
                    onChange={handleChange}
                  />
                  <label className="label">
                    <span className="label-text-alt text-slate-500">Share any relevant notes</span>
                  </label>
                </div>

                <div className="card-actions justify-end gap-3">
                  <button type="button" className="btn btn-outline text-base" onClick={resetForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary text-base">
                    {editingId ? '💾 Update Application' : '✓ Add Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="card bg-white shadow border border-slate-200 mb-8">
          <div className="card-body p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-slate-700">🔍 Search</span>
                </label>
                <input
                  type="text"
                  placeholder="Search by company or job title..."
                  className="input input-bordered input-lg focus:input-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-slate-700">📋 Filter by Status</span>
                </label>
                <select
                  className="select select-bordered select-lg focus:select-primary"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Status</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="card bg-white shadow border border-slate-200">
          <div className="card-body p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="card-title text-2xl font-bold text-slate-800">
                📝 Job Applications ({filteredApplications.length})
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="alert alert-info border-l-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="h-6 w-6 shrink-0 stroke-current"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span>No applications found. {searchTerm && 'Try adjusting your search.'}</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead className="bg-slate-100">
                    <tr className="border-b-2 border-slate-300">
                      <th className="text-slate-700 font-bold">Company</th>
                      <th className="text-slate-700 font-bold">Job Title</th>
                      <th className="text-slate-700 font-bold">Status</th>
                      <th className="text-slate-700 font-bold">Applied Date</th>
                      <th className="text-slate-700 font-bold">Notes</th>
                      <th className="text-slate-700 font-bold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50 border-b border-slate-200">
                        <td className="font-bold text-slate-800">{app.company}</td>
                        <td className="text-slate-700">{app.role}</td>
                        <td>
                          <div className={`badge badge-lg ${STATUS_COLORS[app.status]} text-white font-semibold`}>
                            {app.status}
                          </div>
                        </td>
                        <td className="text-slate-600">{formatDate(app.appliedDate)}</td>
                        <td className="truncate max-w-xs text-slate-600">
                          {app.notes ? app.notes.substring(0, 30) + '...' : '-'}
                        </td>
                        <td>
                          <div className="flex gap-2 justify-center">
                            <button
                              className="btn btn-sm btn-outline text-primary hover:bg-primary hover:text-white"
                              onClick={() => startEdit(app)}
                              title="Edit this application"
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-outline text-error hover:bg-error hover:text-white"
                              onClick={() => handleDelete(app.id)}
                              title="Delete this application"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}