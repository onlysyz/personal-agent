import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
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
  fetchKnowledgeTags,
  lintKnowledge,
  batchUpdateDocumentTags,
  KnowledgeStatus,
  KnowledgeDocument,
  LintResult,
} from "../services/api";
import TagInput from "../components/TagInput";

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
  const [uploadTags, setUploadTags] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchTagModal, setShowBatchTagModal] = useState(false);
  const [batchTagsToAdd, setBatchTagsToAdd] = useState("");
  const [batchTagsToRemove, setBatchTagsToRemove] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [docTagFilter, setDocTagFilter] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Ctrl+K to focus search
  useKeyboardShortcut({
    key: 'k',
    ctrlKey: true,
    action: () => searchInputRef.current?.focus(),
  });

  // Ctrl+U to trigger file upload
  useKeyboardShortcut({
    key: 'u',
    ctrlKey: true,
    action: () => fileInputRef.current?.click(),
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setUploadMessage(null);
    setLintResult(null);
    try {
      const [statusData, docsData, tagsData] = await Promise.all([
        fetchKnowledgeStatus(),
        fetchKnowledgeDocuments(),
        fetchKnowledgeTags(),
      ]);
      setStatus(statusData);
      setDocuments(docsData);
      setAllTags(tagsData.map((t: { name: string }) => t.name));
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered documents based on search and tag filter
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = docSearch === "" ||
      doc.filename.toLowerCase().includes(docSearch.toLowerCase());
    const matchesTag = !docTagFilter ||
      (doc.tags && doc.tags.includes(docTagFilter));
    return matchesSearch && matchesTag;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);
    try {
      // Parse tags from comma-separated string
      const tags = uploadTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const result = await uploadDocument(file, tags);
      setUploadMessage({
        type: "success",
        text: result.message,
      });
      setUploadTags(""); // Clear tags after upload
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

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchTagUpdate = async () => {
    const tagsToAdd = batchTagsToAdd.split(",").map((t) => t.trim()).filter((t) => t);
    const tagsToRemove = batchTagsToRemove.split(",").map((t) => t.trim()).filter((t) => t);

    if (tagsToAdd.length === 0 && tagsToRemove.length === 0) {
      setShowBatchTagModal(false);
      return;
    }

    try {
      // For each selected doc, compute new tags
      const selectedDocs = documents.filter((d) => selectedIds.has(d.id));
      for (const doc of selectedDocs) {
        const currentTags = new Set(doc.tags || []);
        // Remove tags
        tagsToRemove.forEach((t) => currentTags.delete(t));
        // Add tags
        tagsToAdd.forEach((t) => currentTags.add(t));
        const newTags = Array.from(currentTags);
        await batchUpdateDocumentTags([doc.id], newTags);
      }
      setShowBatchTagModal(false);
      setBatchTagsToAdd("");
      setBatchTagsToRemove("");
      setSelectedIds(new Set());
      await loadData();
    } catch (err) {
      console.error("Batch tag update failed:", err);
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
            <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                {t("knowledge.upload")}
              </span>
              <span className="text-xs text-on-surface-variant/50 font-normal">Ctrl+U</span>
            </h2>

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-outline-variant/50 rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-surface-container" title="Ctrl+U to upload">
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
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.md,.txt,text/plain,text/markdown,application/pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
            {/* Tags input */}
            <div className="mt-3">
              <TagInput
                value={uploadTags}
                onChange={setUploadTags}
                suggestions={allTags}
                placeholder="Add tags..."
              />
            </div>
          </div>

          {/* Raw Sources */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
              <File className="w-5 h-5 text-primary" />
              {t("knowledge.rawSources")} ({filteredDocuments.length}{docSearch || docTagFilter ? ` of ${documents.length}` : ''})
            </h2>

            {/* Search and Filter */}
            <div className="mb-3 space-y-2">
              <input
                ref={searchInputRef}
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Search documents... (Ctrl+K)"
                className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-2 px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/50 outline-none"
              />
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setDocTagFilter(null)}
                    className={`text-xs px-2 py-1 rounded ${!docTagFilter ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setDocTagFilter(tag === docTagFilter ? null : tag)}
                      className={`text-xs px-2 py-1 rounded ${docTagFilter === tag ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Batch Action Bar */}
            {selectedIds.size > 0 && (
              <div className="mb-3 p-3 bg-secondary-container/30 border border-secondary/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-on-secondary-container">
                    {selectedIds.size} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedIds(new Set(filteredDocuments.map((d) => d.id)))}
                      className="text-xs px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-xs px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant"
                    >
                      None
                    </button>
                    <button
                      onClick={() => setShowBatchTagModal(true)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:brightness-110"
                    >
                      Edit Tags
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-4">
                {docSearch || docTagFilter ? "No matching documents" : t("knowledge.noDocuments")}
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredDocuments.map((doc) => (
                  <li
                    key={doc.id}
                    className={`flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container-highest/40 transition-colors group ${selectedIds.has(doc.id) ? 'bg-secondary-container/20 border border-secondary/30' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => toggleSelection(doc.id)}
                      className="w-4 h-4 mt-1 rounded border-outline-variant accent-primary cursor-pointer"
                    />
                    <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {formatDate(doc.uploadedAt)}
                      </p>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {doc.tags.map((tag) => (
                            <span key={tag} className="text-xs bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
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
                  {/* Tag filter */}
                  {status?.tags && status.tags.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      <span className="text-xs text-on-surface-variant py-2">Filter by tag:</span>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => { setQuery(""); }}
                          className="text-xs px-2 py-1 rounded bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                        >
                          All
                        </button>
                        {status.tags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setQuery(tag)}
                            className="text-xs px-2 py-1 rounded bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

      {/* Batch Tag Edit Modal */}
      {showBatchTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-on-surface mb-4">Edit Tags ({selectedIds.size} docs)</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Add Tags
                </label>
                <TagInput
                  value={batchTagsToAdd}
                  onChange={setBatchTagsToAdd}
                  suggestions={allTags}
                  placeholder="Add tags..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Remove Tags
                </label>
                <TagInput
                  value={batchTagsToRemove}
                  onChange={setBatchTagsToRemove}
                  suggestions={allTags}
                  placeholder="Remove tags..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBatchTagModal(false);
                  setBatchTagsToAdd("");
                  setBatchTagsToRemove("");
                }}
                className="flex-1 py-2.5 bg-surface-container-high rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchTagUpdate}
                className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:brightness-110 transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
