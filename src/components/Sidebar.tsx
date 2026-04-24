import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  BrainCircuit, 
  UserCircle, 
  Database, 
  Rocket, 
  BookOpen, 
  LifeBuoy,
  Cpu
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar() {
  const navItems = [
    { name: 'Dashboard', icon: BarChart3, path: '/' },
    { name: 'Decision Maker', icon: BrainCircuit, path: '/decision-maker' },
    { name: 'Public Profile', icon: UserCircle, path: '/public-profile' },
    { name: 'Data Editor', icon: Database, path: '/data-editor' },
  ];

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 border-r border-outline-variant bg-surface-container-low py-6 z-40">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Cpu className="text-primary w-6 h-6" />
        </div>
        <span className="text-xl font-black text-primary tracking-tight">Core Agent</span>
      </div>

      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container border border-outline-variant/30">
          <div className="relative">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnFP-FfIVRtt-UxLzmwnjPCDwAQOTYSv758EoDpVzm5MEt1l7YYBBWWrUUwRwSP8Hbx9X-Br8YilZqm3FPiYCAMCFqnDw1yhkMmg9cbH6I4gJIwpFS6uRFL4Z29H1OHWUDfDwHMyrSO8lHVha7moYNRvXp3bNubzjxRxf-QNnD6DcHZNrCJGOXOJLjbFbQCjdFrtzBD5dWukBK0815HRDZ8WEfkF_WAzh8zp-PNgMnM4r0CVaDPJ3mcfH1u6rbzJijOc_dCaoS3Djz" 
              alt="Avatar" 
              className="w-10 h-10 rounded-full border border-outline-variant/50 object-cover"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-surface-container animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-on-surface">Local Instance</span>
            <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">Active</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 py-3 px-4 rounded-lg font-medium transition-all duration-200",
              isActive 
                ? "bg-primary/10 text-primary border-r-2 border-primary" 
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 mb-6">
        <button className="w-full bg-primary text-on-primary text-xs font-bold uppercase tracking-widest py-3 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 group">
          <Rocket className="w-4 h-4 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
          Deploy Agent
        </button>
      </div>

      <div className="px-4 border-t border-outline-variant/30 pt-4 space-y-1">
        <a href="#" className="flex items-center gap-3 text-on-surface-variant py-2 px-4 rounded-lg hover:bg-surface-container hover:text-on-surface text-sm transition-colors">
          <BookOpen className="w-4 h-4" />
          Documentation
        </a>
        <a href="#" className="flex items-center gap-3 text-on-surface-variant py-2 px-4 rounded-lg hover:bg-surface-container hover:text-on-surface text-sm transition-colors">
          <LifeBuoy className="w-4 h-4" />
          Support
        </a>
      </div>
    </aside>
  );
}
