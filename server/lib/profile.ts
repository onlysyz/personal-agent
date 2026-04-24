import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface Skill {
  name: string;
  value: number;
  color: "primary" | "secondary";
}

export interface Experience {
  company: string;
  period: string;
  role: string;
  description: string;
  highlights?: string[];
  reason_for_leaving?: string;
  active?: boolean;
  visibility: "public" | "private";
}

export interface DynamicLog {
  id: string;
  type: "commit" | "doc" | "session";
  time: string;
  title: string;
  description: string;
}

export interface ContactInfo {
  email: string;
  github: string;
  visibility: "public" | "private";
}

export interface ProfileData {
  name: string;
  role: string;
  location: string;
  email: string;
  github: string;
  avatar: string;
  bio?: string;
  contact?: ContactInfo;
  currentFocus?: {
    title: string;
    description: string;
    stats: { label: string; value: string | number; highlight?: boolean }[];
  };
  skills: Skill[];
  experiences: Experience[];
  recentDynamics?: DynamicLog[];
  values?: string[];
  current_goals?: string;
  decisions_context?: string;
}

export interface PublicProfile {
  name: string;
  role: string;
  location: string;
  bio?: string;
  avatar: string;
  skills: Skill[];
  experiences: {
    company: string;
    period: string;
    role: string;
    description: string;
    highlights?: string[];
    active?: boolean;
  }[];
  contact?: { email?: string; github?: string };
}

const PROFILE_PATH = process.env.PROFILE_PATH ||
  path.join(__dirname, "../../data/profile.json");

let profileCache: ProfileData | null = null;

export function getProfile(): ProfileData | null {
  if (!fs.existsSync(PROFILE_PATH)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(PROFILE_PATH, "utf-8");
    profileCache = JSON.parse(raw) as ProfileData;
    return profileCache;
  } catch {
    return profileCache;
  }
}

export function saveProfile(profile: ProfileData): void {
  const dir = path.dirname(PROFILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2), "utf-8");
  profileCache = profile;
}

export function getPublicProfile(): PublicProfile | null {
  const profile = getProfile();
  if (!profile) return null;

  const publicExperiences = (profile.experiences || [])
    .filter((exp) => exp.visibility !== "private")
    .map((exp) => ({
      company: exp.company,
      period: exp.period,
      role: exp.role,
      description: exp.description,
      highlights: exp.highlights,
      active: exp.active,
    }));

  const publicContact =
    profile.contact?.visibility !== "private"
      ? { email: profile.contact?.email, github: profile.contact?.github }
      : undefined;

  return {
    name: profile.name,
    role: profile.role,
    location: profile.location,
    bio: profile.bio,
    avatar: profile.avatar,
    skills: profile.skills || [],
    experiences: publicExperiences,
    contact: publicContact,
  };
}

export function generateAgentsMd(profile: ProfileData): string {
  const experiences = (profile.experiences || [])
    .filter((e) => e.visibility !== "private")
    .map((e) => `- ${e.company} (${e.period}): ${e.role}`)
    .join("\n");

  const skills = (profile.skills || [])
    .map((s) => `- ${s.name} (${Math.round(s.value * 100)}%)`)
    .join("\n");

  return `# Personal Agent Memory

## 基本信息
- 姓名：${profile.name}
- 职位：${profile.role}
- 所在城市：${profile.location}
- 简介：${profile.bio || ""}

## 核心价值观
${(profile.values || []).map((v) => `- ${v}`).join("\n")}

## 当前目标
${profile.current_goals || ""}

## 工作经历
${experiences}

## 核心技能
${skills}
`;
}
