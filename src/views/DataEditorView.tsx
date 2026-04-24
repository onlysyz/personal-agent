import React, { useState } from 'react';
import { 
  Database,
  Save,
  RotateCcw,
  Copy, 
  Unlock, 
  Lock, 
  Globe, 
  Search, 
  Plus, 
  X,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import { INITIAL_PROFILE } from '../constants';
import { motion } from 'motion/react';

export default function DataEditorView() {
  const [profile, setProfile] = useState(JSON.stringify(INITIAL_PROFILE, null, 2));

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Database className="text-secondary w-8 h-8" />
            <h1 className="text-3xl font-bold text-on-surface">Data Editor</h1>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/20">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Target:</span>
            <code className="text-xs font-mono text-primary">~/agents/core/profile.json</code>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-2.5 rounded-xl border border-outline-variant/30 text-on-surface font-bold text-xs uppercase tracking-widest hover:bg-surface-container-high transition-all flex items-center gap-2">
            <RotateCcw size={16} /> Discard Changes
          </button>
          <button className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-primary/10">
            <Save size={16} /> Commit to Disk
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Info Editor */}
        <section className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-8 space-y-8 flex flex-col shadow-xl">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="text-secondary w-5 h-5" />
              <h2 className="text-lg font-bold text-on-surface">Basic Info</h2>
            </div>
            <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container-highest/30 px-3 py-1.5 rounded-lg border border-outline-variant/20 hover:text-on-surface transition-all">
              <Globe size={12} /> All Public
            </button>
          </div>

          <div className="space-y-6">
            <FormField label="agent_name" value={INITIAL_PROFILE.name} type="text" />
            <FormField label="role" value={INITIAL_PROFILE.role} type="text" />
            <FormField label="bio_summary" value="I am a local-first intelligence, designed to assist with daily workflows, analyze private data securely..." type="textarea" isPrivate />
          </div>
        </section>

        {/* Skills & Capabilities Editor */}
        <section className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-8 space-y-8 flex flex-col shadow-xl">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Terminal className="text-primary w-5 h-5" />
              <h2 className="text-lg font-bold text-on-surface">Capabilities & Skills</h2>
            </div>
            <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container-highest/30 px-3 py-1.5 rounded-lg border border-outline-variant/20 hover:text-on-surface transition-all">
              <Globe size={12} /> All Public
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">skill_array</label>
                <Globe size={14} className="text-secondary" />
              </div>
              <div className="flex flex-wrap gap-2.5 mb-4 p-4 bg-surface-container-highest/20 border border-outline-variant/10 rounded-2xl min-h-[100px] items-start">
                {INITIAL_PROFILE.skills.map((skill, i) => (
                  <span key={i} className="flex items-center gap-2 font-mono text-[11px] text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 group">
                    {skill.name}
                    <X size={14} className="cursor-pointer hover:text-on-surface opacity-50 group-hover:opacity-100 transition-opacity" />
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  className="flex-1 bg-surface-container-highest/20 border border-outline-variant/20 rounded-xl px-4 py-2 text-sm text-on-surface placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary focus:border-primary transition-all" 
                  placeholder="Add a new skill..." 
                />
                <button className="bg-surface-container-highest/40 border border-outline-variant/20 px-4 py-2 rounded-xl text-on-surface hover:bg-surface-container transition-all">
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* JSON Source Editor */}
        <section className="lg:col-span-2 bg-surface-container-low border border-outline-variant/20 rounded-2xl p-8 space-y-6 flex flex-col shadow-xl">
           <div className="flex items-center gap-2.5 border-b border-outline-variant/10 pb-4">
              <FileCode className="text-primary w-5 h-5" />
              <h2 className="text-lg font-bold text-on-surface">Raw JSON Source</h2>
           </div>
           <div className="relative group">
              <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 bg-surface-container rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors">
                  <Copy size={16} />
                </button>
              </div>
              <textarea 
                className="w-full bg-surface-container-highest/10 border border-outline-variant/10 rounded-2xl p-6 font-mono text-xs leading-relaxed text-primary focus:ring-1 focus:ring-primary/30 min-h-[400px] transition-all"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                spellCheck={false}
              />
           </div>
        </section>
      </div>
    </div>
  );
}

function FormField({ label, value, type, isPrivate }: { label: string, value: string, type: 'text' | 'textarea', isPrivate?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">{label}</label>
        {isPrivate ? <Lock size={14} className="text-outline-variant" /> : <Globe size={14} className="text-secondary" />}
      </div>
      {type === 'text' ? (
        <input 
          type="text" 
          defaultValue={value}
          className="w-full bg-surface-container-highest/20 border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all" 
        />
      ) : (
        <textarea 
          defaultValue={value}
          rows={3}
          className="w-full bg-surface-container-highest/20 border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none" 
        />
      )}
    </div>
  );
}

import { FileCode } from 'lucide-react';
