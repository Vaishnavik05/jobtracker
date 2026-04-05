import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./AdminDashboard.css";

const EMPTY_FORM = {
  company: "",
  role: "",
  status: "Online Test",
  appliedDate: "",
  location: "",
  notes: "",
};

const STATUS_OPTIONS = [
  "Online Test",
  "Group Discussion",
  "Technical Interview",
  "HR Interview",
  "Offer",
  "Rejected",
];

const NOTE_PREVIEW_LIMIT = 140;

const getStatusClass = (status) => {
  const value = (status || "").trim().toLowerCase();

  if (value === "online test") return "status-online-test";
  if (value === "group discussion") return "status-group-discussion";
  if (value === "technical interview") return "status-technical-interview";
  if (value === "hr interview") return "status-hr-interview";
  if (value === "offer") return "status-offer";
  if (value === "rejected") return "status-rejected";

  return "status-default";
};

export default function AdminDashboard() {
  const { logout, role } = useAuth();

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    usersApplied: 0,
    totalCompanies: 0,
    usersWithOffers: 0,
    byStatus: {},
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedNotes, setExpandedNotes] = useState({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [appsRes, statsRes] = await Promise.all([
        api.get("/api/admin/applications"),
        api.get("/api/admin/applications/stats"),
      ]);

      const allRows = Array.isArray(appsRes.data) ? appsRes.data : [];
      setRows(allRows.filter((r) => (r.username || "").trim() !== ""));

      const s = statsRes.data || {};
      setStats({
        totalJobs: Number(s.totalJobs || 0),
        usersApplied: Number(s.usersApplied || 0),
        totalCompanies: Number(s.totalCompanies || 0),
        usersWithOffers: Number(s.usersWithOffers || 0),
        byStatus: s.byStatus || {},
      });
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load admin dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "ADMIN") {
      load();
    }
  }, [role]);

  useEffect(() => {
    if (!success) return;
    const id = setTimeout(() => setSuccess(""), 2200);
    return () => clearTimeout(id);
  }, [success]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const bag = [r.username, r.company, r.role, r.status, r.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return bag.includes(q);
    });
  }, [rows, query]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const onEdit = (row) => {
    setEditingId(row.id);
    setForm({
      company: row.company || "",
      role: row.role || "",
      status: row.status || "Online Test",
      appliedDate: row.appliedDate || "",
      location: row.location || "",
      notes: row.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.company.trim()) {
      setError("Company is required.");
      return;
    }
    if (!form.role.trim()) {
      setError("Role is required.");
      return;
    }

    const payload = {
      company: (form.company || "").trim(),
      role: (form.role || "").trim(),
      appliedDate: form.appliedDate ? form.appliedDate : null,
      location: (form.location || "").trim(),
      notes: (form.notes || "").trim(),
      ...(editingId ? { status: (form.status || "").trim() } : {}),
    };

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/admin/applications/${editingId}`, payload);
        setSuccess("Application updated.");
      } else {
        await api.post("/api/admin/applications", payload);
        setSuccess("Application created.");
      }

      resetForm();
      await load();
    } catch (e) {
      const data = e?.response?.data;
      const message =
        (typeof data === "string" && data) ||
        data?.message ||
        data?.error ||
        "Unable to save application.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    setError("");
    setSuccess("");
    try {
      await api.delete(`/api/admin/applications/${id}`);
      setSuccess("Application deleted.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Delete failed.");
    }
  };

  const toggleNote = (id) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const cardData = [
    {
      label: "Total Jobs",
      value: stats.totalJobs,
      tone: "tone-total",
      caption: "All tracked applications",
    },
    {
      label: "No. of Users Applied",
      value: stats.usersApplied,
      tone: "tone-users",
      caption: "Distinct users with applications",
    },
    {
      label: "No. of Companies",
      value: stats.totalCompanies,
      tone: "tone-companies",
      caption: "Distinct companies targeted",
    },
    {
      label: "No. of Offers",
      value: stats.usersWithOffers,
      tone: "tone-offers",
      caption: "Users reached offer stage",
    },
  ];

  if (role !== "ADMIN") {
    return (
      <main className="ad-wrap">
        <section className="ad-shell ad-unauthorized">
          <h1>Access denied</h1>
          <p>This page is for admin only.</p>
          <button className="ad-btn ad-btn-danger" onClick={logout}>
            Logout
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="ad-wrap">
      <section className="ad-shell">
        <header className="ad-topbar">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage all applications and track platform progress</p>
          </div>
          <button className="ad-btn ad-btn-danger" onClick={logout}>
            Logout
          </button>
        </header>

        {error ? <div className="ad-alert ad-alert-error">{error}</div> : null}
        {success ? <div className="ad-alert ad-alert-success">{success}</div> : null}

        <section className="ad-stats-grid">
          {cardData.map((card) => (
            <article key={card.label} className={`ad-stat-card ${card.tone}`}>
              <p className="ad-stat-label">{card.label}</p>
              <h2 className="ad-stat-value">{card.value || 0}</h2>
              <p className="ad-stat-caption">{card.caption}</p>
            </article>
          ))}
        </section>

        {/* <section className="ad-status-strip">
          {Object.entries(stats.byStatus || {}).length === 0 ? (
            <div className="ad-status-pill">No status data yet</div>
          ) : (
            Object.entries(stats.byStatus).map(([k, v]) => (
              <div key={k} className="ad-status-pill">
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))
          )}
        </section> */}

        <section className="ad-panel">
          <div className="ad-panel-head">
            <h3>{editingId ? "Edit Application" : "Add Job Posting"}</h3>
            {editingId ? (
              <button className="ad-btn ad-btn-muted" onClick={resetForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>

          <form className="ad-form" onSubmit={onSubmit}>
            <label>
              Company
              <input
                name="company"
                value={form.company}
                onChange={onChange}
                placeholder="company name"
                required
              />
            </label>
            <label>
              Role
              <input
                name="role"
                value={form.role}
                onChange={onChange}
                placeholder="job title"
                required
              />
            </label>

            {editingId ? (
              <label>
                Status
                <select name="status" value={form.status} onChange={onChange} required>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label>
              Applied Date
              <input
                name="appliedDate"
                type="date"
                value={form.appliedDate}
                onChange={onChange}
              />
            </label>

            <label>
              Location
              <input
                name="location"
                value={form.location}
                onChange={onChange}
                placeholder="e.g. Chennai / Remote / Hybrid"
              />
            </label>

            <label className="ad-col-span-2">
              Notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                placeholder="Add interview details, links, comments..."
                rows={3}
              />
            </label>

            <div className="ad-form-actions ad-col-span-2">
              <button className="ad-btn ad-btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Application" : "Create Application"}
              </button>
            </div>
          </form>
        </section>

        <section className="ad-panel">
          <div className="ad-panel-head">
            <h3>Users Job Applications</h3>
            <input
              className="ad-search"
              placeholder="Search applications by user, company, role, status..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Applied Date</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="ad-empty">
                      Loading...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="ad-empty">
                      No applications found
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.username || "-"}</td>
                      <td>{r.company || "-"}</td>
                      <td>{r.role || "-"}</td>
                      <td>
                        <span className={`ad-status-chip ${getStatusClass(r.status)}`}>
                          {r.status || "-"}
                        </span>
                      </td>
                      <td>{r.appliedDate || "-"}</td>
                      <td className="ad-notes">
                        {(() => {
                          const rawNote = (r.notes || "").trim();
                          if (!rawNote) return <span>-</span>;

                          const isExpanded = !!expandedNotes[r.id];
                          const shouldToggle = rawNote.length > 90;

                          return (
                            <div className="ad-notes-wrap">
                              <p className={`ad-notes-text ${!isExpanded && shouldToggle ? "clamp-2" : ""}`}>
                                {rawNote}
                              </p>
                              {shouldToggle ? (
                                <button
                                  type="button"
                                  className="ad-notes-toggle"
                                  onClick={() => toggleNote(r.id)}
                                  aria-expanded={isExpanded}
                                >
                                  {isExpanded ? "Read less" : "Read more"}
                                </button>
                              ) : null}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <div className="ad-actions">
                          <button className="ad-btn ad-btn-muted" onClick={() => onEdit(r)} type="button">
                            Edit
                          </button>
                          <button
                            className="ad-btn ad-btn-danger"
                            onClick={() => onDelete(r.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}