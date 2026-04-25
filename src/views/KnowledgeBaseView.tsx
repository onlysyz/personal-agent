import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Upload,
  FileText,
  Trash2,
  Search,
  Loader2,
  BookOpen,
  File,
  ScrollText,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ShieldCheck,
  GitBranch,
  Link,
} from "lucide-react";
import {
  fetchKnowledgeStatus,
  uploadDocument,
  deleteDocument,
  queryKnowledge,
  fetchKnowledgeDocuments,
  lintKnowledge,
  KnowledgeStatus,
  KnowledgeDocument,
  LintResult,
} from "../services/api";

export default function KnowledgeBaseView() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<KnowledgeStatus | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isLinting, setIsLinting] = useState(false);
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<string>("");
  const [lintResult, setLintResult] = useState<LintResult | null>(null);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useState<HTMLInputElement | null>(null)[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setUploadMessage(null);
    setLintResult(null);
    try {
      const [statusData, docsData] = await Promise.all([
        fetchKnowledgeStatus(),
        fetchKnowledgeDocuments(),
      ]);
      setStatus(statusData);
      setDocuments(docsData);
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);
    try {
      const result = await uploadDocument(file);
      setUploadMessage({
        type: "success",
        text: result.message,
      });
      await loadData();
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await deleteDocument(id);
      await loadData();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    setIsQuerying(true);
    try {
      const result = await queryKnowledge(query);
      setQueryResult(result.answer);
    } catch (err) {
      console.error("Query failed:", err);
      setQueryResult("Query failed. Please try again.");
    } finally {
      setIsQuerying(false);
    }
  };

  const handleLint = async () => {
    setIsLinting(true);
    setLintResult(null);
    try {
      const result = await lintKnowledge();
      setLintResult(result);
    } catch (err) {
      console.error("Lint failed:", err);
    } finally {
      setIsLinting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] gap-8">
      <header className="flex items-center justify-between pb-4 border-b border-outline-variant/30 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">{t("knowledge.title")}</h1>
          <p className="text-sm text-on-surface-variant mt-1 opacity-70">
            {t("knowledge.subtitle")}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-2.5 rounded-xl hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0 overflow-y-auto pr-2 pb-4 scrollbar-hide">
          {/* Upload Section */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              {t("knowledge.upload")}
            </h2>

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-outline-variant/50 rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-surface-container">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                ) : (
                  <Upload className="w-8 h-8 text-on-surface-variant mb-2" />
                )}
                <p className="text-sm text-on-surface-variant">
                  {isUploading ? t("knowledge.uploading") : t("knowledge.dropFiles")}
                </p>
                <p className="text-xs text-on-surface-variant/60 mt-1">
                  PDF, MD, TXT
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.md,.txt,text/plain,text/markdown,application/pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Raw Sources */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
              <File className="w-5 h-5 text-primary" />
              {t("knowledge.rawSources")} ({documents.length})
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-4">
                {t("knowledge.noDocuments")}
              </p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container-highest/40 transition-colors group"
                  >
                    <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-error-container text-error transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Wiki Stats */}
          {status && (
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                {t("knowledge.wikiStats")}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{status.rawDocuments}</p>
                  <p className="text-xs text-on-surface-variant">Documents</p>
                </div>
                <div className="bg-surface-container rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{status.wikiPages}</p>
                  <p className="text-xs text-on-surface-variant">Wiki Pages</p>
                </div>
                <div className="bg-surface-container rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-secondary">{status.chunks}</p>
                  <p className="text-xs text-on-surface-variant">Chunks</p>
                </div>
                <div className="bg-surface-container rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-secondary">{status.categories?.length || 0}</p>
                  <p className="text-xs text-on-surface-variant">Categories</p>
                </div>
              </div>

              {/* Lint Button */}
              <button
                onClick={handleLint}
                disabled={isLinting || status.wikiPages === 0}
                className="w-full mt-4 py-2.5 bg-surface-container-high rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLinting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                {t("knowledge.lint") || "Health Check"}
              </button>
            </div>
          )}

          {/* Lint Results */}
          {lintResult && (
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-secondary" />
                Health Check
              </h2>
              <div className="space-y-3 text-sm">
                {lintResult.orphanPages.length === 0 && lintResult.missingLinks.length === 0 ? (
                  <div className="flex items-center gap-2 text-secondary">
                    <CheckCircle2 className="w-4 h-4" />
                    All checks passed!
                  </div>
                ) : (
                  <>
                    {lintResult.orphanPages.length > 0 && (
                      <div className="flex items-start gap-2 text-warning">
                        <GitBranch className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-warning">Orphan Pages ({lintResult.orphanPages.length})</p>
                          <p className="text-xs text-on-surface-variant">{lintResult.orphanPages.join(", ")}</p>
                        </div>
                      </div>
                    )}
                    {lintResult.missingLinks.length > 0 && (
                      <div className="flex items-start gap-2 text-warning">
                        <Link className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-warning">Broken Links ({lintResult.missingLinks.length})</p>
                          <p className="text-xs text-on-surface-variant">{lintResult.missingLinks.join(", ")}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Upload Message */}
          {uploadMessage && (
            <div className={`rounded-xl p-4 flex items-center gap-3 ${
              uploadMessage.type === "success"
                ? "bg-secondary-container/30 border border-secondary/30"
                : "bg-error-container/30 border border-error/30"
            }`}>
              {uploadMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-error shrink-0" />
              )}
              <p className={`text-sm ${
                uploadMessage.type === "success" ? "text-on-secondary-container" : "text-on-error-container"
              }`}>
                {uploadMessage.text}
              </p>
            </div>
          )}
        </aside>

        {/* Main content */}
        <section className="flex-1 flex flex-col bg-surface-container-lowest border border-outline-variant/20 rounded-2xl overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Query Section */}
                <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    {t("knowledge.queryWiki")}
                  </h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                      placeholder={t("knowledge.queryPlaceholder")}
                      className="flex-1 bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/50 outline-none"
                    />
                    <button
                      onClick={handleQuery}
                      disabled={isQuerying || !query.trim()}
                      className="px-6 bg-primary text-on-primary rounded-xl hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isQuerying ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <MessageSquare className="w-5 h-5" />
                      )}
                      {t("knowledge.ask")}
                    </button>
                  </div>
                </div>

                {/* Answer Section */}
                {queryResult && (
                  <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                      <ScrollText className="w-5 h-5 text-secondary" />
                      {t("knowledge.answer")}
                    </h3>
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-on-surface leading-relaxed">
                        {queryResult}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!queryResult && (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
                      <BookOpen className="w-8 h-8 text-on-surface-variant/50" />
                    </div>
                    <h3 className="text-lg font-semibold text-on-surface mb-2">
                      {t("knowledge.emptyTitle")}
                    </h3>
                    <p className="text-sm text-on-surface-variant max-w-md">
                      {t("knowledge.emptyDesc")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
