import { describe, expect, it } from "vitest";
import {
  SESSION_STORAGE_KEY,
  clearSession,
  restoreSession,
  saveSession,
} from "./session";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

const citizenSession = {
  token: "ZGVtby10b2tlbg==",
  user: { nric: "S0000001A", name: "Aisha Rahman", role: "citizen" },
};

describe("local sessions", () => {
  it("restores a successfully saved session", () => {
    const storage = createStorage();

    saveSession(citizenSession, storage);

    expect(restoreSession(storage)).toEqual(citizenSession);
  });

  it("clears the saved session on sign out", () => {
    const storage = createStorage();
    saveSession(citizenSession, storage);

    clearSession(storage);

    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(restoreSession(storage)).toBeNull();
  });

  it("discards malformed saved data", () => {
    const storage = createStorage();
    storage.setItem(SESSION_STORAGE_KEY, "not valid JSON");

    expect(restoreSession(storage)).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
