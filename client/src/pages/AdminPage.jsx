import { useCallback, useEffect, useState } from "react";
import { getFeedback, getFeedbackDetail, updateFeedbackStatus } from "../api";
import { maskIdentifier } from "../lib/maskIdentifier";

const FEEDBACK_STATUSES = ["New", "In review", "Closed"];

export function AdminPage({ user }) {
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [inboxState, setInboxState] = useState("loading");
  const [selectedFeedbackId, setSelectedFeedbackId] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [detailState, setDetailState] = useState("idle");
  const [detailError, setDetailError] = useState("");
  const summary = [
    { label: "Total", count: feedback.length },
    { label: "New", count: feedback.filter((item) => item.status === "New").length },
    { label: "In review", count: feedback.filter((item) => item.status === "In review").length },
    { label: "Closed", count: feedback.filter((item) => item.status === "Closed").length },
  ];
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadFeedback = useCallback(async () => {
    setInboxState("loading");
    setError("");

    try {
      const response = await getFeedback(user, { category: categoryFilter, status: statusFilter });
      setFeedback(response.feedback);
      setInboxState("ready");
    } catch (requestError) {
      setError(requestError.message || "Unable to load feedback.");
      setInboxState("error");
    }
  }, [categoryFilter, statusFilter, user]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleFeedback = feedback.filter((item) => {
    if (!normalizedQuery) return true;
    return [item.name, item.message].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
  const hasActiveFilters = Boolean(categoryFilter || statusFilter || normalizedQuery);

  function clearFilters() {
    setCategoryFilter("");
    setStatusFilter("");
    setSearchQuery("");
  }

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

  async function handleViewDetails(feedbackId) {
    setSelectedFeedbackId(feedbackId);
    setSelectedFeedback(null);
    setDetailState("loading");
    setDetailError("");

    try {
      const response = await getFeedbackDetail(user, feedbackId);
      setSelectedFeedback(response.feedback);
      setDetailState("ready");
    } catch (requestError) {
      setDetailError(requestError.message || "Unable to load feedback details.");
      setDetailState("error");
    }
  }

  function handleBackToInbox() {
    setSelectedFeedbackId("");
    setSelectedFeedback(null);
    setDetailState("idle");
    setDetailError("");
  }

  if (selectedFeedbackId) {
    return (
      <FeedbackDetail
        feedback={selectedFeedback}
        error={detailError}
        state={detailState}
        onBack={handleBackToInbox}
      />
    );
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
            <fieldset className="inbox-filters">
              <legend>Filter feedback</legend>
              <label htmlFor="feedback-category-filter">
                Category
                <select
                  id="feedback-category-filter"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="">All categories</option>
                  <option value="Estate">Estate</option>
                  <option value="Transport">Transport</option>
                  <option value="Environment">Environment</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label htmlFor="feedback-status-filter">
                Status
                <select
                  id="feedback-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="New">New</option>
                  <option value="In review">In review</option>
                  <option value="Closed">Closed</option>
                </select>
              </label>
              <button className="secondary-button" type="button" onClick={clearFilters} disabled={!hasActiveFilters}>
                Clear filters
              </button>
            </fieldset>
            {updateError && <p className="error-message" role="alert">{updateError}</p>}
            {visibleFeedback.map((item) => (
              <article className="feedback-row" key={item.id}>
                <div>
                  <div className="feedback-meta">
                    {item.name} · {maskIdentifier(item.nric)} · {item.category} · {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                  <p>{item.message}</p>
                </div>
                <div className="feedback-row-actions">
                  <button className="text-button feedback-detail-button" type="button" onClick={() => handleViewDetails(item.id)}>
                    View details
                  </button>
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
                </div>
              </article>
            ))}
            {visibleFeedback.length === 0 && (
              <div className="inbox-state inbox-state-empty">
                <h2>{hasActiveFilters ? "No matching feedback" : "Your inbox is empty"}</h2>
                <p>{hasActiveFilters ? "Try changing or clearing your filters." : "No feedback has been received yet."}</p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function FeedbackDetail({ feedback, error, state, onBack }) {
  return (
    <main className="page-shell admin-shell">
      <button className="text-button back-to-inbox" type="button" onClick={onBack}>← Back to inbox</button>
      <div className="page-heading">
        <div className="eyebrow">Admin workspace</div>
        <h1>Feedback details</h1>
        <p>Review the full submission without losing your inbox search or filters.</p>
      </div>
      {state === "loading" && (
        <section className="inbox-state inbox-state-loading" role="status">
          <h2>Loading feedback details</h2>
          <p>Getting the complete submission.</p>
        </section>
      )}
      {state === "error" && (
        <section className="inbox-state inbox-state-error" role="alert">
          <h2>We couldn’t load this feedback</h2>
          <p>{error}</p>
          <button className="secondary-button" type="button" onClick={onBack}>Back to inbox</button>
        </section>
      )}
      {state === "ready" && feedback && (
        <section className="feedback-detail" aria-label="Feedback details">
          <dl className="feedback-detail-fields">
            <DetailField label="Reference number" value={feedback.reference || "Not available"} />
            <DetailField label="Feedback ID" value={feedback.id} />
            <DetailField label="Name" value={feedback.name} />
            <DetailField label="Identifier" value={maskIdentifier(feedback.nric)} />
            <DetailField label="Category" value={feedback.category} />
            <DetailField label="Status" value={feedback.status} />
            <DetailField label="Received" value={formatDateTime(feedback.createdAt)} />
          </dl>
          <div className="feedback-detail-message">
            <h2>Feedback</h2>
            <p>{feedback.message}</p>
          </div>
        </section>
      )}
    </main>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "Not available"}</dd>
    </div>
  );
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString();
}
