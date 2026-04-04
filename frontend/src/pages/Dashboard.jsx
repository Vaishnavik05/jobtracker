import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import JobList from "../components/JobList";
import "./Dashboard.css";

const CHART_COLORS = {
  "Online Test": "#3b82f6",
  "Group Discussion": "#8b5cf6",
  "Technical Interview": "#f59e0b",
  "HR Interview": "#10b981",
};

export default function Dashboard() {
  const { logout } = useAuth();

  const [stats, setStats] = useState({});
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({ status: "", company: "" });

  const [publicJobs, setPublicJobs] = useState([]);
  const [applyingId, setApplyingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [publicError, setPublicError] = useState("");

  const loadUserJobs = useCallback(async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.company) params.company = filters.company;

      const res = await api.get("/api/applications", { params });
      setJobs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError("Unable to load your applications.");
    }
  }, [filters]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("/api/applications/stats");
      setStats(res.data || {});
    } catch (e) {
      setError("Some dashboard stats could not be loaded.");
    }
  }, []);

  const loadPublicJobs = useCallback(async () => {
    try {
      const res = await api.get("/api/applications/public-jobs");
      setPublicJobs(Array.isArray(res.data) ? res.data : []);
      setPublicError("");
    } catch (e) {
      setPublicError("Admin posted jobs could not be loaded right now.");
    }
  }, []);

  const loadData = useCallback(async () => {
    setError("");
    await Promise.allSettled([loadStats(), loadUserJobs(), loadPublicJobs()]);
  }, [loadStats, loadUserJobs, loadPublicJobs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreated = () => {
    setSuccess("Application saved.");
    loadData();
  };

  const handleApply = async (jobId) => {
    setApplyingId(jobId);
    setError("");
    setSuccess("");

    try {
      await api.post("/api/applications/apply/" + jobId);
      setSuccess("Applied successfully.");
      await Promise.allSettled([loadUserJobs(), loadPublicJobs(), loadStats()]);
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        "Unable to apply for this job.";
      setError(msg);
    } finally {
      setApplyingId(null);
    }
  };

  const handleViewNewJobs = () => {
    const section = document.getElementById("public-jobs-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const stageStats = useMemo(() => {
    return jobs.reduce(
      (acc, job) => {
        const s = (job.status || "").trim();
        if (s === "Online Test") acc.onlineTest += 1;
        if (s === "Group Discussion") acc.groupDiscussion += 1;
        if (s === "Technical Interview") acc.technicalInterview += 1;
        if (s === "HR Interview") acc.hrInterview += 1;
        return acc;
      },
      { onlineTest: 0, groupDiscussion: 0, technicalInterview: 0, hrInterview: 0 }
    );
  }, [jobs]);

  const totalJobs = stats.totalJobs ?? stats.total ?? jobs.length ?? 0;
  const offers = stats.offers ?? stats.hrInterview ?? stageStats.hrInterview ?? 0;
  const rejected = stats.rejected ?? 0;

  return (
    <div className="db-page">
      <div className="db-shell">
        <div className="db-top">
          <div>
            <h1>User Dashboard</h1>
            <p>Track your applications and apply to admin-posted jobs.</p>
          </div>
          <button className="db-logout" onClick={logout}>Logout</button>
        </div>

        <div className="db-stats">
          <StatCard title="Total Jobs" value={totalJobs} />
          <StatCard title="Offers / HR Stage" value={offers} />
          <StatCard title="Rejected" value={rejected} />
          <StatCard title="Public Openings" value={publicJobs.length} />
        </div>

        {error ? (
          <div className="db-notice db-notice-error">{error}</div>
        ) : null}
        {success ? (
          <div className="db-notice db-notice-success">{success}</div>
        ) : null}

        <section className="db-filter-card">
          <h2>Filter Applications</h2>
          <div className="db-filters">
            <div className="db-field">
              <label>Status</label>
              <select
                className="db-control"
                value={filters.status}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, status: e.target.value }))
                }
              >
                <option value="">All</option>
                <option value="Online Test">Online Test</option>
                <option value="Group Discussion">Group Discussion</option>
                <option value="Technical Interview">Technical Interview</option>
                <option value="HR Interview">HR Interview</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="db-field">
              <label>Company</label>
              <input
                className="db-control"
                value={filters.company}
                placeholder="Filter by company"
                onChange={(e) =>
                  setFilters((p) => ({ ...p, company: e.target.value }))
                }
              />
            </div>
          </div>
        </section>

        <section className="db-section">
          <h2>Your Applications</h2>
          <JobList jobs={jobs} refresh={loadData} />
        </section>

        <section className="db-section" id="public-jobs-section">
          <h2>Admin Posted Jobs You Can Apply To</h2>
          <p>This is the user-side place to apply for companies posted by admin.</p>

          {publicError ? (
            <div className="db-notice db-notice-error">{publicError}</div>
          ) : null}

          {publicJobs.length === 0 ? (
            <div className="db-empty">No public jobs available right now.</div>
          ) : (
            <div className="db-public-grid">
              {publicJobs.map((job) => (
                <article key={job.id} className="db-public-card">
                  <h3>{job.company || "Company"}</h3>
                  <p>{job.role || "Role"}</p>
                  <p>
                    Stage:{" "}
                    <strong style={{ color: CHART_COLORS[job.status] || "#334155" }}>
                      {job.status || "Online Test"}
                    </strong>
                  </p>
                  {job.notes ? <p className="db-public-notes">{job.notes}</p> : null}

                  <button
                    className="db-apply-btn"
                    onClick={() => handleApply(job.id)}
                    disabled={applyingId === job.id}
                  >
                    {applyingId === job.id ? "Applying..." : "Apply"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="db-section">
          <div className="db-panel-head">
            <div>
              <h2>View New Jobs</h2>
              <p>These are the jobs posted by admin. Apply directly from here.</p>
            </div>
          </div>

          {publicError ? (
            <div className="db-notice db-notice-error">{publicError}</div>
          ) : null}

          {publicJobs.length === 0 ? (
            <div className="db-empty">No new jobs available right now.</div>
          ) : (
            <div className="db-public-grid">
              {publicJobs.map((job) => (
                <article key={job.id} className="db-public-card">
                  <h3>{job.company || "Company"}</h3>
                  <p>{job.role || "Role"}</p>
                  <p>
                    Stage:{" "}
                    <strong style={{ color: CHART_COLORS[job.status] || "#334155" }}>
                      {job.status || "Online Test"}
                    </strong>
                  </p>
                  {job.notes ? <p className="db-public-notes">{job.notes}</p> : null}

                  <button
                    className="db-apply-btn"
                    onClick={() => handleApply(job.id)}
                    disabled={applyingId === job.id}
                  >
                    {applyingId === job.id ? "Applying..." : "Apply"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="db-stat">
      <p>{title}</p>
      <h3>{value}</h3>
    </div>
  );
}