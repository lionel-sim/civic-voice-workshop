import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import { createDb } from "./lib/db.js";

const FEEDBACK_CATEGORIES = new Set(["Estate", "Transport", "Environment", "Other"]);
const FEEDBACK_STATUSES = new Set(["New", "In review", "Closed"]);
const FEEDBACKS_PER_PAGE = 10;

export async function createApp(options = {}) {
  const db = options.db ?? (await createDb());
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "civic-voice-api" });
  });

  app.post("/api/login", (req, res) => {
    const { nric, password, role } = req.body ?? {};
    const user = db.data.users.find(
      (candidate) => candidate.nric === nric && candidate.password === password && candidate.role === role,
    );
    if (!user) return res.status(401).json({ error: "Invalid NRIC, password, or sign-in mode." });

    // Workshop baseline only: this is deliberately not a production session.
    const token = Buffer.from(`${user.nric}:${user.role}`).toString("base64");
    return res.json({ token, user: { nric: user.nric, name: user.name, role: user.role } });
  });

  app.get("/api/feedback", (req, res) => {
    if (req.header("x-user-role") !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    const { category, status } = req.query;
    const feedback = [...db.data.feedback]
      .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
      .filter((item) => (!category || item.category === category) && (!status || item.status === status));
    const totalItems = feedback.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / FEEDBACKS_PER_PAGE));
    const requestedPage = Number(req.query.page ?? 1);
    const page = Number.isInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, totalPages)
      : 1;
    const start = (page - 1) * FEEDBACKS_PER_PAGE;

    return res.json({
      feedback: feedback.slice(start, start + FEEDBACKS_PER_PAGE),
      pagination: { page, pageSize: FEEDBACKS_PER_PAGE, totalItems, totalPages },
    });
  });

  app.patch("/api/feedback/:id/status", async (req, res) => {
    if (req.header("x-user-role") !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }

    const { status } = req.body ?? {};
    if (!FEEDBACK_STATUSES.has(status)) {
      return res.status(400).json({ error: "Please choose a valid feedback status." });
    }

    const feedback = db.data.feedback.find((item) => item.id === req.params.id);
    if (!feedback) return res.status(404).json({ error: "Feedback not found." });

    feedback.status = status;
    await db.write();
    return res.json({ feedback });
  });

  app.post("/api/feedback", async (req, res) => {
    const { nric, name, message, category } = req.body ?? {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Please enter feedback that is not blank." });
    }
    if (!FEEDBACK_CATEGORIES.has(category)) {
      return res.status(400).json({ error: "Please choose a valid feedback category." });
    }
    const feedback = {
      id: crypto.randomUUID(),
      reference: createSubmissionReference(db.data.feedback),
      nric,
      name,
      message,
      category,
      status: "New",
      createdAt: new Date().toISOString(),
    };
    db.data.feedback.unshift(feedback);
    await db.write();
    return res.status(201).json({ feedback, reference: feedback.reference });
  });

  return app;
}

function createSubmissionReference(feedbackItems) {
  let reference;

  do {
    reference = `CV-${crypto.randomInt(100000, 1_000_000)}`;
  } while (feedbackItems.some((item) => item.reference === reference));

  return reference;
}
