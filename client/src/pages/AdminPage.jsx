import { useCallback, useEffect, useState } from "react";
import { getFeedback, updateFeedbackStatus } from "../api";
import { maskIdentifier } from "../lib/maskIdentifier";

const FEEDBACK_STATUSES = ["New", "In review", "Closed"];

export function AdminPage({ user }) {
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [inboxState, setInboxState] = useState("loading");
  const summary = [
    { label: "Total", count: feedback.length },
    { label: "New", count: feedback.filter((item) => item.status === "New").length },
    { label: "In review", count: feedback.filter((item) => item.status === "In review").length },
    { label: "Closed", count: feedback.filter((item) => item.status === "Closed").length },
  ];
  const [searchQuery, setSearchQuery] = useState("");

  const loadFeedback = useCallback(async () => {
    setInboxState("loading");
    setError("");

    try {
      const response = await getFeedback(user);
      setFeedback(response.feedback);
      setInboxState("ready");
    } catch (requestError) {
      setError(requestError.message || "Unable to load feedback.");
      setInboxState("error");
    }
  }, [user]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleFeedback = feedback.filter((item) => {
    if (!normalizedQuery) return true;
    return [item.name, item.message].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });

  async function handleStatusChange(feedbackId, status) {
    setUpdateError("");
    setUpdatingId(feedbackId);

    try {
      const response = await updateFeedbackStatus(user, feedbackId, status);
      setFeedback((items) => items.map((item) => (
        item.id === feedbackId ? response.feedback : item
      )));
    } catch (requestError) {
      setUpdateError(requestError.message || "Unable to update feedback status.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="page-shell admin-shell">
      <div className="page-heading">
        <div className="eyebrow">Admin workspace</div>
        <h1>Feedback inbox</h1>
        <p>A simple view of feedback received from members of the public.</p>
      </div>
      {inboxState === "ready" && (
        <section className="inbox-summary" aria-label="Current inbox summary">
          {summary.map(({ label, count }) => (
            <div className="summary-card" key={label}>
              <span>{label}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </section>
      )}
      <section className="feedback-list" aria-busy={inboxState === "loading"}>
        {inboxState === "loading" && (
          <div className="inbox-state inbox-state-loading" role="status">
            <h2>Loading feedback</h2>
            <p>Getting the latest submissions for your inbox.</p>
          </div>
        )}
        {inboxState === "error" && (
          <div className="inbox-state inbox-state-error" role="alert">
            <h2>We couldn’t load the inbox</h2>
            <p>{error}</p>
            <button className="secondary-button" type="button" onClick={loadFeedback}>Try again</button>
          </div>
        )}
        {inboxState === "ready" && (
          <>
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
            {updateError && <p className="error-message" role="alert">{updateError}</p>}
            {visibleFeedback.map((item) => (
              <article className="feedback-row" key={item.id}>
                <div>
                  <div className="feedback-meta">
                    {item.name} · {maskIdentifier(item.nric)} · {item.category} · {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                  <p>{item.message}</p>
                </div>
                <label className="feedback-status-control">
                  <span>Status</span>
                  <select
                    aria-label={`Status for feedback from ${item.name}`}
                    disabled={updatingId === item.id}
                    onChange={(event) => handleStatusChange(item.id, event.target.value)}
                    value={item.status}
                  >
                    {FEEDBACK_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
              </article>
            ))}
            {visibleFeedback.length === 0 && (
              <div className="inbox-state inbox-state-empty">
                <h2>{normalizedQuery ? "No matching feedback" : "Your inbox is empty"}</h2>
                <p>{normalizedQuery ? "Try a different name or keyword." : "No feedback has been received yet."}</p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
