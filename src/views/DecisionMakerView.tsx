import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  History, 
  UserSearch, 
  Edit3, 
  CheckCircle2, 
  Send, 
  Plus, 
  Minus, 
  Scale, 
  Copy,
  Terminal,
  Loader2
} from 'lucide-react';
import { INITIAL_DECISION_CONTEXT } from '../constants';
import { analyzeDecision } from '../services/gemini';
import { DecisionAnalysis } from '../types';

export default function DecisionMakerView() {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string | DecisionAnalysis }[]>([]);
  const context = INITIAL_DECISION_CONTEXT;

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    
    const userQuery = query;
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setQuery('');
    setIsAnalyzing(true);

    try {
      const analysis = await analyzeDecision(userQuery, context);
      setMessages(prev => [...prev, { role: 'ai', content: analysis }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error during analysis." }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] gap-8">
      <header className="flex items-center justify-between pb-4 border-b border-outline-variant/30 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Decision Maker</h1>
          <p className="text-sm text-on-surface-variant mt-1 opacity-70">Analyzing choices against personal context.</p>
        </div>
        <button className="bg-surface-container border border-outline-variant/30 hover:border-outline-variant/60 text-on-surface text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
          <History className="w-4 h-4" /> History
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
        {/* Context Panel */}
        <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0 overflow-y-auto pr-2 pb-4 scrollbar-hide">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2.5">
              <UserSearch className="text-primary w-5 h-5" /> Personal Context
            </h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Core Values</span>
                  <button className="text-secondary hover:brightness-110 transition-colors">
                    <Edit3 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {context.coreValues.map((val, i) => (
                    <span key={i} className="bg-primary/10 border border-primary/20 text-primary font-mono text-[10px] px-2.5 py-1 rounded-lg">
                      {val}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 block mb-2">Current Goal</span>
                <p className="text-sm text-on-surface leading-relaxed bg-surface-container-highest/30 p-4 rounded-xl border border-outline-variant/10">
                  {context.currentGoal}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 flex-1">
            <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2.5">
              <History className="text-on-surface-variant w-5 h-5" /> Recent Decisions
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-4 p-3 rounded-xl hover:bg-surface-container-highest/40 cursor-pointer transition-all border border-transparent hover:border-outline-variant/10 group">
                <CheckCircle2 className="text-secondary w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">Decline Startup Offer</span>
                  <span className="text-[10px] text-on-surface-variant opacity-60">Aligned with: Financial Stability</span>
                </div>
              </li>
              <li className="flex items-start gap-4 p-3 rounded-xl hover:bg-surface-container-highest/40 cursor-pointer transition-all border border-transparent hover:border-outline-variant/10 group">
                <CheckCircle2 className="text-primary w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">Start Cloud Cert</span>
                  <span className="text-[10px] text-on-surface-variant opacity-60">Aligned with: Continuous Learning</span>
                </div>
              </li>
            </ul>
          </div>
        </aside>

        {/* Chat / Decision Workspace */}
        <section className="flex-1 flex flex-col bg-surface-container-lowest border border-outline-variant/20 rounded-2xl overflow-hidden shadow-2xl relative">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 flex flex-col items-center scrollbar-hide">
            <div className="w-full max-w-[800px] space-y-8 pb-10">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn("flex flex-col w-full", msg.role === 'user' ? "items-end" : "items-start")}
                  >
                    {msg.role === 'user' ? (
                      <div className="bg-surface-container-high border-l-4 border-outline-variant/50 rounded-r-2xl rounded-bl-2xl p-5 max-w-[85%] text-on-surface text-[15px] leading-relaxed shadow-lg">
                        {typeof msg.content === 'string' ? msg.content : ''}
                      </div>
                    ) : (
                      <div className="w-full space-y-6">
                        <div className="bg-surface-container-low border-l-4 border-secondary rounded-r-2xl rounded-br-2xl p-6 shadow-xl relative overflow-hidden">
                          <div className="absolute -left-10 -top-10 w-24 h-24 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
                          
                          {typeof msg.content === 'string' ? (
                            <p className="text-on-surface leading-relaxed">{msg.content}</p>
                          ) : (
                            <div className="space-y-6">
                              <p className="text-[15px] text-on-surface leading-relaxed opacity-90">
                                {msg.content.summary}
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-surface-container border border-outline-variant/20 p-5 rounded-xl hover:border-secondary/30 transition-all group">
                                  <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary mb-4 flex items-center gap-1.5">
                                    <Plus size={14} className="group-hover:rotate-90 transition-transform" /> Pros
                                  </h3>
                                  <ul className="text-sm text-on-surface-variant space-y-2.5 list-disc pl-5">
                                    {msg.content.pros.map((pro, i) => <li key={i} className="leading-tight">{pro}</li>)}
                                  </ul>
                                </div>
                                <div className="bg-surface-container border border-outline-variant/20 p-5 rounded-xl hover:border-primary/30 transition-all group">
                                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-1.5">
                                    <Minus size={14} className="group-hover:rotate-180 transition-transform" /> Cons
                                  </h3>
                                  <ul className="text-sm text-on-surface-variant space-y-2.5 list-disc pl-5">
                                    {msg.content.cons.map((con, i) => <li key={i} className="leading-tight">{con}</li>)}
                                  </ul>
                                </div>
                              </div>

                              <div className="bg-surface-container border border-outline-variant/20 p-6 rounded-2xl flex items-center justify-between shadow-inner">
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1.5 opacity-60">Overall Alignment</span>
                                  <span className="text-2xl font-bold text-on-surface">Moderate ({msg.content.alignment}%)</span>
                                </div>
                                <div className="w-16 h-16 rounded-full border-4 border-secondary/20 flex items-center justify-center relative">
                                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                    <circle 
                                      className="text-secondary transition-all duration-1000" 
                                      cx="32" cy="32" fill="none" r="28" 
                                      stroke="currentColor" 
                                      strokeWidth="4"
                                      strokeDasharray={175}
                                      strokeDashoffset={175 - (175 * msg.content.alignment / 100)}
                                    />
                                  </svg>
                                  <Scale className="text-secondary w-6 h-6" />
                                </div>
                              </div>

                              <button className="flex items-center gap-2 text-xs font-mono text-on-surface-variant hover:text-on-surface transition-colors">
                                <Copy size={14} /> Copy Analysis
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-start w-full"
                >
                  <div className="bg-surface-container-low border-l-4 border-secondary/50 rounded-r-2xl rounded-br-2xl p-6 shadow-lg flex items-center gap-4">
                    <Loader2 className="w-5 h-5 text-secondary animate-spin" />
                    <span className="text-sm font-mono text-secondary animate-pulse uppercase tracking-widest">Crunching data context...</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-outline-variant/20 bg-surface-container-low shrink-0">
            <div className="max-w-[800px] mx-auto relative flex items-center">
              <textarea 
                className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 pl-5 pr-14 text-on-surface text-[15px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none placeholder-on-surface-variant/40 min-h-[56px] transition-all"
                placeholder="Ask follow-up or provide more details..." 
                rows={1}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAnalyze())}
              />
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !query.trim()}
                className="absolute right-3 p-2.5 bg-primary text-on-primary hover:brightness-110 disabled:opacity-30 disabled:grayscale transition-all rounded-xl shadow-lg"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="max-w-[800px] mx-auto mt-3 flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-[9px] text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/20">
                <Terminal size={10} /> Model: Gemini 3 Flash
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
