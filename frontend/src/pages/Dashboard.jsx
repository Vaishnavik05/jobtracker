import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import JobList from "../components/JobList";
import "./Dashboard.css";

export default function Dashboard() {
  const { logout } = useAuth();

  const [stats, setStats] = useState({});
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [filters, setFilters] = useState({ status: "", company: "" });

  const [publicJobs, setPublicJobs] = useState([]);
  const [loadingPublicJobs, setLoadingPublicJobs] = useState(true);
  const [applyingId, setApplyingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [view, setView] = useState("all");

  const normalize = (v) => (v ?? "").toLowerCase().trim();

  const loadUserJobs = async () => {
    try {
      const res = await api.get("/api/applications");
      const all = Array.isArray(res.data) ? res.data : [];
      setAllJobs(all);
      setJobs(all);
    } catch {
      setError("Failed to load jobs");
    }
  };

  const loadPublicJobs = async () => {
    setLoadingPublicJobs(true);
    try {
      const res = await api.get("/api/applications/public-jobs");
      setPublicJobs(res.data || []);
    } catch {
      setError("Failed to load public jobs");
    } finally {
      setLoadingPublicJobs(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get("/api/applications/stats");
      setStats(res.data || {});
    } catch {}
  };

  const loadData = async () => {
    await Promise.all([loadUserJobs(), loadPublicJobs(), loadStats()]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApply = async (jobId) => {
    setApplyingId(jobId);
    try {
      await api.post("/api/applications/apply/" + jobId);
      setSuccess("Applied successfully");
      loadData();
    } catch {
      setError("Apply failed");
    } finally {
      setApplyingId(null);
    }
  };

  const jobKey = (job) =>
    `${normalize(job.company)}|${normalize(job.role)}`;

  const appliedJobs = useMemo(() => allJobs, [allJobs]);

  const notAppliedJobs = useMemo(() => {
    const appliedSet = new Set(appliedJobs.map(jobKey));
    return publicJobs.filter((j) => !appliedSet.has(jobKey(j)));
  }, [publicJobs, appliedJobs]);

  const offerJobs = useMemo(
    () => allJobs.filter((j) => normalize(j.status) === "offer"),
    [allJobs]
  );

  const rejectedJobs = useMemo(
    () => allJobs.filter((j) => normalize(j.status) === "rejected"),
    [allJobs]
  );

  const visibleJobs = useMemo(() => {
    switch (view) {
      case "applied":
        return appliedJobs;
      case "notApplied":
        return notAppliedJobs;
      case "offers":
        return offerJobs;
      case "rejected":
        return rejectedJobs;
      case "all":
      default:
        return publicJobs;
    }
  }, [view, publicJobs, appliedJobs, notAppliedJobs, offerJobs, rejectedJobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesCompany = filters.company
        ? job.company.toLowerCase().includes(filters.company.toLowerCase())
        : true;
      const matchesStatus = filters.status
        ? job.status === filters.status
        : true;
      return matchesCompany && matchesStatus;
    });
  }, [jobs, filters]);

  // ================= UI =================
  return (
    <div className="db-page">
      <div className="db-shell">

        <div className="db-top">
          <h1>User Dashboard</h1>
          <button onClick={logout}>Logout</button>
        </div>

        {/* ================= STAT CARDS ================= */}
        <div className="db-stats">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard
              title="Total Jobs"
              value={stats.total}
              active={view === "all"}
              onClick={() => setView("all")}
            />
            <StatCard
              title="Applied Jobs"
              value={stats.applied}
              active={view === "applied"}
              onClick={() => setView("applied")}
            />
            <StatCard
              title="Not Applied"
              value={stats.notApplied}
              active={view === "notApplied"}
              onClick={() => setView("notApplied")}
            />
            <StatCard
              title="Offers"
              value={stats.offers}
              active={view === "offers"}
              onClick={() => setView("offers")}
            />
            <StatCard
              title="Rejected"
              value={stats.rejected}
              active={view === "rejected"}
              onClick={() => setView("rejected")}
            />
          </div>
        </div>

        {/* ================= JOB LIST ================= */}
        <section>
          <h2 className="text-xl font-bold text-gray-900">
            {view === "all" && "All Applications"}
            {view === "applied" && "Applied Jobs"}
            {view === "notApplied" && "Not Applied Jobs"}
            {view === "offers" && "Offers"}
            {view === "rejected" && "Rejected Jobs"}
          </h2>
          {view === "all" && loadingPublicJobs ? (
            <div>Loading jobs...</div>
          ) : view === "all" && visibleJobs.length === 0 ? (
            <div>No jobs available</div>
          ) : (
            <JobList jobs={filteredJobs} />
          )}
        </section>

        {/* ================= PUBLIC JOBS ================= */}
        <section>
          <div className="flex items-center justify-between">
            <h2>All Available Jobs</h2>
            <button className="btn" onClick={loadPublicJobs}>
              Refresh Jobs
            </button>
          </div>
          {loadingPublicJobs ? (
            <div>Loading jobs...</div>
          ) : publicJobs.length === 0 ? (
            <div>No jobs available</div>
          ) : (
            publicJobs.map((job) => {
              const alreadyApplied = appliedJobs.some(
                (j) => jobKey(j) === jobKey(job)
              );
              return (
                <div key={job.id} className="job-card">
                  <h3>{job.company}</h3>
                  <p>{job.role}</p>
                  <button
                    disabled={alreadyApplied || applyingId === job.id}
                    onClick={() => handleApply(job.id)}
                  >
                    {alreadyApplied
                      ? "Applied"
                      : applyingId === job.id
                      ? "Applying..."
                      : "Apply"}
                  </button>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

// ================= STAT CARD =================
function StatCard({ title, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-white p-6 rounded-lg border shadow-sm text-left transition 
        ${active ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:shadow-md"}`}
    >
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </button>
  );
}