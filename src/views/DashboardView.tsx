import React from 'react';
import { motion } from 'motion/react';
import { 
  Fingerprint, 
  Code, 
  MapPin, 
  Mail, 
  Link as LinkIcon, 
  MemoryStick as Memory, 
  Edit3, 
  Brain,
  Zap,
  Activity,
  History,
  GitCommit,
  FileCode,
  MessagesSquare
} from 'lucide-react';
import { INITIAL_PROFILE } from '../constants';

export default function DashboardView() {
  const profile = INITIAL_PROFILE;

  return (
    <div className="space-y-6">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-4 bg-surface-container rounded-2xl border border-outline-variant/30 p-6 flex flex-col relative overflow-hidden group hover:border-outline-variant/60 transition-all"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Fingerprint size={120} className="text-primary" />
          </div>
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-surface-container-highest shadow-xl">
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-on-surface">{profile.name}</h2>
              <div className="flex items-center gap-1.5 mt-1 text-primary">
                <Code size={14} />
                <span className="text-sm font-medium">{profile.role}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 flex-1 relative z-10 text-on-surface-variant text-sm">
            <div className="flex items-center gap-3">
              <MapPin size={16} />
              <span>{profile.location}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={16} />
              <span>{profile.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <LinkIcon size={16} />
              <a href="#" className="text-primary hover:underline">{profile.github}</a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-outline-variant/20 flex gap-3">
            <span className="px-3 py-1 bg-surface-bright text-on-surface font-mono text-[10px] rounded border border-outline-variant/30">
              ID: AGT-8821
            </span>
            <span className="px-3 py-1 bg-secondary-container/10 text-secondary font-mono text-[10px] rounded border border-secondary/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              Online
            </span>
          </div>
        </motion.div>

        {/* Current Focus Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-8 bg-surface-container rounded-2xl border border-outline-variant/30 p-8 flex flex-col relative overflow-hidden"
        >
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex justify-between items-start mb-8 z-10">
            <div>
              <h3 className="text-xl font-bold text-on-surface flex items-center gap-2.5">
                <Memory className="text-secondary w-6 h-6" />
                Current Focus
              </h3>
              <p className="text-sm text-on-surface-variant mt-1">Active cognitive load and ongoing tasks</p>
            </div>
            <button className="p-2 bg-surface-bright rounded-xl border border-outline-variant/30 hover:border-outline-variant/60 transition-all text-on-surface-variant hover:text-on-surface">
              <Edit3 size={18} />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center z-10">
            <div className="bg-surface-container-highest/40 border border-outline-variant/20 rounded-2xl p-6 mb-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="text-primary w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Primary Task</span>
              </div>
              <h4 className="text-2xl font-bold text-on-surface mb-3 leading-tight">{profile.currentFocus.title}</h4>
              <p className="text-on-surface-variant leading-relaxed opacity-80">
                {profile.currentFocus.description}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {profile.currentFocus.stats.map((stat, i) => (
                <div key={i} className="bg-surface-container-low/50 rounded-xl p-5 border border-outline-variant/10 flex flex-col items-center justify-center text-center">
                  <span className={cn("text-2xl font-bold", stat.highlight ? "text-secondary" : "text-on-surface")}>
                    {stat.value}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1.5 opacity-60">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Knowledge Vectors (Skills) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-5 bg-surface-container rounded-2xl border border-outline-variant/30 p-8 flex flex-col"
        >
          <div className="flex items-center gap-3 mb-8">
            <Zap className="text-primary w-6 h-6" />
            <h3 className="text-xl font-bold text-on-surface">Knowledge Vectors</h3>
          </div>
          
          <div className="flex-1 space-y-7">
            {profile.skills.map((skill, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium text-on-surface opacity-90">{skill.name}</span>
                  <span className={cn("font-mono text-xs font-bold", skill.color === 'primary' ? 'text-primary' : 'text-secondary')}>
                    {skill.value.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-bright rounded-full overflow-hidden p-[2px]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.value * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                    className={cn("h-full rounded-full shadow-sm", skill.color === 'primary' ? 'bg-primary' : 'bg-secondary')}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Experience Context */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-7 bg-surface-container rounded-2xl border border-outline-variant/30 p-8 flex flex-col"
        >
          <div className="flex items-center gap-3 mb-8">
            <History className="text-primary w-6 h-6" />
            <h3 className="text-xl font-bold text-on-surface">Experience Context</h3>
          </div>

          <div className="relative border-l border-outline-variant/20 ml-3 space-y-10 pb-4">
            {profile.experiences.map((exp, i) => (
              <div key={i} className="relative pl-8">
                <div className={cn(
                  "absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-surface-container",
                  exp.active ? "bg-secondary shadow-[0_0_10px_rgba(93,230,255,0.4)]" : "bg-outline-variant"
                )} />
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-2">
                  <h4 className="font-bold text-on-surface">{exp.company}</h4>
                  <span className="text-xs font-mono text-on-surface-variant bg-surface-bright/50 px-2 py-0.5 rounded">{exp.period}</span>
                </div>
                <div className={cn("text-xs font-bold uppercase tracking-widest mb-3", exp.active ? "text-secondary" : "text-on-surface-variant opacity-60")}>
                  {exp.role}
                </div>
                <p className="text-sm text-on-surface-variant opacity-80 leading-relaxed">
                  {exp.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Dynamics */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="md:col-span-12 bg-surface-container rounded-2xl border border-outline-variant/30 p-8"
        >
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <Activity className="text-primary w-6 h-6" />
              <h3 className="text-xl font-bold text-on-surface">Recent Dynamics</h3>
            </div>
            <button className="text-xs font-bold text-primary hover:underline tracking-widest uppercase">View All Logs</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {profile.recentDynamics.map((log, i) => (
              <motion.div 
                key={log.id}
                whileHover={{ y: -4 }}
                className="bg-surface-container-low border border-outline-variant/20 p-6 rounded-2xl hover:border-outline-variant transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-surface-bright rounded-lg text-on-surface-variant group-hover:text-primary transition-colors">
                    {log.type === 'commit' && <GitCommit size={16} />}
                    {log.type === 'doc' && <FileCode size={16} />}
                    {log.type === 'session' && <MessagesSquare size={16} />}
                  </div>
                  <span className="font-mono text-[10px] text-on-surface-variant opacity-60">{log.time}</span>
                </div>
                <h4 className="font-bold text-on-surface mb-3 group-hover:text-primary transition-colors leading-tight">{log.title}</h4>
                <p className="text-sm text-on-surface-variant line-clamp-2 opacity-70 leading-relaxed">
                  {log.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
