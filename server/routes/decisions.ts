import { Router } from "express";
import { getDecisions, getDecisionById } from "../lib/db.js";

const decisionsRouter = Router();

decisionsRouter.get("/", (_req, res) => {
  try {
    const decisions = getDecisions();
    return res.json({ code: 0, data: decisions });
  } catch (err) {
    console.error("Failed to get decisions:", err);
    return res.status(500).json({ code: 500, error: "Failed to get decisions" });
  }
});

decisionsRouter.get("/:id", (req, res) => {
  try {
    const decision = getDecisionById(req.params.id);
    if (!decision) {
      return res.status(404).json({ code: 404, error: "Decision not found" });
    }
    return res.json({ code: 0, data: decision });
  } catch (err) {
    console.error("Failed to get decision:", err);
    return res.status(500).json({ code: 500, error: "Failed to get decision" });
  }
});

export default decisionsRouter;
