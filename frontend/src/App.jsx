import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { useAuth } from "./context/AuthContext";
import "./App.css";
import AdminDashboard from "./pages/AdminDashboard";

const STATUS_OPTIONS = [
  "Online Test",
  "Group Discussion",
  "Technical Interview",
  "HR Interview",
];

const STATUS_BADGE_COLORS = {
  "Online Test": "bg-blue-100 text-blue-800",
  "Group Discussion": "bg-purple-100 text-purple-800",
  "Technical Interview": "bg-amber-100 text-amber-800",
  "HR Interview": "bg-emerald-100 text-emerald-800",
};

const STATUS_CHART_COLORS = {
  "Online Test": "#3b82f6",
  "Group Discussion": "#8b5cf6",
  "Technical Interview": "#f59e0b",
  "HR Interview": "#10b981",
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
    if (!token) {
      setApplications([]);
      return;
    }
    void loadApplications();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadPublicJobs();
  }, [token]);

  const stats = useMemo(() => {
    // Total jobs should be all admin-posted jobs visible to user
    const total = publicJobs.length;

    // Applied jobs = jobs user already applied
    const applied = applications.length;

    // Not applied = remaining public jobs
    const notApplied = Math.max(total - applied, 0);

    const offers = applications.filter((application) => application.status === "HR Interview").length;
    const rejected = applications.filter((application) => application.status === "Rejected").length;

    return { total, applied, notApplied, offers, rejected };
  }, [applications, publicJobs]);

  const chartData = useMemo(() => {
    const counts = STATUS_OPTIONS.reduce((accumulator, status) => {
      accumulator[status] = 0;
      return accumulator;
    }, {});
    for (const application of applications) {
      if (Object.prototype.hasOwnProperty.call(counts, application.status)) {
        counts[application.status] += 1;
      }
    }
    return STATUS_OPTIONS.map((status) => ({
      label: status,
      value: counts[status],
      color: STATUS_CHART_COLORS[status],
    }));
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return applications.filter((application) => {
      const company = String(application.company || "").toLowerCase();
      const role = String(application.role || "").toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        company.includes(normalizedSearch) ||
        role.includes(normalizedSearch);

      const matchesStatus = filterStatus === "All" || application.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, filterStatus]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      setSuccess("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [success]);

  const handleChange = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
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
      await request("", {
        method: "POST",
        body: JSON.stringify(payload),
      });
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

    // open only during first 24 hours from admin posted date
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
            <button onClick={() => setError("")} className="text-red-600 hover:text-red-900">
              x
            </button>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">All Jobs</h2>
            <p className="text-sm text-gray-600 mb-4">Click Apply to submit your application.</p>

            {publicError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {publicError}
              </div>
            )}

            {publicLoading ? (
              <div className="text-gray-500">Loading jobs...</div>
            ) : publicJobs.length === 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-900 text-sm">
                No admin-posted jobs available right now.
              </div>
            ) : (
              <div className="space-y-3">
                {publicJobs.map((job) => {
                  const jobCompany = (job?.company ?? "").trim().toLowerCase();
                  const jobRole = (job?.role ?? "").trim().toLowerCase();
                  const jobLocation = (job?.location ?? "").trim().toLowerCase();

                  const isApplied = applications.some((app) => {
                    const appCompany = (app?.company ?? "").trim().toLowerCase();
                    const appRole = (app?.role ?? "").trim().toLowerCase();
                    const appLocation = (app?.location ?? "").trim().toLowerCase();

                    return (
                      appCompany === jobCompany &&
                      appRole === jobRole &&
                      appLocation === jobLocation
                    );
                  });

                  const windowOpen = isApplyWindowOpen(job?.appliedDate);
                  const isBusy = applyingId === job.id;
                  const disableApply = isBusy || isApplied || !windowOpen;

                  return (
                    <div
                      key={job.id}
                      className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{job.company || "Company"}</h3>
                          <span className="text-sm font-medium text-gray-700">{job.role || "Role"}</span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                            {job.status || "Online Test"}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            {job.location || "Location not specified"}
                          </span>
                        </div>

                        {job.notes ? <p className="text-sm text-gray-600 mt-2">{job.notes}</p> : null}

                        {/* <p
                          className={
                            "text-sm font-semibold mt-2 inline-flex items-center rounded-full px-2.5 py-1 " +
                            (isApplied
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700")
                          }
                        >
                          {isApplied ? "Applied" : "Not Applied"}
                        </p> */}
                      </div>

                      <button
                        onClick={() => handleApplyToPublicJob(job.id)}
                        disabled={disableApply}
                        className={
                          "px-4 py-2 rounded-lg disabled:opacity-60 " +
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

        {/* <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Applications ({filteredApplications.length})</h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-blue-900">
                No applications found. {searchTerm && "Try adjusting your search."}
              </p>
            </div>
          ) : (
            filteredApplications.map((application) => (
              <div
                key={application.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{application.company}</h3>
                    <p className="text-gray-600 font-medium">{application.role}</p>
                  </div>
                  <span
                    className={
                      "px-3 py-1 rounded-full text-sm font-semibold " +
                      (STATUS_BADGE_COLORS[application.status] || "bg-gray-100 text-gray-700")
                    }
                  >
                    {application.status}
                  </span>
                </div>

                <div className="flex gap-6 text-sm text-gray-600">
                  <span>{formatDate(application.appliedDate)}</span>
                  {application.notes && (
                    <span className="max-w-md">
                      {application.notes.length > 50 ? application.notes.slice(0, 50) + "..." : application.notes}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div> */}
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