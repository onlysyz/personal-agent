import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal,
  Trash2,
  Bot,
  Send,
  History,
  CircuitBoard,
  GraduationCap,
  Sparkles,
  Cloud,
  Code2,
  Loader2
} from 'lucide-react';
import { chatWithAgent, fetchProfile } from '../services/api';
import { ProfileData } from '../types';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function PublicProfileView() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [query, setQuery] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'model',
      parts: [{ text: "Hello. I am the digital representative. I have access to his complete resume and professional history. How can I assist you?" }]
    }
  ]);
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile().then(setProfile).catch(console.error);
  }, []);

  const handleChat = async (directQuery?: string) => {
    const q = directQuery || query;
    if (!q.trim() || isChatting) return;

    const newHistory: ChatMessage[] = [
      ...chatHistory,
      { role: 'user', parts: [{ text: q }] }
    ];
    setChatHistory(newHistory);
    setQuery('');
    setIsChatting(true);

    try {
      const { reply, threadId: newThreadId } = await chatWithAgent(q, {
        threadId: threadId || undefined,
        mode: 'profile',
      });
      if (!threadId) setThreadId(newThreadId);
      setChatHistory([...newHistory, { role: 'model', parts: [{ text: reply }] }]);
    } catch (error) {
      console.error(error);
      setChatHistory([...newHistory, { role: 'model', parts: [{ text: "抱歉，暂时无法回答。" }] }]);
    } finally {
      setIsChatting(false);
    }
  };

  const suggestions = [
    { label: "What are your recent project experiences?", icon: History },
    { label: "Describe a complex system you've designed.", icon: Code2 },
    { label: "Summarize your educational background.", icon: GraduationCap },
  ];

  const profileName = profile?.name || "Zhang San";
  const profileRole = profile?.role || "Full Stack Engineer";

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto gap-8">
      {/* Static Personal Info Header */}
      <header className="flex-shrink-0 flex flex-col md:flex-row items-center md:items-start gap-8 p-8 border border-outline-variant/20 rounded-3xl bg-surface-container-lowest/50 backdrop-blur-sm shadow-xl">
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all opacity-0 group-hover:opacity-100" />
          <img
            src={profile?.avatar || "https://via.placeholder.com/96"}
            alt="Profile Avatar"
            className="w-24 h-24 rounded-full border border-outline-variant/30 object-cover relative z-10"
          />
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-surface-container-lowest rounded-full flex items-center justify-center z-20">
            <div className="w-2.5 h-2.5 bg-secondary rounded-full animate-pulse shadow-[0_0_8px_rgba(93,230,255,0.6)]" />
          </div>
        </div>

        <div className="flex flex-col items-center md:items-start flex-grow text-center md:text-left gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-on-surface tracking-tight">{profileName}</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-secondary/20 bg-secondary/5 font-mono text-[9px] text-secondary uppercase tracking-[0.2em] font-bold">
              Agent Active
            </span>
          </div>
          <h2 className="text-lg font-medium text-on-surface-variant opacity-80 decoration-primary/30 underline-offset-4">
            {profileRole}
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl leading-relaxed opacity-70">
            Welcome to my interactive profile. This localized AI agent is trained on my professional history. Feel free to query my experience.
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
            {(profile?.skills || []).slice(0, 3).map((tag, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container rounded-lg border border-outline-variant/20 font-mono text-[10px] text-on-surface-variant group hover:border-primary/40 transition-colors">
                <Sparkles size={10} className="group-hover:text-primary transition-colors" />
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* AI Chat Window */}
      <section className="flex-grow flex flex-col border border-outline-variant/20 rounded-3xl bg-surface-container-low overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.3)] min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Bot className="text-secondary w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Interactive Session</span>
          </div>
          <button
            onClick={() => setChatHistory([chatHistory[0]])}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-2 hover:bg-surface-bright rounded-lg"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="flex-grow p-8 flex flex-col gap-8 overflow-y-auto scrollbar-hide">
          {chatHistory.map((chat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: chat.role === 'user' ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex flex-col gap-2 max-w-[90%]",
                chat.role === 'user' ? "self-end items-end" : "self-start items-start border-l-2 border-secondary/50 pl-6"
              )}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className={cn("text-[9px] font-black uppercase tracking-widest", chat.role === 'user' ? "text-primary" : "text-secondary")}>
                  {chat.role === 'user' ? 'Visitor' : `${profileName} [Agent]`}
                </span>
              </div>
              <div className={cn(
                "text-[15px] leading-relaxed p-4 rounded-2xl shadow-sm",
                chat.role === 'user' ? "bg-primary/10 text-on-surface rounded-tr-none" : "bg-surface-container-highest/20 text-on-surface rounded-tl-none"
              )}>
                {chat.parts[0].text}
              </div>
            </motion.div>
          ))}
          {isChatting && (
            <div className="flex flex-col gap-2 self-start items-start border-l-2 border-secondary/20 pl-6">
               <span className="text-[9px] font-black uppercase tracking-widest text-secondary opacity-50">Thinking...</span>
               <div className="h-4 w-32 bg-surface-container-highest/20 rounded-full" />
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex flex-wrap gap-2 px-8 py-4 bg-surface-container-lowest/80 border-t border-outline-variant/10">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleChat(s.label)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/30 bg-surface-container-low hover:border-secondary hover:bg-surface-container-high transition-all text-left group"
            >
              <s.icon className="text-secondary w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-on-surface">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-shrink-0 p-6 bg-surface-container border-t border-outline-variant/20">
          <div className="flex items-end gap-3 bg-surface-container-low border border-outline-variant/30 rounded-2xl p-2 focus-within:border-primary/50 transition-all shadow-inner">
            <textarea
              className="flex-grow bg-transparent border-none text-on-surface text-sm placeholder-outline/50 resize-none focus:ring-0 min-h-[44px] max-h-[120px] py-3 px-4 scrollbar-hide"
              placeholder="Query agent context..."
              rows={1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleChat())}
            />
            <button
              onClick={() => handleChat()}
              disabled={isChatting || !query.trim()}
              className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:brightness-110 disabled:opacity-30 transition-all shadow-lg"
            >
              {isChatting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <div className="mt-3 text-center">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-outline opacity-40">AI responses may vary.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function cn(...inputs: (string | false | undefined | null)[]) {
  return inputs.filter(Boolean).join(' ');
}