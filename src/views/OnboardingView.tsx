import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  MessageCircle,
  Upload,
  X,
  CheckCircle2,
  Loader2,
  Send,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import {
  parseResume,
  saveProfile,
  streamAgentChat,
} from "../services/api";
import { ProfileData, Skill, Experience } from "../types";

type Step = "method" | "upload" | "chat";

interface OnboardingMessage {
  role: "user" | "ai";
  content: string;
}

const INITIAL_PROFILE: ProfileData = {
  name: "",
  role: "",
  location: "",
  email: "",
  github: "",
  avatar: "/avatar.jpg",
  bio: "",
  skills: [],
  experiences: [],
  values: [],
  current_goals: "",
  decisions_context: "",
};

export default function OnboardingView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("method");
  const [profile, setProfile] = useState<Partial<ProfileData>>(INITIAL_PROFILE);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<OnboardingMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [collectedFields, setCollectedFields] = useState<Set<string>>(
    new Set()
  );
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const questions = [
    { field: "name", question: t("onboarding.askName") },
    { field: "role", question: t("onboarding.askRole") },
    { field: "location", question: t("onboarding.askLocation") },
    { field: "bio", question: t("onboarding.askBio") },
    { field: "skills", question: t("onboarding.askSkills") },
    { field: "current_goals", question: t("onboarding.askGoals") },
    { field: "values", question: t("onboarding.askValues") },
  ];

  const completedCount = collectedFields.size;
  const totalFields = questions.length;
  const progress = (completedCount / totalFields) * 100;

  const handleFileSelect = async (file: File) => {
    setUploadedFile(file);
    setParseError(null);

    if (
      file.type === "application/pdf" ||
      file.name.endsWith(".docx") ||
      file.name.endsWith(".md") ||
      file.type === "text/markdown"
    ) {
      setIsParsing(true);
      try {
        const parsed = await parseResume(file);
        setProfile((prev) => ({
          ...prev,
          ...parsed,
          skills: (parsed.skills || []).map((s) => ({
            name: s.name,
            value: s.value,
            color: (s.color as "primary" | "secondary") || "primary",
          })),
          experiences: (parsed.experiences || []).map((e) => ({
            ...e,
            visibility: (e.visibility as "public" | "private") || "public",
          })),
        }));
      } catch (err) {
        console.error("Parse error:", err);
        setParseError(
          err instanceof Error ? err.message : t("onboarding.parseFailed")
        );
      } finally {
        setIsParsing(false);
      }
    } else {
      setParseError(t("onboarding.unsupportedFileType"));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSave = async () => {
    if (!profile.name?.trim()) {
      setSaveError(t("onboarding.nameRequired"));
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const profileToSave: ProfileData = {
        name: profile.name || "",
        role: profile.role || "",
        location: profile.location || "",
        email: profile.email || "",
        github: profile.github || "",
        avatar: profile.avatar || "/avatar.jpg",
        bio: profile.bio || "",
        skills: (profile.skills || []) as Skill[],
        experiences: (profile.experiences || []) as Experience[],
        values: profile.values || [],
        current_goals: profile.current_goals || "",
        decisions_context: profile.decisions_context || "",
      };
      await saveProfile(profileToSave);
      navigate("/");
    } catch (err) {
      console.error("Save error:", err);
      setSaveError(
        err instanceof Error ? err.message : t("onboarding.saveFailed")
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Chat handlers
  const startChat = () => {
    setStep("chat");
    const greeting = t("onboarding.agentGreeting");
    setMessages([
      { role: "ai", content: greeting },
      { role: "ai", content: questions[0].question },
    ]);
    setCurrentQuestion(0);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatting) return;

    const userMessage = chatInput;
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsChatting(true);

    try {
      const { stream } = streamAgentChat(userMessage, { mode: "onboarding" });
      const reader = stream.getReader();

      let fullResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.type === "token" && value.content) {
          fullResponse += value.content;
        }
        if (value.type === "end") break;
      }

      if (fullResponse) {
        setMessages((prev) => [...prev, { role: "ai", content: fullResponse }]);
      }

      // Parse response to extract profile info
      const fieldName = questions[currentQuestion].field;
      const fieldValue = userMessage.trim();

      setProfile((prev) => {
        if (fieldName === "skills") {
          const skillNames = fieldValue
            .split(/[,，、]/)
            .map((s) => s.trim())
            .filter(Boolean);
          return {
            ...prev,
            skills: skillNames.map((name) => ({
              name,
              value: 0.7,
              color: "primary" as const,
            })),
          };
        } else if (fieldName === "values") {
          return {
            ...prev,
            values: fieldValue
              .split(/[,，、]/)
              .map((s) => s.trim())
              .filter(Boolean),
          };
        } else {
          return { ...prev, [fieldName]: fieldValue };
        }
      });

      setCollectedFields((prev) => new Set([...prev, fieldName]));

      // Move to next question or finish
      if (currentQuestion < questions.length - 1) {
        const nextQuestion = questions[currentQuestion + 1].question;
        setMessages((prev) => [...prev, { role: "ai", content: nextQuestion }]);
        setCurrentQuestion((prev) => prev + 1);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: t("onboarding.profileComplete") },
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: t("onboarding.chatError") },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleFieldEdit = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-surface-container-low flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4"
          >
            <Sparkles className="w-4 h-4" />
            {t("onboarding.welcome")}
          </motion.div>
          <h1 className="text-4xl font-bold text-on-surface mb-3">
            {t("onboarding.title")}
          </h1>
          <p className="text-on-surface-variant text-lg">
            {t("onboarding.subtitle")}
          </p>
        </div>

        {/* Progress bar for chat step */}
        <AnimatePresence mode="wait">
          {step === "chat" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="flex justify-between text-sm text-on-surface-variant mb-2">
                <span>{t("onboarding.progress")}</span>
                <span>
                  {completedCount}/{totalFields}
                </span>
              </div>
              <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Method Selection */}
        <AnimatePresence mode="wait">
          {step === "method" && (
            <motion.div
              key="method"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {/* Import Resume Card */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep("upload")}
                className="bg-surface-container-low border-2 border-outline-variant/30 hover:border-primary/50 rounded-3xl p-8 text-left transition-all group"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-on-surface mb-2">
                  {t("onboarding.importResume")}
                </h2>
                <p className="text-on-surface-variant">
                  {t("onboarding.importResumeDesc")}
                </p>
                <div className="mt-4 text-xs text-primary font-medium">
                  PDF, Word, Markdown
                </div>
              </motion.button>

              {/* Chat with Agent Card */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startChat}
                className="bg-surface-container-low border-2 border-outline-variant/30 hover:border-secondary/50 rounded-3xl p-8 text-left transition-all group"
              >
                <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
                  <MessageCircle className="w-7 h-7 text-secondary" />
                </div>
                <h2 className="text-xl font-bold text-on-surface mb-2">
                  {t("onboarding.chatWithAgent")}
                </h2>
                <p className="text-on-surface-variant">
                  {t("onboarding.chatWithAgentDesc")}
                </p>
                <div className="mt-4 text-xs text-secondary font-medium">
                  {t("onboarding.guidedExperience")}
                </div>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Step */}
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-surface-container-low rounded-3xl p-8"
            >
              {/* Back button */}
              <button
                onClick={() => setStep("method")}
                className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface mb-6 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {t("onboarding.back")}
              </button>

              {/* Dropzone */}
              {!uploadedFile && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-outline-variant/50 rounded-2xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.md"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    className="hidden"
                  />
                  <Upload className="w-12 h-12 text-on-surface-variant mx-auto mb-4" />
                  <p className="text-on-surface font-medium mb-2">
                    {t("onboarding.dragDrop")}
                  </p>
                  <p className="text-on-surface-variant text-sm">
                    {t("onboarding.or")}{" "}
                    <span className="text-primary">{t("onboarding.browse")}</span>
                  </p>
                  <p className="text-on-surface-variant/60 text-xs mt-4">
                    {t("onboarding.supportedFormats")}
                  </p>
                </div>
              )}

              {/* Parsing state */}
              {isParsing && (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-on-surface-variant">
                    {t("onboarding.parsing")}
                  </p>
                </div>
              )}

              {/* Parse error */}
              {parseError && (
                <div className="bg-error-container/20 border border-error/30 rounded-2xl p-6 mb-6">
                  <p className="text-on-error-container">{parseError}</p>
                  <button
                    onClick={() => {
                      setParseError(null);
                      setUploadedFile(null);
                    }}
                    className="mt-4 text-sm text-primary hover:underline"
                  >
                    {t("onboarding.tryAgain")}
                  </button>
                </div>
              )}

              {/* Preview/Edit form */}
              {(uploadedFile ||
                (profile.name && profile.name.trim() !== "") ||
                (profile.role && profile.role.trim() !== "")) &&
                !isParsing && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="text-on-surface font-medium">
                          {uploadedFile?.name}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedFile(null);
                          setProfile(INITIAL_PROFILE);
                        }}
                        className="text-on-surface-variant hover:text-on-surface"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                          {t("onboarding.name")}
                        </label>
                        <input
                          type="text"
                          value={profile.name || ""}
                          onChange={(e) =>
                            handleFieldEdit("name", e.target.value)
                          }
                          className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                          {t("onboarding.role")}
                        </label>
                        <input
                          type="text"
                          value={profile.role || ""}
                          onChange={(e) =>
                            handleFieldEdit("role", e.target.value)
                          }
                          className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                          {t("onboarding.location")}
                        </label>
                        <input
                          type="text"
                          value={profile.location || ""}
                          onChange={(e) =>
                            handleFieldEdit("location", e.target.value)
                          }
                          className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                          {t("onboarding.email")}
                        </label>
                        <input
                          type="email"
                          value={profile.email || ""}
                          onChange={(e) =>
                            handleFieldEdit("email", e.target.value)
                          }
                          className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-2">
                        {t("onboarding.bio")}
                      </label>
                      <textarea
                        value={profile.bio || ""}
                        onChange={(e) => handleFieldEdit("bio", e.target.value)}
                        rows={3}
                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                      />
                    </div>

                    {/* Skills */}
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-2">
                        {t("onboarding.skills")}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(profile.skills || []).map((skill, idx) => (
                          <span
                            key={idx}
                            className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                          >
                            {skill.name}
                            <button
                              onClick={() => {
                                setProfile((prev) => ({
                                  ...prev,
                                  skills: (prev.skills || []).filter(
                                    (_, i) => i !== idx
                                  ),
                                }));
                              }}
                              className="hover:text-primary/70"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Experiences */}
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-2">
                        {t("onboarding.experiences")}
                      </label>
                      <div className="space-y-3">
                        {(profile.experiences || []).map((exp, idx) => (
                          <div
                            key={idx}
                            className="bg-surface-container rounded-xl p-4 flex items-start justify-between"
                          >
                            <div>
                              <p className="font-medium text-on-surface">
                                {exp.role} @ {exp.company}
                              </p>
                              <p className="text-sm text-on-surface-variant">
                                {exp.period}
                              </p>
                              <p className="text-sm text-on-surface-variant mt-1">
                                {exp.description}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setProfile((prev) => ({
                                  ...prev,
                                  experiences: (prev.experiences || []).filter(
                                    (_, i) => i !== idx
                                  ),
                                }));
                              }}
                              className="text-on-surface-variant hover:text-on-surface"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Save error */}
                    {saveError && (
                      <div className="bg-error-container/20 border border-error/30 rounded-xl p-4">
                        <p className="text-on-error-container text-sm">
                          {saveError}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-4 pt-4">
                      <button
                        onClick={() => {
                          setUploadedFile(null);
                          setProfile(INITIAL_PROFILE);
                        }}
                        className="px-6 py-3 text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        {t("onboarding.cancel")}
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !profile.name}
                        className="bg-primary text-on-primary px-8 py-3 rounded-xl font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                      >
                        {isSaving && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {t("onboarding.saveProfile")}
                      </button>
                    </div>
                  </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Step */}
        <AnimatePresence mode="wait">
          {step === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-surface-container-low rounded-3xl overflow-hidden"
            >
              {/* Back button */}
              <div className="p-6 border-b border-outline-variant/20">
                <button
                  onClick={() => setStep("method")}
                  className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t("onboarding.back")}
                </button>
              </div>

              {/* Messages */}
              <div className="h-96 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                        msg.role === "user"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container text-on-surface"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {isChatting && (
                  <div className="flex justify-start">
                    <div className="bg-surface-container rounded-2xl px-5 py-3">
                      <Loader2 className="w-5 h-5 text-on-surface-variant animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-6 border-t border-outline-variant/20">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }}
                    placeholder={t("onboarding.chatPlaceholder")}
                    disabled={isChatting}
                    className="flex-1 bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={isChatting || !chatInput.trim()}
                    className="bg-primary text-on-primary px-6 py-3 rounded-xl font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>

                {/* Save button when done */}
                {collectedFields.size === questions.length && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !profile.name}
                      className="bg-primary text-on-primary px-8 py-3 rounded-xl font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      {isSaving && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {t("onboarding.saveProfile")}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
