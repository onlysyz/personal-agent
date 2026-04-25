import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { DocumentContent } from '../services/api';

interface DocumentPreviewModalProps {
  document: DocumentContent | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function DocumentPreviewModal({ document, isLoading, onClose }: DocumentPreviewModalProps) {
  return (
    <AnimatePresence>
      {document && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-surface-container-low rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-secondary" />
                <h3 className="text-lg font-semibold text-on-surface truncate">{document.filename}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="markdown-content prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !match && !className;
                      return isInline ? (
                        <code className="px-1.5 py-0.5 bg-surface-container-high rounded text-sm text-secondary" {...props}>
                          {children}
                        </code>
                      ) : (
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match ? match[1] : 'text'}
                          PreTag="div"
                          className="rounded-lg !bg-surface-container-high !my-4"
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      );
                    },
                    h1: ({ children }) => <h1 className="text-2xl font-bold text-on-surface mb-4 mt-6 first:mt-0">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-bold text-on-surface mb-3 mt-5">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-semibold text-on-surface mb-2 mt-4">{children}</h3>,
                    p: ({ children }) => <p className="text-on-surface leading-relaxed mb-4">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside text-on-surface mb-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside text-on-surface mb-4 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-on-surface">{children}</li>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-secondary pl-4 italic text-on-surface-variant mb-4">{children}</blockquote>,
                    a: ({ href, children }) => <a href={href} className="text-secondary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                    strong: ({ children }) => <strong className="font-semibold text-on-surface">{children}</strong>,
                    hr: () => <hr className="border-outline-variant my-6" />,
                  }}
                >
                  {document.content}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-surface-container-low rounded-2xl shadow-2xl p-8 flex items-center justify-center"
          >
            <Loader2 className="w-8 h-8 text-secondary animate-spin" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}