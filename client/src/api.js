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
export function getFeedback(user, filters = {}) {
  const searchParams = new URLSearchParams();
  if (filters.category) searchParams.set("category", filters.category);
  if (filters.status) searchParams.set("status", filters.status);
  const query = searchParams.toString();

  return api(`/api/feedback${query ? `?${query}` : ""}`, { headers: { "x-user-role": user.role } });
}
