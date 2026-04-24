/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Skill {
  name: string;
  value: number;
  color: 'primary' | 'secondary';
}

export interface Experience {
  company: string;
  period: string;
  role: string;
  description: string;
  active?: boolean;
}

export interface DynamicLog {
  id: string;
  type: 'commit' | 'doc' | 'session';
  time: string;
  title: string;
  description: string;
}

export interface ProfileData {
  name: string;
  role: string;
  location: string;
  email: string;
  github: string;
  avatar: string;
  currentFocus: {
    title: string;
    description: string;
    stats: {
      label: string;
      value: string | number;
      highlight?: boolean;
    }[];
  };
  skills: Skill[];
  experiences: Experience[];
  recentDynamics: DynamicLog[];
}

export interface DecisionContext {
  coreValues: string[];
  currentGoal: string;
}

export interface DecisionAnalysis {
  pros: string[];
  cons: string[];
  alignment: number;
  summary: string;
}
