import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle, Globe, Key, Cpu, AlertCircle, Plug, Tag, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchKnowledgeTags, deleteTag, renameTag, TagInfo } from "../services/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EmbeddingConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [embeddingApiKey, setEmbeddingApiKey] = useState("");
  const [embeddingBaseUrl, setEmbeddingBaseUrl] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"success" | "error" | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Tag management state
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isManagingTags, setIsManagingTags] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  // Reset test status when inputs change
  useEffect(() => {
    if (testStatus) {
      setTestStatus(null);
    }
  }, [apiKey, baseUrl, model]);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    setTestStatus(null);
    try {
      const [settingsRes, tagsRes] = await Promise.all([
        fetch("/api/settings"),
        fetchKnowledgeTags(),
      ]);
      const data = await settingsRes.json();
      if (data.code === 0) {
        setApiKey(data.data.apiKey || "");
        setBaseUrl(data.data.baseUrl || "");
        setModel(data.data.model || "");
        // Load embedding config
        if (data.data.embedding) {
          setEmbeddingApiKey(data.data.embedding.apiKey || "");
          setEmbeddingBaseUrl(data.data.embedding.baseUrl || "");
          setEmbeddingModel(data.data.embedding.model || "text-embedding-3-small");
        } else {
          setEmbeddingApiKey("");
          setEmbeddingBaseUrl("");
          setEmbeddingModel("text-embedding-3-small");
        }
      }
      setTags(tagsRes);
    } catch (err) {
      setError("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!model.trim()) {
      setTestStatus("error");
      setTestMessage("Model is required");
      return;
    }

    setIsTesting(true);
    setTestStatus(null);
    setTestMessage("");
    try {
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          baseUrl,
          model,
        }),
      });
      const data = await res.json();
      if (data.data?.success) {
        setTestStatus("success");
        setTestMessage(data.data.message || "Connection successful!");
      } else {
        setTestStatus("error");
        setTestMessage(data.data?.message || "Connection failed");
      }
    } catch (err) {
      setTestStatus("error");
      setTestMessage("Connection failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    if (!confirm(`Delete tag "${tagName}" from all documents?`)) return;
    setIsManagingTags(true);
    try {
      await deleteTag(tagName);
      setTags(tags.filter((t) => t.name !== tagName));
    } catch (err) {
      setError(`Failed to delete tag: ${err}`);
    } finally {
      setIsManagingTags(false);
    }
  };

  const handleRenameTag = async (oldTagName: string) => {
    if (!editingValue.trim() || editingValue === oldTagName) {
      setEditingTag(null);
      return;
    }
    if (!confirm(`Rename tag "${oldTagName}" to "${editingValue.trim()}"? This will update all documents with this tag.`)) {
      setEditingTag(null);
      return;
    }
    setIsManagingTags(true);
    try {
      await renameTag(oldTagName, editingValue.trim());
      setTags(tags.map((t) => (t.name === oldTagName ? { ...t, name: editingValue.trim() } : t)));
      setEditingTag(null);
    } catch (err) {
      setError(`Failed to rename tag: ${err}`);
    } finally {
      setIsManagingTags(false);
    }
  };

  const handleSave = async () => {
    if (!model.trim()) {
      setError("Model is required");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: baseUrl.includes("ollama") ? "ollama" : "openai",
          apiKey,
          baseUrl,
          model,
          embedding: {
            provider: embeddingBaseUrl.includes("ollama") ? "ollama" : "openai",
            apiKey: embeddingApiKey || "ollama",
            baseUrl: embeddingBaseUrl,
            model: embeddingModel || "text-embedding-3-small",
          },
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 1500);
      } else {
        setError(data.error || "Failed to save settings");
      }
    } catch (err) {
      setError("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-low rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              testStatus === "success" ? "bg-secondary/10" :
              testStatus === "error" ? "bg-error/10" : "bg-primary/10"
            }`}>
              <Cpu className={`w-5 h-5 ${
                testStatus === "success" ? "text-secondary" :
                testStatus === "error" ? "text-error" : "text-primary"
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-surface">{t("settings.title")}</h2>
              <p className="text-xs text-on-surface-variant">
                {testStatus === "success" ? "Connected" :
                 testStatus === "error" ? "Connection failed" : "API Configuration"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
              {/* API Key */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-2">
                  <Key className="w-4 h-4 text-on-surface-variant" />
                  {t("settings.apiKey")}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t("settings.apiKeyPlaceholder")}
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              {/* Base URL */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-2">
                  <Globe className="w-4 h-4 text-on-surface-variant" />
                  {t("settings.baseUrl")}
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              {/* Model */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-2">
                  <Cpu className="w-4 h-4 text-on-surface-variant" />
                  {t("settings.model")}
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o, claude-3-5-sonnet-latest, ..."
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              {/* Embedding Section */}
              <div className="border-t border-outline-variant/30 pt-5 mt-2">
                <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4 text-on-surface-variant" />
                  Embedding Settings (for Knowledge Base)
                </h3>
                <p className="text-xs text-on-surface-variant mb-4">
                  Separate API for embeddings (Ollama local or OpenAI)
                </p>

                {/* Embedding API Key */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-2">
                    <Key className="w-4 h-4 text-on-surface-variant" />
                    Embedding API Key
                  </label>
                  <input
                    type="password"
                    value={embeddingApiKey}
                    onChange={(e) => setEmbeddingApiKey(e.target.value)}
                    placeholder="OpenAI API key or leave empty for Ollama"
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Embedding Base URL */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-2">
                    <Globe className="w-4 h-4 text-on-surface-variant" />
                    Embedding Base URL
                  </label>
                  <input
                    type="text"
                    value={embeddingBaseUrl}
                    onChange={(e) => setEmbeddingBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434/v1 for Ollama"
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Embedding Model */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-2">
                    <Cpu className="w-4 h-4 text-on-surface-variant" />
                    Embedding Model
                  </label>
                  <input
                    type="text"
                    value={embeddingModel}
                    onChange={(e) => setEmbeddingModel(e.target.value)}
                    placeholder="nomic-embed-text for Ollama"
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Tag Management Section */}
              <div className="border-t border-outline-variant/30 pt-5 mt-2">
                <button
                  onClick={() => setTagsExpanded(!tagsExpanded)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-on-surface mb-3"
                >
                  <span className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-on-surface-variant" />
                    Tag Management ({tags.length} tags)
                  </span>
                  {tagsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {tagsExpanded && (
                  <div className="space-y-2">
                    {tags.length === 0 ? (
                      <p className="text-xs text-on-surface-variant py-2">No tags yet. Upload documents with tags to see them here.</p>
                    ) : (
                      <ul className="space-y-1 max-h-48 overflow-y-auto">
                        {tags.map((tag) => (
                          <li key={tag.name} className="flex items-center gap-2 p-2 bg-surface-container rounded-lg">
                            {editingTag === tag.name ? (
                              <>
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && handleRenameTag(tag.name)}
                                  className="flex-1 bg-surface border border-outline-variant/30 rounded px-2 py-1 text-sm text-on-surface"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleRenameTag(tag.name)}
                                  disabled={isManagingTags}
                                  className="p-1.5 text-secondary hover:bg-secondary-container rounded"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingTag(null)}
                                  className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-sm text-on-surface truncate">
                                  {tag.name}
                                  {tag.inUse && (
                                    <span className="ml-2 text-xs text-on-surface-variant/50">({tag.documentCount} docs)</span>
                                  )}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingTag(tag.name);
                                    setEditingValue(tag.name);
                                  }}
                                  className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTag(tag.name)}
                                  disabled={isManagingTags || tag.inUse}
                                  title={tag.inUse ? "Cannot delete tag that is in use by documents" : "Delete tag"}
                                  className={`p-1.5 rounded ${
                                    tag.inUse
                                      ? "text-on-surface-variant/30 cursor-not-allowed"
                                      : "text-error/70 hover:bg-error-container"
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Test Button */}
              <button
                onClick={handleTest}
                disabled={isTesting || !model.trim()}
                className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                  testStatus === "success" ? "bg-secondary/10 text-secondary border border-secondary/30" :
                  testStatus === "error" ? "bg-error/10 text-error border border-error/30" :
                  "bg-surface-container text-on-surface border border-outline-variant/30 hover:border-primary/50"
                } disabled:opacity-50`}
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : testStatus === "success" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : testStatus === "error" ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Plug className="w-4 h-4" />
                )}
                {isTesting ? "Testing..." :
                 testStatus === "success" ? "Connected" :
                 testStatus === "error" ? "Failed - Click to retry" :
                 "Test Connection"}
              </button>

              {/* Test Message */}
              {testMessage && (
                <p className={`text-xs text-center ${testStatus === "success" ? "text-secondary" : "text-error"}`}>
                  {testMessage}
                </p>
              )}
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-error-container/20 border border-error/30 rounded-xl p-4">
              <p className="text-on-error-container text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-secondary-container/20 border border-secondary/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-secondary" />
              <p className="text-on-secondary-container text-sm">{t("settings.saved")}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant/30 bg-surface-container/30">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-sm font-medium"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading || !model.trim()}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
