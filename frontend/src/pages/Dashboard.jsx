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
  const [jobs, setJobs] = useState([]);      // filtered jobs (for All view)
  const [allJobs, setAllJobs] = useState([]); // all user-applied jobs
  const [filters, setFilters] = useState({ status: "", company: "" });

  const [publicJobs, setPublicJobs] = useState([]);
  const [applyingId, setApplyingId] = useState(null);
  const [loadingPublicJobs, setLoadingPublicJobs] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [publicError, setPublicError] = useState("");

  const loadUserJobs = useCallback(async () => {
    try {
      // always fetch full applied list
      const res = await api.get("/api/applications");
      const all = Array.isArray(res.data) ? res.data : [];
      setAllJobs(all);

      // derive filtered list only for "all" display
      const filtered = all.filter((job) => {
        if (filters.status && normalize(job?.status) !== normalize(filters.status)) return false;
        if (filters.company) {
          const company = (job?.company ?? "").toString().toLowerCase();
          if (!company.includes(filters.company.toLowerCase())) return false;
        }
        return true;
      });

      setJobs(filtered);
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
    setLoadingPublicJobs(true);
    try {
      const res = await api.get("/api/applications/public-jobs");
      setPublicJobs(Array.isArray(res.data) ? res.data : []);
      setPublicError("");
    } catch (e) {
      setPublicError("Admin posted jobs could not be loaded right now.");
    } finally {
      setLoadingPublicJobs(false);
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

  const handleViewNewJobs = async () => {
    if (loadingPublicJobs) return;

    await loadPublicJobs();

    const section = document.getElementById("public-jobs-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleViewAppliedJobs = () => {
    setView("applied");

    // wait for state update, then jump to the applied list section
    requestAnimationFrame(() => {
      const section = document.getElementById("jobs-list-section");
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
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

  const totalJobs = publicJobs.length;
  const offers = stats.offers ?? stats.hrInterview ?? stageStats.hrInterview ?? 0;
  const rejected = stats.rejected ?? 0;

  const [view, setView] = useState("all");

  const normalize = (value) => (value ?? "").toString().trim().toLowerCase();

  const jobKey = (job) =>
    [normalize(job?.company), normalize(job?.role), normalize(job?.location)].join("|");

  // If a job has no valid date, treat it as eligible for Not Applied immediately.
  const isNotAppliedWindowOver = (dateValue) => {
    if (!dateValue) return true;

    const parsed = new Date(dateValue + "T00:00:00");
    if (Number.isNaN(parsed.getTime())) return true;

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    return Date.now() - parsed.getTime() >= ONE_DAY_MS;
  };

  // IMPORTANT: Applied should come from full list, not filtered jobs
  const appliedJobs = useMemo(() => allJobs, [allJobs]);

  const notAppliedJobs = useMemo(() => {
    const appliedSet = new Set(appliedJobs.map(jobKey));
    return publicJobs.filter(
      (job) => !appliedSet.has(jobKey(job)) && isNotAppliedWindowOver(job?.appliedDate)
    );
  }, [appliedJobs, publicJobs]);

  const offerJobs = useMemo(
    () =>
      allJobs.filter((job) => {
        const status = normalize(job?.status);
        return status === "offer" || status === "hr interview";
      }),
    [allJobs]
  );

  const rejectedJobs = useMemo(
    () => allJobs.filter((job) => normalize(job?.status) === "rejected"),
    [allJobs]
  );

  const applyCurrentFilters = useCallback(
    (list) =>
      list.filter((job) => {
        if (filters.status && normalize(job?.status) !== normalize(filters.status)) return false;
        if (filters.company) {
          const company = (job?.company ?? "").toString().toLowerCase();
          if (!company.includes(filters.company.toLowerCase())) return false;
        }
        return true;
      }),
    [filters]
  );

  const visibleJobs = useMemo(() => {
    if (view === "applied") return applyCurrentFilters(appliedJobs);
    if (view === "notApplied") return notAppliedJobs;
    if (view === "offers") return applyCurrentFilters(offerJobs);
    if (view === "rejected") return applyCurrentFilters(rejectedJobs);
    return jobs; // already filtered
  }, [view, jobs, appliedJobs, notAppliedJobs, offerJobs, rejectedJobs, applyCurrentFilters]);

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
          <StatCard
            title="Total Jobs"
            value={totalJobs}
            active={view === "all"}
            onClick={() => setView("all")}
          />
          <StatCard
            title="Applied Jobs"
            value={appliedJobs.length}
            active={view === "applied"}
            onClick={handleViewAppliedJobs}
          />
          <StatCard
            title="Not Applied"
            value={notAppliedJobs.length}
            active={view === "notApplied"}
            onClick={() => setView("notApplied")}
          />
          <StatCard
            title="Offers"
            value={offerJobs.length}
            active={view === "offers"}
            onClick={() => setView("offers")}
          />
          <StatCard
            title="Rejected"
            value={rejectedJobs.length}
            active={view === "rejected"}
            onClick={() => setView("rejected")}
          />
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

        {/* <section className="db-section">
          <h2>Your Applications</h2>
          <JobList jobs={jobs} refresh={loadData} />
        </section> */}

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
              {publicJobs.map((job) => {
                const alreadyApplied = appliedJobs.some((a) => jobKey(a) === jobKey(job));
                const windowOver = isNotAppliedWindowOver(job?.appliedDate);
                const cannotApply = applyingId === job.id || alreadyApplied || windowOver;

                return (
                  <article key={job.id} className="db-public-card">
                    <h3>{job.company || "Company"}</h3>
                    <p>{job.role || "Role"}</p>
                    <p>
                      Stage:{" "}
                      <strong style={{ color: CHART_COLORS[job.status] || "#334155" }}>
                        {job.status || "Online Test"}
                      </strong>
                    </p>

                    <p>
                      Posted: <strong>{job.appliedDate || "-"}</strong>
                    </p>
                    <p>
                      Window:{" "}
                      <strong style={{ color: windowOver ? "#b45309" : "#166534" }}>
                        {windowOver ? "Expired (Not Applied)" : "Open (1 day)"}
                      </strong>
                    </p>

                    {job.notes ? <p className="db-public-notes">{job.notes}</p> : null}

                    <button
                      className="db-apply-btn"
                      onClick={() => handleApply(job.id)}
                      disabled={cannotApply}
                    >
                      {alreadyApplied
                        ? "Applied"
                        : windowOver
                        ? "Expired"
                        : applyingId === job.id
                        ? "Applying..."
                        : "Apply"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="db-section">
          <h2>
            {view === "all"
              ? "All Jobs"
              : view === "applied"
              ? "Applied Jobs"
              : view === "notApplied"
              ? "Not Applied Jobs"
              : view === "offers"
              ? "Offers"
              : "Rejected Jobs"}
          </h2>
          <JobList jobs={visibleJobs} refresh={loadData} />
        </section>

        <section className="db-section">
          <div className="db-panel-head">
            <div>
              <h2>View All Jobs</h2>
              <p>These are the jobs posted by admin. Apply directly from here.</p>
            </div>

            <button
              type="button"
              className="db-apply-btn"
              onClick={handleViewNewJobs}
              disabled={loadingPublicJobs}
            >
              {loadingPublicJobs ? "Refreshing..." : "Refresh"}
            </button>
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

                  <p>
                    Posted: <strong>{job.appliedDate || "-"}</strong>
                  </p>
                  <p>
                    Window:{" "}
                    <strong style={{ color: windowOver ? "#b45309" : "#166534" }}>
                      {windowOver ? "Expired (Not Applied)" : "Open (1 day)"}
                    </strong>
                  </p>

                  {job.notes ? <p className="db-public-notes">{job.notes}</p> : null}

                  <button
                    className="db-apply-btn"
                    onClick={() => handleApply(job.id)}
                    disabled={cannotApply}
                  >
                    {alreadyApplied
                      ? "Applied"
                      : windowOver
                      ? "Expired"
                      : applyingId === job.id
                      ? "Applying..."
                      : "Apply"}
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

function StatCard({ title, value, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={"db-stat" + (active ? " db-stat-active" : "")}
    >
      <p>{title}</p>
      <h3>{value}</h3>
    </button>
  );
}