import { useState } from "react";
import api from "../api/client";

export default function JobForm({ onCreated }) {
  const [form, setForm] = useState({
    company: "",
    role: "",
    status: "Applied",
    appliedDate: "",
    notes: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post("/api/applications", form);
    setForm({ company: "", role: "", status: "Applied", appliedDate: "", notes: "" });
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      <h3>Add Application</h3>
      <div style={styles.grid}>
        <input name="company" placeholder="Company" value={form.company} onChange={handleChange} style={styles.input} />
        <input name="role" placeholder="Role" value={form.role} onChange={handleChange} style={styles.input} />
        <select name="status" value={form.status} onChange={handleChange} style={styles.input}>
          <option>Applied</option>
          <option>Rejected</option>
          <option>Selected</option>
          <option>Interview</option>
        </select>
        <input name="appliedDate" type="date" value={form.appliedDate} onChange={handleChange} style={styles.input} />
      </div>
      <textarea name="notes" placeholder="Notes" value={form.notes} onChange={handleChange} style={styles.textarea} />
      <button type="submit" style={styles.button}>Save</button>
    </form>
  );
}

const styles = {
  card: { background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 8px 20px rgba(0,0,0,0.06)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 12 },
  input: { padding: 12, borderRadius: 8, border: "1px solid #ddd", width: "100%" },
  textarea: { width: "100%", minHeight: 90, padding: 12, borderRadius: 8, border: "1px solid #ddd" },
  button: { marginTop: 12, padding: "10px 16px", border: "none", background: "#1d4ed8", color: "#fff", borderRadius: 8 },
};