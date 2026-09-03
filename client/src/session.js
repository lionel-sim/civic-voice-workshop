export const SESSION_STORAGE_KEY = "civic-voice-session";

function isSession(value) {
  return Boolean(
    value
      && typeof value.token === "string"
      && value.user
      && typeof value.user.nric === "string"
      && typeof value.user.name === "string"
      && ["citizen", "admin"].includes(value.user.role),
  );
}

export function restoreSession(storage = globalThis.localStorage) {
  try {
    const storedSession = storage.getItem(SESSION_STORAGE_KEY);
    if (!storedSession) return null;

    const session = JSON.parse(storedSession);
    if (isSession(session)) return session;

    storage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    try {
      storage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // A browser can deny storage access or contain corrupt local data.
    }
  }
  return null;
}

export function saveSession(session, storage = globalThis.localStorage) {
  if (!isSession(session)) return;

  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The signed-in page remains usable if local storage is unavailable.
  }
}

export function clearSession(storage = globalThis.localStorage) {
  try {
    storage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // The in-memory session is still cleared by the caller.
  }
}
