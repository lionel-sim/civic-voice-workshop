import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createDb } from "./lib/db.js";

async function testApp() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "civic-voice-"));
  const db = await createDb(path.join(directory, "db.json"));
  return createApp({ db });
}

describe("CivicVoice baseline API", () => {
  it("creates a missing datastore directory on first use", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "civic-voice-"));
    const db = await createDb(path.join(directory, "missing", "data", "db.json"));
    expect(db.data.users).toHaveLength(2);
  });

  it("logs in the seeded citizen", async () => {
    const app = await testApp();
    const response = await request(app).post("/api/login").send({
      nric: "S0000001A", password: "citizen123", role: "citizen",
    });
    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("citizen");
  });

  it("accepts feedback with a category and retains it in the admin inbox", async () => {
    const app = await testApp();
    const response = await request(app).post("/api/feedback").send({
      nric: "S0000001A", name: "Aisha Rahman", message: "Please add more benches.", category: "Estate",
    });
    expect(response.status).toBe(201);
    expect(response.body.feedback.message).toBe("Please add more benches.");
    expect(response.body.feedback.category).toBe("Estate");
    expect(response.body.reference).toMatch(/^CV-\d{6}$/);
    expect(response.body.feedback.reference).toBe(response.body.reference);
    expect(response.body.reference).not.toBe(response.body.feedback.id);

    const inbox = await request(app).get("/api/feedback").set("x-user-role", "admin");
    expect(inbox.body.feedback[0].category).toBe("Estate");
  });

  it("filters the admin inbox by category and status together", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "civic-voice-"));
    const db = await createDb(path.join(directory, "db.json"));
    db.data.feedback = [
      { id: "1", nric: "S0000001A", name: "Aisha Rahman", message: "Estate issue", category: "Estate", status: "New", createdAt: "2026-08-29T09:14:00.000Z" },
      { id: "2", nric: "S0000001A", name: "Aisha Rahman", message: "Review issue", category: "Estate", status: "In review", createdAt: "2026-08-29T09:14:00.000Z" },
      { id: "3", nric: "S0000001A", name: "Aisha Rahman", message: "Transport issue", category: "Transport", status: "New", createdAt: "2026-08-29T09:14:00.000Z" },
      { id: "4", nric: "S0000001A", name: "Aisha Rahman", message: "Closed issue", category: "Environment", status: "Closed", createdAt: "2026-08-29T09:14:00.000Z" },
    ];
    const app = await createApp({ db });

    const byCategory = await request(app).get("/api/feedback").query({ category: "Estate" }).set("x-user-role", "admin");
    const byStatus = await request(app).get("/api/feedback").query({ status: "New" }).set("x-user-role", "admin");
    const combined = await request(app)
      .get("/api/feedback")
      .query({ category: "Estate", status: "New" })
      .set("x-user-role", "admin");

    expect(byCategory.body.feedback).toHaveLength(2);
    expect(byStatus.body.feedback).toHaveLength(2);
    expect(combined.body.feedback).toEqual([expect.objectContaining({ id: "1", category: "Estate", status: "New" })]);
  });

  it("rejects feedback with an invalid category", async () => {
    const app = await testApp();
    const response = await request(app).post("/api/feedback").send({
      nric: "S0000001A", name: "Aisha Rahman", message: "Please add more benches.", category: "General",
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Please choose a valid feedback category.");
  });

  it("rejects blank or whitespace-only feedback", async () => {
    const app = await testApp();

    for (const message of ["", "   ", "\n\t  "]) {
      const response = await request(app).post("/api/feedback").send({
        nric: "S0000001A", name: "Aisha Rahman", message,
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Please enter feedback that is not blank.");
    }
  });

  it("blocks the feedback list without the admin role header", async () => {
    const app = await testApp();
    const response = await request(app).get("/api/feedback");
    expect(response.status).toBe(403);
  });

  it("returns one feedback item with all stored fields for an admin", async () => {
    const app = await testApp();

    const response = await request(app)
      .get("/api/feedback/fb-seed-1")
      .set("x-user-role", "admin");

    expect(response.status).toBe(200);
    expect(response.body.feedback).toMatchObject({
      id: "fb-seed-1",
      nric: "S0000001A",
      name: "Aisha Rahman",
      message: expect.any(String),
      category: "General",
      status: "New",
      createdAt: "2026-08-29T09:14:00.000Z",
    });
  });

  it("blocks non-admin detail access and reports missing feedback", async () => {
    const app = await testApp();

    const forbidden = await request(app).get("/api/feedback/fb-seed-1");
    expect(forbidden.status).toBe(403);

    const missing = await request(app)
      .get("/api/feedback/not-found")
      .set("x-user-role", "admin");
    expect(missing.status).toBe(404);
  });

  it("lets an admin update a feedback status and persists the change", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "civic-voice-"));
    const file = path.join(directory, "db.json");
    const db = await createDb(file);
    const app = await createApp({ db });

    const response = await request(app)
      .patch("/api/feedback/fb-seed-1/status")
      .set("x-user-role", "admin")
      .send({ status: "In review" });

    expect(response.status).toBe(200);
    expect(response.body.feedback.status).toBe("In review");

    const reloadedDb = await createDb(file);
    expect(reloadedDb.data.feedback.find((item) => item.id === "fb-seed-1").status).toBe("In review");
  });

  it("rejects non-admin and invalid status updates", async () => {
    const app = await testApp();

    const forbidden = await request(app)
      .patch("/api/feedback/fb-seed-1/status")
      .send({ status: "Closed" });
    expect(forbidden.status).toBe(403);

    const invalid = await request(app)
      .patch("/api/feedback/fb-seed-1/status")
      .set("x-user-role", "admin")
      .send({ status: "Archived" });
    expect(invalid.status).toBe(400);
  });

  it("returns feedback newest first when stored data is out of order", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "civic-voice-"));
    const db = await createDb(path.join(directory, "db.json"));
    db.data.feedback = [
      { id: "old", createdAt: "2026-08-01T09:00:00.000Z" },
      { id: "new", createdAt: "2026-08-03T09:00:00.000Z" },
      { id: "middle", createdAt: "2026-08-02T09:00:00.000Z" },
    ];
    await db.write();
    const app = await createApp({ db });

    const response = await request(app).get("/api/feedback").set("x-user-role", "admin");

    expect(response.status).toBe(200);
    expect(response.body.feedback.map((item) => item.id)).toEqual(["new", "middle", "old"]);
  });
});
