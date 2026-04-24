import { Router } from "express";
import { getProfileWithDefault, saveProfile, getPublicProfile } from "../lib/profile.js";

const profileRouter = Router();

profileRouter.get("/", (_req, res) => {
  const profile = getProfileWithDefault();
  return res.json({ code: 0, data: profile });
});

profileRouter.put("/", (req, res) => {
  const profile = req.body;
  if (!profile || !profile.name) {
    return res.status(400).json({ code: 400, error: "Invalid profile data" });
  }
  try {
    saveProfile(profile);
    return res.json({ code: 0, data: { message: "Profile saved successfully" } });
  } catch (err) {
    console.error("Failed to save profile:", err);
    return res.status(500).json({ code: 500, error: "Failed to save profile" });
  }
});

export default profileRouter;