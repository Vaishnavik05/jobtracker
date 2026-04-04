import "./JobList.css";

export default function JobList({ jobs = [] }) {
  if (!jobs.length) {
    return (
      <div className="joblist-empty">
        <h3>No applications yet</h3>
        <p>Apply to new jobs from the View New Jobs section.</p>
      </div>
    );
  }

  return (
    <div className="joblist-wrap">
      {jobs.map((job) => (
        <article key={job.id} className="job-card">
          <div className="job-main">
            <div className="job-title-row">
              <h3>{job.company || "Company"}</h3>
              <span className="job-status">{job.status || "Online Test"}</span>
            </div>
            <p>
              <strong>Role:</strong> {job.role || "-"}
            </p>
            <p>
              <strong>Date:</strong> {job.appliedDate || "-"}
            </p>
            {job.notes ? (
              <p>
                <strong>Notes:</strong> {job.notes}
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}