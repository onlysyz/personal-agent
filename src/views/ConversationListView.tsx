import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Clock, ArrowLeft, Search, X, Trash2, RefreshCw } from 'lucide-react';
import { fetchConversationsList, clearConversation, ConversationListItem } from '../services/api';

export default function ConversationListView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ConversationListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = () => {
    if (refreshing) return;
    setRefreshing(true);
    fetchConversationsList()
      .then(data => {
        setConversations(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load conversations:', err);
      })
      .finally(() => {
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const filteredConversations = conversations.filter(conv => {
    const query = searchQuery.toLowerCase();
    const title = (conv.title || '未命名对话').toLowerCase();
    return title.includes(query);
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await clearConversation(deleteTarget.threadId);
      setConversations(prev => prev.filter(c => c.threadId !== deleteTarget.threadId));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <header className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-surface-container animate-pulse" />
          <div className="space-y-2">
            <div className="w-32 h-6 bg-surface-container rounded animate-pulse" />
            <div className="w-20 h-4 bg-surface-container rounded animate-pulse" />
          </div>
        </header>

        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-surface-container rounded-xl shrink-0">
                  <div className="w-5 h-5 bg-surface-container-high rounded animate-pulse" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="w-3/4 h-5 bg-surface-container rounded animate-pulse" />
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-3 bg-surface-container rounded animate-pulse" />
                    <div className="w-16 h-3 bg-surface-container rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <header className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-surface-container transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-on-surface">对话历史</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {filteredConversations.length} / {conversations.length} 个对话
          </p>
        </div>
        <button
          onClick={loadConversations}
          disabled={refreshing}
          className="p-2 rounded-full hover:bg-surface-container transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
        <input
          type="text"
          placeholder="搜索对话..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-surface-container border border-outline-variant/30 rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-container-high rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-container rounded-full mb-4">
              <Search className="w-8 h-8 text-on-surface-variant" />
            </div>
            <h3 className="text-lg font-medium text-on-surface mb-2">
              {searchQuery ? '未找到匹配的对话' : '暂无对话记录'}
            </h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {searchQuery ? '尝试其他关键词' : '开始一个新对话，它会在这里显示'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-surface-container text-on-surface rounded-lg text-sm font-medium hover:bg-surface-container-high transition-all"
              >
                清除搜索
              </button>
            ) : (
              <button
                onClick={() => navigate('/decision-maker')}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:brightness-110 transition-all"
              >
                开始新对话
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map(conv => (
            <div
              key={conv.threadId}
              className="group relative bg-surface-container-low border border-outline-variant/20 rounded-2xl p-4 hover:border-outline-variant/50 transition-colors"
            >
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(`/decision?thread=${conv.threadId}`)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-surface-container rounded-xl shrink-0">
                    <MessageSquare className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-on-surface truncate">
                      {conv.title || '未命名对话'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(conv.created_at)}
                      </span>
                      <span>{conv.messageCount} 条消息</span>
                      {conv.mode && (
                        <span className="px-1.5 py-0.5 bg-surface-container rounded">
                          {conv.mode === 'decision' ? '决策' : '助手'}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="mt-2 text-sm text-on-surface-variant truncate">
                        {conv.lastMessage.slice(0, 80)}{conv.lastMessage.length > 80 ? '...' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </motion.button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(conv);
                }}
                className="absolute top-3 right-3 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-error-container text-on-surface-variant hover:text-error transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setDeleteTarget(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-surface-container-low border border-outline-variant rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-on-surface mb-2">删除对话</h3>
              <p className="text-sm text-on-surface-variant mb-6">
                确定要删除「{deleteTarget.title || '未命名对话'}」吗？此操作无法撤销。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-surface-container text-on-surface rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-error text-on-error rounded-lg text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {deleting ? '删除中...' : '删除'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
