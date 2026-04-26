import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { MessageSquare, Clock, ArrowLeft } from 'lucide-react';
import { fetchConversationsList, ConversationListItem } from '../services/api';

export default function ConversationListView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversationsList()
      .then(data => {
        setConversations(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load conversations:', err);
        setLoading(false);
      });
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-on-surface-variant">加载中...</div>
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
        <div>
          <h1 className="text-2xl font-bold text-on-surface">对话历史</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {conversations.length} 个对话
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {conversations.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            暂无对话记录
          </div>
        ) : (
          conversations.map(conv => (
            <motion.button
              key={conv.threadId}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate(`/decision?thread=${conv.threadId}`)}
              className="w-full text-left bg-surface-container-low border border-outline-variant/20 rounded-2xl p-4 hover:border-outline-variant/50 transition-colors"
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
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
