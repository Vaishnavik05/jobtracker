import { useState } from "react";
import api from "../api/client";

const initialForm = {
  company: "",
  role: "",
  status: "Online Test",
  appliedDate: "",
  notes: "",
};

const STATUS_OPTIONS = [
  <option>Online Test</option>,
  <option>Group Discussion</option>,
  <option>Technical Interview</option>,
  <option>HR Interview</option>,
];

export default function JobForm({ onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.company.trim()) nextErrors.company = "Company is required.";
    if (!form.role.trim()) nextErrors.role = "Role is required.";
    if (!form.status.trim()) nextErrors.status = "Status is required.";
    if (!form.appliedDate) {
      nextErrors.appliedDate = "Applied date is required.";
    } else if (Number.isNaN(new Date(form.appliedDate).getTime())) {
      nextErrors.appliedDate = "Applied date is invalid.";
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      setIsSaving(true);
      await api.post("/api/applications", form);
      setForm(initialForm);
      setErrors({});
      onCreated?.();
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        form: error?.response?.data?.message || "Failed to create job. Please try again.",
      }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="jf-card">
      <div className="jf-head">
        <h2>Create Job</h2>
        <p>Add the company, role, stage, and useful details like the job description.</p>
      </div>

      {errors.form ? <div className="jf-alert">{errors.form}</div> : null}

      <form onSubmit={handleSubmit} className="jf-form">
        <div className="jf-grid">
          <div>
            <label htmlFor="company">Company *</label>
            <input
              id="company"
              name="company"
              placeholder="e.g. Oracle"
              value={form.company}
              onChange={handleChange}
              className={errors.company ? "has-error" : ""}
            />
            {errors.company ? <p className="jf-error">{errors.company}</p> : null}
          </div>

          <div>
            <label htmlFor="role">Role *</label>
            <input
              id="role"
              name="role"
              placeholder="e.g. Java Developer"
              value={form.role}
              onChange={handleChange}
              className={errors.role ? "has-error" : ""}
            />
            {errors.role ? <p className="jf-error">{errors.role}</p> : null}
          </div>

          <div>
            <label htmlFor="status">Status *</label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
              className={errors.status ? "has-error" : ""}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            {errors.status ? <p className="jf-error">{errors.status}</p> : null}
          </div>

          <div>
            <label htmlFor="appliedDate">Applied Date *</label>
            <input
              id="appliedDate"
              name="appliedDate"
              type="date"
              value={form.appliedDate}
              onChange={handleChange}
              className={errors.appliedDate ? "has-error" : ""}
            />
            {errors.appliedDate ? <p className="jf-error">{errors.appliedDate}</p> : null}
          </div>
        </div>

        <div className="jf-field-full">
          <label htmlFor="notes">Notes / Company Details</label>
          <textarea
            id="notes"
            name="notes"
            placeholder="Paste job description, company notes, referral info, required skills, interview details, etc."
            value={form.notes}
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="jf-btn" disabled={isSaving}>
          {isSaving ? "Saving..." : "Create Job"}
        </button>
      </form>
    </section>
  );
}