const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
  return body;
}

export function login(credentials) {
  return api("/api/login", { method: "POST", body: JSON.stringify(credentials) });
}
export function submitFeedback(feedback) {
  return api("/api/feedback", { method: "POST", body: JSON.stringify(feedback) });
}
export function getFeedback(user) {
  return api("/api/feedback", { headers: { "x-user-role": user.role } });
}
export function updateFeedbackStatus(user, feedbackId, status) {
  return api(`/api/feedback/${feedbackId}/status`, {
    method: "PATCH",
    headers: { "x-user-role": user.role },
    body: JSON.stringify({ status }),
  });
}

export async function downloadFeedbackCsv(user, filters = {}) {
  const searchParams = new URLSearchParams();
  if (filters.search?.trim()) searchParams.set("search", filters.search.trim());
  const query = searchParams.toString();
  const response = await fetch(`${API_URL}/api/feedback/export.csv${query ? `?${query}` : ""}`, {
    headers: { "x-user-role": user.role },
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error ?? "Unable to export feedback.");
  }

  return response.blob();
}
