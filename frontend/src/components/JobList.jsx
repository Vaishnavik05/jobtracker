import api from "../api/client";

export default function JobList({ jobs, refresh }) {
  const handleDelete = async (id) => {
    await api.delete(`/api/applications/${id}`);
    refresh?.();
  };

  return (
    <div style={styles.wrap}>
      {jobs.map((job) => (
        <div key={job.id} style={styles.card}>
          <div>
            <h3>{job.company}</h3>
            <p><b>Role:</b> {job.role}</p>
            <p><b>Status:</b> {job.status}</p>
            <p><b>Date:</b> {job.appliedDate}</p>
            <p><b>Notes:</b> {job.notes}</p>
          </div>
          <button onClick={() => handleDelete(job.id)} style={styles.delete}>Delete</button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  wrap: { display: "grid", gap: 12, marginTop: 20 },
  card: { background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 8px 20px rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  delete: { padding: "8px 12px", border: "none", background: "crimson", color: "#fff", borderRadius: 8 },
};