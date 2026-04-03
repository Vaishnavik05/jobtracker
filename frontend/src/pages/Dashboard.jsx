import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import JobForm from "../components/JobForm";
import JobList from "../components/JobList";

export default function Dashboard() {
  const { logout } = useAuth();
  const [stats, setStats] = useState({});
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({ status: "", company: "" });

  const loadData = async () => {
    const statsRes = await api.get("/api/applications/stats");
    setStats(statsRes.data);

    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.company) params.company = filters.company;

    const jobsRes = await api.get("/api/applications", { params });
    setJobs(jobsRes.data);
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleCreated = () => {
    loadData();
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h2>Job Tracker Dashboard</h2>
        <button onClick={logout} style={styles.logout}>Logout</button>
      </div>

      <div style={styles.statsGrid}>
        <StatCard title="Total" value={stats.total || 0} />
        <StatCard title="Applied" value={stats.applied || 0} />
        <StatCard title="Rejected" value={stats.rejected || 0} />
        <StatCard title="Selected" value={stats.selected || 0} />
      </div>

      <JobForm onCreated={handleCreated} />

      <div style={styles.filters}>
        <input
          placeholder="Filter by status"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={styles.input}
        />
        <input
          placeholder="Filter by company"
          value={filters.company}
          onChange={(e) => setFilters({ ...filters, company: e.target.value })}
          style={styles.input}
        />
      </div>

      <JobList jobs={jobs} refresh={loadData} />
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div style={styles.card}>
      <h4>{title}</h4>
      <h2>{value}</h2>
    </div>
  );
}

const styles = {
  page: { padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: "Arial, sans-serif" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  logout: { padding: "10px 16px", border: "none", background: "crimson", color: "#fff", borderRadius: 8 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, margin: "24px 0" },
  card: { background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 8px 20px rgba(0,0,0,0.06)" },
  filters: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "20px 0" },
  input: { padding: 12, borderRadius: 8, border: "1px solid #ddd" },
};