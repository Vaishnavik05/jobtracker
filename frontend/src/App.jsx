import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { useAuth } from "./context/AuthContext";
import "./App.css";
import AdminDashboard from "./pages/AdminDashboard";

// All possible statuses — covers both admin-set and user-application stages
const ALL_STATUS_OPTIONS = [
  "Online Test",
  "Group Discussion",
  "Technical Interview",
  "HR Interview",
  "Offer",
  "Rejected",
];

const STATUS_CHART_COLORS = {
  "Online Test": "#3b82f6",
  "Group Discussion": "#8b5cf6",
  "Technical Interview": "#f59e0b",
  "HR Interview": "#10b981",
};

// Badge styles for the user's current round
const STATUS_BADGE = {
  "Online Test": "bg-blue-100 text-blue-800",
  "Group Discussion": "bg-purple-100 text-purple-800",
  "Technical Interview": "bg-amber-100 text-amber-800",
  "HR Interview": "bg-emerald-100 text-emerald-800",
  "Offer": "bg-green-100 text-green-800",
  "Rejected": "bg-red-100 text-red-800",
};

const emptyForm = {
  company: "",
  role: "",
  appliedDate: "",
  notes: "",
};

async function request(path = "", options = {}) {
  const token = sessionStorage.getItem("token");

  const response = await fetch(`http://localhost:8080/api/applications${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      throw new Error("Session expired. Please login again.");
    }

    let message = "Request failed";
    try {
      const err = await response.json();
      message = err?.message || message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();

  return response.text();
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function normalizeApplications(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.applications)) return data.applications;
  return [];
}

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function ApplicationsBarChart({ data }) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Applications by Stage (Bar)</h3>
      <div className="space-y-4">
        {data.map((item) => {
          const width = (item.value / max) * 100;
          return (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{item.label}</span>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{ width: `${width}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApplicationsPieChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  let cumulative = 0;
  const segments = data
    .map((item) => {
      const start = total ? (cumulative / total) * 360 : 0;
      cumulative += item.value;
      const end = total ? (cumulative / total) * 360 : 0;
      return `${item.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  const pieStyle = {
    background: total
      ? `conic-gradient(${segments})`
      : "conic-gradient(#e5e7eb 0deg 360deg)",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Applications by Stage (Pie)</h3>
      <div className="flex items-center gap-6">
        <div className="relative w-44 h-44 rounded-full" style={pieStyle}>
          <div className="absolute inset-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-700">Total {total}</span>
          </div>
        </div>
        <div className="space-y-2">
          {data.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-gray-700">{item.label}</span>
              <span className="font-semibold text-gray-900">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardContent({ title, subtitle, showCharts = false }) {
  const { logout, token } = useAuth();
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [publicJobs, setPublicJobs] = useState([]);
  const [showPublicJobs, setShowPublicJobs] = useState(false);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState("");
  const [applyingId, setApplyingId] = useState(null);

  const loadApplications = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request("", { method: "GET" });
      setApplications(normalizeApplications(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const loadPublicJobs = async () => {
    setPublicLoading(true);
    setPublicError("");
    try {
      const data = await request("/public-jobs", { method: "GET" });
      setPublicJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      setPublicError(err instanceof Error ? err.message : "Failed to load jobs posted by admin");
    } finally {
      setPublicLoading(false);
    }
  };

  useEffect(() => {
    if (!token) { setApplications([]); return; }
    void loadApplications();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadPublicJobs();
  }, [token]);

  const stats = useMemo(() => {
    const total = publicJobs.length;
    const applied = applications.length;
    const notApplied = Math.max(total - applied, 0);
    const offers = applications.filter((a) => a.status === "Offer").length;
    const rejected = applications.filter((a) => a.status === "Rejected").length;
    return { total, applied, notApplied, offers, rejected };
  }, [applications, publicJobs]);

  const chartData = useMemo(() => {
    const counts = Object.fromEntries(ALL_STATUS_OPTIONS.map((s) => [s, 0]));
    for (const app of applications) {
      if (counts[app.status] !== undefined) counts[app.status] += 1;
    }
    // Only chart the 4 interview-pipeline stages
    return ALL_STATUS_OPTIONS
      .filter((s) => STATUS_CHART_COLORS[s])
      .map((status) => ({
        label: status,
        value: counts[status],
        color: STATUS_CHART_COLORS[status],
      }));
  }, [applications]);

  // Filter public jobs — search by name, and when status filter is set,
  // match against the USER's current status for that job (not the job's initial stage).
  const filteredPublicJobs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return publicJobs.filter((job) => {
      const company = String(job.company || "").toLowerCase();
      const role = String(job.role || "").toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        company.includes(normalizedSearch) ||
        role.includes(normalizedSearch);

      if (!matchesSearch) return false;

      // When a status filter is active, find the user's application for this job
      // and check if their current stage matches the filter.
      if (filterStatus !== "All") {
        const userApp = applications.find((app) => {
          // Prefer jobId match if backend provides it
          if (app.jobId && job.id) return app.jobId === job.id;
          // Fallback: match by company + role + location
          return (
            (app.company ?? "").trim().toLowerCase() === (job.company ?? "").trim().toLowerCase() &&
            (app.role ?? "").trim().toLowerCase() === (job.role ?? "").trim().toLowerCase() &&
            (app.location ?? "").trim().toLowerCase() === (job.location ?? "").trim().toLowerCase()
          );
        });
        if (!userApp) return false; // not applied → can't match a user-status filter
        if (userApp.status !== filterStatus) return false;
      }

      return true;
    });
  }, [publicJobs, applications, searchTerm, filterStatus]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(timer);
  }, [success]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload = {
      company: form.company.trim(),
      role: form.role.trim(),
      appliedDate: form.appliedDate,
      notes: form.notes.trim(),
    };

    if (!payload.company || !payload.role || !payload.appliedDate) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      await request("", { method: "POST", body: JSON.stringify(payload) });
      setSuccess("Application added successfully.");
      setForm(emptyForm);
      setShowForm(false);
      await loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save application");
    }
  };

  const handleViewJobs = async () => {
    setShowPublicJobs(true);
    setSearchTerm("");
    setFilterStatus("All");
    await loadPublicJobs();
  };

  const handleApplyToPublicJob = async (jobId) => {
    setApplyingId(jobId);
    setError("");
    setSuccess("");
    try {
      await request("/apply/" + jobId, { method: "POST" });
      setSuccess("Applied successfully.");
      await Promise.all([loadApplications(), loadPublicJobs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply");
    } finally {
      setApplyingId(null);
    }
  };

  const isApplyWindowOpen = (dateValue) => {
    if (!dateValue) return false;
    const posted = new Date(dateValue + "T00:00:00");
    if (Number.isNaN(posted.getTime())) return false;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const diff = Date.now() - posted.getTime();
    return diff >= 0 && diff < ONE_DAY_MS;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-xs text-gray-500">{subtitle}</p>
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
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 items-start">
            <div className="flex-1">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
            <button onClick={() => setError("")} className="text-red-600 hover:text-red-900">x</button>
          </div>
        )}

        {success && (
          <div className="fixed top-24 right-6 z-50">
            <div className="inline-flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-lg max-w-[90vw]">
              <p className="text-sm font-semibold text-green-800 whitespace-nowrap">{success}</p>
              <button
                onClick={() => setSuccess("")}
                className="ml-1 text-green-600 hover:text-green-900 leading-none"
                aria-label="Close notification"
              >
                x
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-gray-600 text-sm font-medium">Total Jobs</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-gray-600 text-sm font-medium">Applied Jobs</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.applied}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-gray-600 text-sm font-medium">Not Applied</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.notApplied}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-gray-600 text-sm font-medium">Offers</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.offers}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-gray-600 text-sm font-medium">Rejected</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p>
          </div>
        </div>

        {showCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ApplicationsBarChart data={chartData} />
            <ApplicationsPieChart data={chartData} />
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Application</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Posted Date *</label>
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
                  Add Application
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & filter — drives the All Jobs list */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by company or title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Your Stage
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                {ALL_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleViewJobs}
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition"
              >
                View All Jobs
              </button>
            </div>
          </div>
        </div>

        {showPublicJobs && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-gray-900">All Jobs</h2>
              {(searchTerm || filterStatus !== "All") && (
                <span className="text-sm text-gray-500">
                  Showing {filteredPublicJobs.length} of {publicJobs.length} jobs
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {filterStatus !== "All"
                ? `Showing jobs where your current stage is "${filterStatus}"`
                : "Click Apply to submit your application."}
            </p>

            {publicError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {publicError}
              </div>
            )}

            {publicLoading ? (
              <div className="text-gray-500">Loading jobs...</div>
            ) : filteredPublicJobs.length === 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-900 text-sm">
                {publicJobs.length === 0
                  ? "No admin-posted jobs available right now."
                  : filterStatus !== "All"
                    ? `No jobs found where you're currently at the "${filterStatus}" stage.`
                    : "No jobs match your search. Try different keywords."}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPublicJobs.map((job) => {
                  // Find the user's own application for this specific job
                  const userApp = applications.find((app) => {
                    if (app.jobId && job.id) return app.jobId === job.id;
                    return (
                      (app.company ?? "").trim().toLowerCase() === (job.company ?? "").trim().toLowerCase() &&
                      (app.role ?? "").trim().toLowerCase() === (job.role ?? "").trim().toLowerCase() &&
                      (app.location ?? "").trim().toLowerCase() === (job.location ?? "").trim().toLowerCase()
                    );
                  });

                  const isApplied = !!userApp;
                  // This is the LIVE status admin has set for this user's application
                  const userCurrentStatus = userApp?.status ?? null;

                  const windowOpen = isApplyWindowOpen(job?.appliedDate);
                  const isBusy = applyingId === job.id;
                  const disableApply = isBusy || isApplied || !windowOpen;

                  return (
                    <div
                      key={job.id}
                      className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-1000">{job.company || "Company"}</h3>
                          <span className="text-sm font-medium text-gray-800">{job.role || "Role"}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            {job.location || "Location not specified"}
                          </span>
                        </div>
                        {isApplied && userCurrentStatus && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-medium">Your current stage:</span>
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[userCurrentStatus] ?? "bg-gray-100 text-gray-700"
                                }`}
                            >
                              {userCurrentStatus}
                            </span>
                          </div>
                        )}

                        {job.notes ? (
                          <p className="text-sm text-gray-600 mt-2">{job.notes}</p>
                        ) : null}
                      </div>

                      <button
                        onClick={() => handleApplyToPublicJob(job.id)}
                        disabled={disableApply}
                        className={
                          "px-4 py-2 rounded-lg disabled:opacity-60 whitespace-nowrap " +
                          (isApplied
                            ? "bg-green-600 text-white cursor-not-allowed"
                            : !windowOpen
                              ? "bg-slate-400 text-white cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700")
                        }
                      >
                        {isApplied ? "Applied" : !windowOpen ? "Inactive" : isBusy ? "Applying..." : "Apply"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <DashboardContent
      title="Job Application Tracker"
      subtitle="Track every application and stage"
      showCharts={true}
    />
  );
}

function App() {
  const { token, role } = useAuth();
  const isAdmin = role === "ADMIN";

  return (
    <Routes>
      <Route
        path="/"
        element={
          token ? (
            <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {isAdmin ? <Navigate to="/admin" replace /> : <Dashboard />}
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            {isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" replace />}
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to={token ? (isAdmin ? "/admin" : "/dashboard") : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;