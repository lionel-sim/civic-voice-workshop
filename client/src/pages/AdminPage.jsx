import { useEffect, useState } from "react";
import { getFeedback } from "../api";

export function AdminPage({ user }) {
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState("");
  const summary = [
    { label: "Total", count: feedback.length },
    { label: "New", count: feedback.filter((item) => item.status === "New").length },
    { label: "In review", count: feedback.filter((item) => item.status === "In review").length },
    { label: "Closed", count: feedback.filter((item) => item.status === "Closed").length },
  ];
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getFeedback(user).then((response) => setFeedback(response.feedback)).catch((requestError) => setError(requestError.message));
  }, [user]);

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleFeedback = feedback.filter((item) => {
    if (!normalizedQuery) return true;
    return [item.name, item.message].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });

  return (
    <main className="page-shell admin-shell">
      <div className="page-heading">
        <div className="eyebrow">Admin workspace</div>
        <h1>Feedback inbox</h1>
        <p>A simple view of feedback received from members of the public.</p>
      </div>
      {error && <p className="error-message">{error}</p>}
      <section className="inbox-summary" aria-label="Current inbox summary">
        {summary.map(({ label, count }) => (
          <div className="summary-card" key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </section>
      <section className="feedback-list">
        <div className="list-header"><strong>Latest feedback</strong><span>{visibleFeedback.length} of {feedback.length} items</span></div>
        <label className="inbox-search" htmlFor="feedback-search">
          Search feedback
          <input
            id="feedback-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name or keyword"
          />
        </label>
        {visibleFeedback.map((item) => (
          <article className="feedback-row" key={item.id}>
            <div>
              <div className="feedback-meta">{item.name} · {new Date(item.createdAt).toLocaleDateString()}</div>
              <p>{item.message}</p>
            </div>
            <span className="status-pill">{item.status}</span>
          </article>
        ))}
        {!error && visibleFeedback.length === 0 && (
          <p className="empty-state">
            {normalizedQuery ? "No feedback matches your search. Try a different name or keyword." : "No feedback has been received yet."}
          </p>
        )}
      </section>
    </main>
  );
}
