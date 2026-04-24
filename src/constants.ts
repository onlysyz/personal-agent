import { ProfileData } from './types';

export const INITIAL_PROFILE: ProfileData = {
  name: "Zhang San",
  role: "Full Stack Engineer",
  location: "Shanghai, China",
  email: "zhang.san@aetheris.local",
  github: "github.com/zhangsan",
  avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDoPq1ZFOMpBXW1CtjddvXU-sbu1ea94_QgOOooMC9SKhaA0drcd2XvZQpdi_gjIquAk6zIPTzJa3CZRZeO5y4Mz_QCOnepGJvN1b1m27n1logjY5yggy8joDkHD6oK3vMVHTxYEvj2P1D2yAuTxyjU8j1OMZFA-yp7yT6mAt5a_uD4PtqE-1uXdZqVoQkKCMD6dCA14yaTBMAQjHspvHDu728roiDwlZVUAowsb3EHZ1gdrNPfH7a_uFKsiU2n8xRGJc20hoUJzAvG",
  currentFocus: {
    title: "Working on AI深耕 (AI Deep Dive)",
    description: "Researching local LLM deployment strategies, fine-tuning methodologies for specific vertical domains, and optimizing inference speeds on consumer hardware.",
    stats: [
      { label: "Active Threads", value: 14 },
      { label: "System Health", value: "98%", highlight: true },
      { label: "Tokens Processed", value: "2.4m" }
    ]
  },
  skills: [
    { name: "React / Frontend", value: 0.92, color: 'primary' },
    { name: "Node.js / Backend", value: 0.88, color: 'primary' },
    { name: "Python / ML Pipeline", value: 0.85, color: 'secondary' },
    { name: "LLM Integration & Tuning", value: 0.78, color: 'secondary' },
    { name: "DevOps / Docker", value: 0.70, color: 'primary' }
  ],
  experiences: [
    {
      company: "Company A",
      period: "2021 - Present",
      role: "Senior Full Stack Engineer",
      description: "Leading the transition to micro-frontend architecture and integrating early-stage AI tools for internal developer productivity. Spearheaded the deployment of local code-assist models.",
      active: true
    },
    {
      company: "Tech Startup Corp",
      period: "2018 - 2021",
      role: "Backend Developer",
      description: "Developed scalable Node.js microservices. Managed database migrations and implemented robust API gateways serving millions of requests daily."
    }
  ],
  recentDynamics: [
    {
      id: '1',
      type: 'commit',
      time: '2 hours ago',
      title: 'Fine-tuned local Llama 3 instance',
      description: 'Completed optimization run on RTX 4090, reducing latency by 15% for coding queries.'
    },
    {
      id: '2',
      type: 'doc',
      time: 'Yesterday',
      title: 'Ingested new documentation',
      description: 'Added React 19 beta docs and Next.js 14 app router guides to vector database.'
    },
    {
      id: '3',
      type: 'session',
      time: '3 days ago',
      title: 'Architecture Review Session',
      description: 'Participated in 45-minute dialogue analyzing trade-offs between serverless and containerized deployment.'
    }
  ]
};

export const INITIAL_DECISION_CONTEXT = {
  coreValues: ["Autonomy", "Continuous Learning", "Financial Stability"],
  currentGoal: "Transition to a senior architectural role within 18 months while maintaining work-life balance."
};
