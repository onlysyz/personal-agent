import { Router } from "express";
import { getProfileWithDefault, saveProfile, getPublicProfile } from "../lib/profile.js";

const profileRouter = Router();

profileRouter.get("/", (_req, res) => {
  const profile = getProfileWithDefault();
  return res.json({ code: 0, data: profile });
});

profileRouter.get("/public", (_req, res) => {
  const publicProfile = getPublicProfile();
  if (!publicProfile) {
    return res.status(404).json({ code: 404, error: "Profile not found" });
  }
  return res.json({ code: 0, data: publicProfile });
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