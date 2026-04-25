import { Router } from "express";
import { getDecisions, getDecisionById, searchDecisions } from "../lib/db.js";

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

decisionsRouter.get("/search", (req, res) => {
  try {
    const keyword = req.query.keyword as string;
    if (!keyword) {
      return res.status(400).json({ code: 400, error: "Keyword is required" });
    }
    const decisions = searchDecisions(keyword);
    return res.json({ code: 0, data: decisions });
  } catch (err) {
    console.error("Failed to search decisions:", err);
    return res.status(500).json({ code: 500, error: "Failed to search decisions" });
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
