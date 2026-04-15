import React, { useEffect, useState } from 'react';
import {
  getConversations,
  getMessages,
  addMessage,
  markMessagesRead,
  type StoredConversation,
  type StoredMessage,
} from '../../../services/storage.service';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const BusinessChat: React.FC = () => {
  const user = useSelector((s: RootState) => s.auth.user);
  const token = localStorage.getItem('admin_token') ?? '';
  const businessId = token.startsWith('business-') ? token.replace('business-', '') : '';

  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [text, setText] = useState('');

  const loadConvs = () => {
    const all = getConversations().filter((c) => c.businessId === businessId);
    setConversations(all.sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')));
  };

  useEffect(() => {
    loadConvs();
  }, [businessId]);

  useEffect(() => {
    if (!selectedConvId) return;
    const msgs = getMessages(selectedConvId);
    setMessages(msgs);
    markMessagesRead(selectedConvId, 'business');
    loadConvs();
  }, [selectedConvId]);

  const handleSend = () => {
    if (!text.trim() || !selectedConvId || !user) return;
    addMessage(selectedConvId, {
      senderId: businessId,
      senderName: user.name,
      senderType: 'business',
      content: text.trim(),
      messageType: 'text',
    });
    setText('');
    setMessages(getMessages(selectedConvId));
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  if (!selectedConvId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-5">
        <h1 className="text-[20px] font-black mb-5" style={{ color: '#061b31' }}>הודעות</h1>
        {conversations.length === 0 ? (
          <div
            className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
            style={{ background: '#fff', border: '1px solid #e8ecf0' }}
          >
            <ChatBubbleLeftRightIcon className="w-12 h-12" style={{ color: '#e8ecf0' }} />
            <p className="font-bold text-[15px]" style={{ color: '#061b31' }}>עדיין אין שיחות עם שליחים</p>
            <p className="text-[12px]" style={{ color: '#8898aa' }}>
              כאשר שליח יקבל את המשלוח שלך, תוכל לשלוח לו הודעות כאן
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedConvId(c.id)}
                className="w-full text-right rounded-2xl p-4 flex items-center gap-3 transition-all hover:shadow-md"
                style={{ background: '#fff', border: '1px solid #e8ecf0' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
                >
                  {c.courierName[0] ?? 'ש'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-bold truncate" style={{ color: '#061b31' }}>
                      {c.courierName}
                    </p>
                    {c.unreadBusiness > 0 && (
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0"
                        style={{ background: '#ea2261' }}
                      >
                        {c.unreadBusiness}
                      </span>
                    )}
                  </div>
                  {c.lastMessage && (
                    <p className="text-[12px] truncate mt-0.5" style={{ color: '#8898aa' }}>
                      {c.lastMessage}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-w-lg mx-auto">
      {/* Chat header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: '#fff', borderBottom: '1px solid #e8ecf0' }}
      >
        <button
          onClick={() => setSelectedConvId(null)}
          className="text-[13px] font-semibold"
          style={{ color: '#533afd' }}
        >
          ← חזרה
        </button>
        <div className="flex-1">
          <p className="text-[14px] font-bold" style={{ color: '#061b31' }}>
            {selectedConv?.courierName ?? 'שליח'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ background: '#f6f9fc' }}
      >
        {messages.length === 0 && (
          <p className="text-center text-[13px] mt-8" style={{ color: '#8898aa' }}>
            אין הודעות עדיין. שלח הודעה ראשונה!
          </p>
        )}
        {messages.map((m) => {
          const isMine = m.senderType === 'business';
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className="max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[13px]"
                style={{
                  background: isMine ? 'linear-gradient(135deg, #533afd, #ea2261)' : '#fff',
                  color: isMine ? '#fff' : '#061b31',
                  border: isMine ? 'none' : '1px solid #e8ecf0',
                  borderTopRightRadius: isMine ? 4 : 16,
                  borderTopLeftRadius: isMine ? 16 : 4,
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: '#fff', borderTop: '1px solid #e8ecf0' }}
      >
        <input
          className="flex-1 rounded-2xl px-4 py-2.5 text-[13px] outline-none"
          style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', color: '#061b31', direction: 'rtl' }}
          placeholder="כתוב הודעה..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
        >
          <PaperAirplaneIcon className="w-4 h-4 text-white" style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>
    </div>
  );
};

export default BusinessChat;
