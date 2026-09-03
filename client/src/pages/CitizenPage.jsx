import { useEffect, useRef, useState } from "react";
import { submitFeedback } from "../api";

const MAX_FEEDBACK_LENGTH = 500;
const FEEDBACK_CATEGORIES = ["Estate", "Transport", "Environment", "Other"];

export function CitizenPage({ user }) {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef(null);
  const successRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (submitted) successRef.current?.focus();
  }, [submitted]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!FEEDBACK_CATEGORIES.includes(category)) {
      setError("Please choose a feedback category.");
      return;
    }

    if (message.length > MAX_FEEDBACK_LENGTH) {
      setError(`Feedback must be ${MAX_FEEDBACK_LENGTH} characters or fewer.`);
      return;
    }

    if (!message.trim()) {
      setError("Please enter feedback that is not blank.");
      return;
    }

    try {
      await submitFeedback({ nric: user.nric, name: user.name, message, category });
      setSubmitted(true);
      setMessage("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function handleSubmitAnother() {
    setSubmitted(false);
    setMessage("");
    setCategory("");
    setError("");
  }

  return (
    <main className="page-shell">
      <div className="page-heading">
        <div className="eyebrow">Public feedback</div>
        <h1>What would you like us to know?</h1>
        <p>Tell us about an issue, an idea, or a positive experience in your community.</p>
      </div>
      <section className="form-card">
        {submitted ? (
          <div className="success-panel" role="status" aria-live="polite" tabIndex="-1" ref={successRef}>
            <div className="eyebrow">Feedback submitted</div>
            <h2>Thank you for sharing.</h2>
            <p>Your feedback has been received.</p>
            <button className="primary-button" onClick={handleSubmitAnother}>Submit another response</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="feedback-category">Feedback category</label>
            <select
              id="feedback-category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setError("");
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "feedback-error" : undefined}
            >
              <option value="">Choose a category</option>
              {FEEDBACK_CATEGORIES.map((option) => <option key={option}>{option}</option>)}
            </select>
            <label htmlFor="feedback-message">Your feedback</label>
            <p id="feedback-guidance" className="field-guidance">
              Please do not include sensitive personal information.
            </p>
            <textarea
              id="feedback-message"
              rows="7"
              value={message}
              maxLength={MAX_FEEDBACK_LENGTH}
              onChange={(event) => {
                setMessage(event.target.value.slice(0, MAX_FEEDBACK_LENGTH));
                setError("");
              }}
              placeholder="Share your feedback here..."
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "feedback-guidance feedback-error" : "feedback-guidance"}
            />
            {error && (
              <p id="feedback-error" className="error-message" role="alert" tabIndex="-1" ref={errorRef}>
                {error}
              </p>
            )}
            <div className="form-footer">
              <div className="character-count">{message.length} / {MAX_FEEDBACK_LENGTH} characters</div>
              <button className="primary-button">Submit feedback</button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
