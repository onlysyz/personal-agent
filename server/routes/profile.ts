import { Router } from "express";
import { getProfile, saveProfile, getPublicProfile, generateAgentsMd } from "../lib/profile.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profileRouter = Router();

profileRouter.get("/", (_req, res) => {
  const profile = getProfile();
  if (!profile) {
    return res.status(404).json({ code: 404, error: "profile.json not found" });
  }
  return res.json({ code: 0, data: profile });
});

profileRouter.put("/", (req, res) => {
  const profile = req.body;
  if (!profile || !profile.name) {
    return res.status(400).json({ code: 400, error: "Invalid profile data" });
  }
  try {
    saveProfile(profile);

    // Regenerate AGENTS.md
    const agentsMd = generateAgentsMd(profile);
    const agentsMdPath = path.join(__dirname, "../../data/AGENTS.md");
    fs.writeFileSync(agentsMdPath, agentsMd, "utf-8");

    return res.json({ code: 0, data: { message: "Profile saved successfully" } });
  } catch (err) {
    console.error("Failed to save profile:", err);
    return res.status(500).json({ code: 500, error: "Failed to save profile" });
  }
});

export default profileRouter;
