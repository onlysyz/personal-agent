import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
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
import { chatWithAgent, fetchDecisions, fetchProfile, DecisionRecord } from '../services/api';
import { DecisionAnalysis, ProfileData } from '../types';

export default function DecisionMakerView() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStage, setAnalyzingStage] = useState<string>('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string | DecisionAnalysis; error?: boolean }[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    fetchProfile()
      .then((data) => {
        if (mounted) setProfile(data);
      })
      .catch((err) => {
        console.error("Failed to fetch profile:", err);
        if (mounted) setError(t('common.error'));
      });

    fetchDecisions()
      .then((data) => {
        if (mounted) setDecisions(data);
      })
      .catch((err) => {
        console.error("Failed to fetch decisions:", err);
      });

    return () => {
      mounted = false;
    };
  }, [t]);

  const handleAnalyze = async () => {
    if (!query.trim()) return;

    const userQuery = query;
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setQuery('');
    setIsAnalyzing(true);
    setAnalyzingStage(t('decisionMaker.connecting'));

    try {
      setAnalyzingStage(t('decisionMaker.analyzingBackground'));
      const { reply, threadId: newThreadId } = await chatWithAgent(userQuery, {
        threadId: threadIdRef.current || undefined,
        mode: 'decision',
      });
      if (!threadIdRef.current) {
        threadIdRef.current = newThreadId;
      }

      setAnalyzingStage(t('decisionMaker.parsingResults'));

      try {
        const match = reply.match(/\{[\s\S]*?\}/);
        if (match) {
          const analysis = JSON.parse(match[0]) as DecisionAnalysis;
          setMessages(prev => [...prev, { role: 'ai', content: analysis }]);
        } else {
          setMessages(prev => [...prev, { role: 'ai', content: reply }]);
        }
      } catch {
        setMessages(prev => [...prev, { role: 'ai', content: reply }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: t('decisionMaker.networkError'),
        error: true
      }]);
    } finally {
      setIsAnalyzing(false);
      setAnalyzingStage('');
    }
  };

  const handleRetry = () => {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    if (lastUserMsg && typeof lastUserMsg.content === 'string') {
      const content = lastUserMsg.content;
      setMessages(prev => prev.filter(m => m !== lastUserMsg));
      setQuery(content);
    }
  };

  const context = profile ? {
    coreValues: profile.values || [],
    currentGoal: profile.current_goals || "",
  } : { coreValues: ["Autonomy", "Continuous Learning"], currentGoal: "Loading..." };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] gap-8">
      <header className="flex items-center justify-between pb-4 border-b border-outline-variant/30 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">{t('decisionMaker.title')}</h1>
          <p className="text-sm text-on-surface-variant mt-1 opacity-70">{t('decisionMaker.analyzingChoices')}</p>
        </div>
        {error && (
          <div className="bg-error-container text-on-error-container px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        <button onClick={() => setShowHistory(!showHistory)} className="bg-surface-container border border-outline-variant/30 hover:border-outline-variant/60 text-on-surface text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
          <History className="w-4 h-4" /> {t('dashboard.viewAllLogs')}
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
        <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0 overflow-y-auto pr-2 pb-4 scrollbar-hide">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2.5">
              <UserSearch className="text-primary w-5 h-5" /> {t('decisionMaker.personalContext')}
            </h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">{t('decisionMaker.coreValues')}</span>
                  <button className="text-secondary hover:brightness-110 transition-colors">
                    <Edit3 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(context.coreValues) ? context.coreValues.map((val: string, i: number) => (
                    <span key={i} className="bg-primary/10 border border-primary/20 text-primary font-mono text-[10px] px-2.5 py-1 rounded-lg">
                      {typeof val === 'string' ? val : JSON.stringify(val)}
                    </span>
                  )) : <span className="text-sm text-on-surface-variant">{t('decisionMaker.noDecisions')}</span>}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 block mb-2">{t('decisionMaker.currentGoal')}</span>
                <p className="text-sm text-on-surface leading-relaxed bg-surface-container-highest/30 p-4 rounded-xl border border-outline-variant/10">
                  {context.currentGoal}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 flex-1">
            <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2.5">
              <History className="text-on-surface-variant w-5 h-5" /> {t('decisionMaker.recentDecisions')}
            </h2>
            <ul className="space-y-4">
              {decisions.length === 0 && (
                <li className="text-sm text-on-surface-variant">{t('decisionMaker.noDecisions')}</li>
              )}
              {decisions.slice(0, 5).map((d) => {
                const alignmentValue = typeof d.analysis?.alignment === 'number'
                  ? d.analysis.alignment
                  : typeof d.analysis?.alignment === 'object' && d.analysis?.alignment !== null
                    ? Object.values(d.analysis.alignment as Record<string, number>)[0]
                    : 0;
                return (
                  <li key={d.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-surface-container-highest/40 cursor-pointer transition-all border border-transparent hover:border-outline-variant/10 group">
                    <CheckCircle2 className="text-secondary w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">{d.question}</span>
                      <span className="text-[10px] text-on-surface-variant opacity-60">Aligned: {alignmentValue}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

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
                    ) : msg.error ? (
                      <div className="w-full space-y-4">
                        <div className="bg-error-container/20 border-l-4 border-error rounded-r-2xl rounded-br-2xl p-6">
                          <p className="text-on-surface leading-relaxed">{typeof msg.content === 'string' ? msg.content : t('common.error')}</p>
                        </div>
                        <button
                          onClick={handleRetry}
                          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-4 py-2 rounded-lg hover:bg-surface-container"
                        >
                          <Send size={14} /> {t('decisionMaker.retryQuestion')}
                        </button>
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
                                    {Array.isArray(msg.content.pros) ? msg.content.pros.map((pro: string | Record<string, unknown>, i: number) => (
                                      <li key={i} className="leading-tight">
                                        {typeof pro === 'string' ? pro : JSON.stringify(pro)}
                                      </li>
                                    )) : <li className="leading-tight">{String(msg.content.pros)}</li>}
                                  </ul>
                                </div>
                                <div className="bg-surface-container border border-outline-variant/20 p-5 rounded-xl hover:border-primary/30 transition-all group">
                                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-1.5">
                                    <Minus size={14} className="group-hover:rotate-180 transition-transform" /> Cons
                                  </h3>
                                  <ul className="text-sm text-on-surface-variant space-y-2.5 list-disc pl-5">
                                    {Array.isArray(msg.content.cons) ? msg.content.cons.map((con: string | Record<string, unknown>, i: number) => (
                                      <li key={i} className="leading-tight">
                                        {typeof con === 'string' ? con : JSON.stringify(con)}
                                      </li>
                                    )) : <li className="leading-tight">{String(msg.content.cons)}</li>}
                                  </ul>
                                </div>
                              </div>

                              <div className="bg-surface-container border border-outline-variant/20 p-6 rounded-2xl flex items-center justify-between shadow-inner">
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1.5 opacity-60">Overall Alignment</span>
                                  <span className="text-2xl font-bold text-on-surface">
                                    {typeof msg.content.alignment === 'number'
                                      ? `${msg.content.alignment}%`
                                      : 'N/A'}
                                  </span>
                                </div>
                                <div className="w-16 h-16 rounded-full border-4 border-secondary/20 flex items-center justify-center relative">
                                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                    <circle
                                      className="text-secondary transition-all duration-1000"
                                      cx="32" cy="32" fill="none" r="28"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                      strokeDasharray={175}
                                      strokeDashoffset={175 - (175 * (typeof msg.content.alignment === 'number' ? msg.content.alignment : 50) / 100)}
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
                  <div className="bg-surface-container-low border-l-4 border-secondary/50 rounded-r-2xl rounded-br-2xl p-6 shadow-lg flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-secondary animate-spin" />
                      <span className="text-sm font-medium text-secondary animate-pulse">
                        {analyzingStage || t('decisionMaker.thinking')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="inline-block w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="inline-block w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="inline-block w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              {!isAnalyzing && messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-6">
                    <Scale className="w-8 h-8 text-secondary/50" />
                  </div>
                  <h3 className="text-lg font-semibold text-on-surface mb-2">{t('decisionMaker.startAnalysis')}</h3>
                  <p className="text-sm text-on-surface-variant max-w-md">
                    {t('decisionMaker.subtitle')}
                    <br />
                    {t('decisionMaker.examplePlaceholder')}
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-outline-variant/20 bg-surface-container-low shrink-0">
            <div className="max-w-[800px] mx-auto relative flex items-center">
              <textarea
                className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 pl-5 pr-14 text-on-surface text-[15px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none placeholder-on-surface-variant/40 min-h-[56px] transition-all"
                placeholder={t('decisionMaker.askFollowUp')}
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
                <Terminal size={10} /> {t('decisionMaker.model')}: Gemini 3 Flash
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