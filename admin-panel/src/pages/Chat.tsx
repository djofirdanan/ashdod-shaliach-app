import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ChevronRightIcon,
  BuildingStorefrontIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import * as storageService from '../services/storage.service';
import type { StoredConversation, StoredMessage } from '../services/storage.service';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

// ─── Time formatter ───────────────────────────────────────────
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'עכשיו';
  if (diffMin < 60) return `לפני ${diffMin} דק'`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'אתמול';
  return d.toLocaleDateString('he-IL');
}

function fullTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// ─── Avatar ───────────────────────────────────────────────────
const Avatar: React.FC<{ name: string; type: 'business' | 'courier' | 'admin'; size?: 'sm' | 'md' }> = ({ name, type, size = 'md' }) => {
  const colors = {
    business: { bg: '#533afd22', text: '#533afd', border: '1px solid #533afd40' },
    courier: { bg: '#ea226122', text: '#ea2261', border: '1px solid #ea226140' },
    admin: { bg: '#00b09022', text: '#00b090', border: '1px solid #00b09040' },
  };
  const { bg, text, border } = colors[type];
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ background: bg, color: text, border }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

// ─── Message Bubble ───────────────────────────────────────────
const MessageBubble: React.FC<{ msg: StoredMessage; isOwn?: boolean }> = ({ msg, isOwn }) => {
  if (msg.senderType === 'admin') {
    return (
      <div className="flex justify-center my-2">
        <div className="px-4 py-1.5 rounded-full text-xs font-medium" style={{ background: '#f0f3f6', color: '#6b7c93' }}>
          {msg.senderName}: {msg.content}
        </div>
      </div>
    );
  }

  const isBusiness = msg.senderType === 'business';
  return (
    <div className={`flex items-end gap-2 mb-3 ${isBusiness ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar name={msg.senderName} type={msg.senderType} size="sm" />
      <div className={`max-w-[70%] ${isBusiness ? 'items-end' : 'items-start'} flex flex-col`}>
        <span className="text-[11px] text-gray-400 mb-0.5 px-1">{msg.senderName}</span>
        <div
          className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={isBusiness
            ? { background: '#533afd', color: 'white', borderBottomRightRadius: '4px' }
            : { background: 'white', color: '#1a1a2e', border: '1px solid #e8ecf0', borderBottomLeftRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
          }
        >
          {msg.content}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isBusiness ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-400">{fullTime(msg.createdAt)}</span>
          {isBusiness && (
            <span className="text-[10px]" style={{ color: msg.readAt ? '#533afd' : '#c1cdd8' }}>
              {msg.readAt ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Conversation List Item ───────────────────────────────────
const ConvItem: React.FC<{
  conv: StoredConversation;
  isActive: boolean;
  onClick: () => void;
}> = ({ conv, isActive, onClick }) => {
  const unread = conv.unreadBusiness + conv.unreadCourier;
  return (
    <button
      onClick={onClick}
      className="w-full text-right p-3 rounded-xl transition-all mb-1"
      style={{
        background: isActive ? 'rgba(83,58,253,0.08)' : 'transparent',
        border: isActive ? '1px solid rgba(83,58,253,0.15)' : '1px solid transparent',
      }}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
            {conv.businessName.charAt(0)}
          </div>
          <div className="w-0.5 h-3" style={{ background: 'rgba(83,58,253,0.2)' }} />
          <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center text-xs font-bold text-pink-700">
            {conv.courierName.charAt(0)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="text-right min-w-0">
              <p className="text-[12px] font-semibold text-gray-900 truncate leading-tight">{conv.businessName}</p>
              <p className="text-[11px] text-gray-400 truncate leading-tight">{conv.courierName}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {conv.lastMessageAt && (
                <span className="text-[10px] text-gray-400">{formatTime(conv.lastMessageAt)}</span>
              )}
              {unread > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ background: '#ea2261' }}>
                  {unread}
                </span>
              )}
            </div>
          </div>
          {conv.lastMessage && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{conv.lastMessage}</p>
          )}
        </div>
      </div>
    </button>
  );
};

// ─── New Conversation Modal ───────────────────────────────────
const NewConvModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: (conv: StoredConversation) => void;
}> = ({ open, onClose, onCreated }) => {
  const businesses = storageService.getBusinesses();
  const couriers = storageService.getCouriers();
  const [bizId, setBizId] = useState('');
  const [courierId, setCourierId] = useState('');

  const handleCreate = () => {
    if (!bizId || !courierId) { toast.error('בחר עסק ושליח'); return; }
    const conv = storageService.getOrCreateConversation(bizId, courierId);
    onCreated(conv);
    onClose();
    setBizId('');
    setCourierId('');
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="שיחה חדשה" size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>ביטול</Button>
        <Button variant="primary" onClick={handleCreate}>צור שיחה</Button>
      </>}
    >
      <div className="space-y-4" dir="rtl">
        <div>
          <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#3c4257' }}>בחר עסק</label>
          <select value={bizId} onChange={(e) => setBizId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-[6px] text-sm border outline-none" style={{ borderColor: '#e0e6ed', fontFamily: 'inherit' }}>
            <option value="">-- בחר עסק --</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.businessName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#3c4257' }}>בחר שליח</label>
          <select value={courierId} onChange={(e) => setCourierId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-[6px] text-sm border outline-none" style={{ borderColor: '#e0e6ed', fontFamily: 'inherit' }}>
            <option value="">-- בחר שליח --</option>
            {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
};

// ─── Main Chat Page ───────────────────────────────────────────
const Chat: React.FC = () => {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [newConvModal, setNewConvModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  const loadConversations = useCallback(() => {
    const convs = storageService.getConversations().sort((a, b) => {
      const ta = a.lastMessageAt ?? a.createdAt;
      const tb = b.lastMessageAt ?? b.createdAt;
      return tb.localeCompare(ta);
    });
    setConversations(convs);
  }, []);

  const loadMessages = useCallback((convId: string) => {
    const msgs = storageService.getMessages(convId);
    setMessages(msgs);
    storageService.markMessagesRead(convId, 'admin');
  }, []);

  // Polling every 2s
  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => {
      loadConversations();
      if (activeConvId) loadMessages(activeConvId);
    }, 2000);
    return () => clearInterval(interval);
  }, [loadConversations, loadMessages, activeConvId]);

  // Load messages when active conv changes
  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConv = (convId: string) => {
    setActiveConvId(convId);
    setMobileShowChat(true);
  };

  const handleSend = () => {
    if (!inputText.trim() || !activeConvId) return;
    storageService.addMessage(activeConvId, {
      senderId: 'admin-main',
      senderName: 'מנהל',
      senderType: 'admin',
      content: inputText.trim(),
      messageType: 'text',
    });
    setInputText('');
    loadMessages(activeConvId);
    loadConversations();
    // Simulate typing response
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unreadBusiness + c.unreadCourier, 0);

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col" dir="rtl">
      {/* Page header */}
      <div className="flex items-center justify-between px-2 pb-3 pt-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="w-5 h-5 text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900">צ'אט — שיחות</h1>
          {totalUnread > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#ea2261' }}>{totalUnread}</span>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<PlusIcon className="w-4 h-4" />}
          onClick={() => setNewConvModal(true)}
        >
          שיחה חדשה
        </Button>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

        {/* ── Conversation List ── */}
        <div
          className={`w-full md:w-72 flex-shrink-0 flex flex-col rounded-2xl overflow-hidden ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}
          style={{ background: 'white', border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
        >
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <p className="text-sm font-semibold text-gray-700">שיחות ({conversations.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                <ChatBubbleLeftRightIcon className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">אין שיחות עדיין</p>
                <button
                  onClick={() => setNewConvModal(true)}
                  className="mt-3 text-sm font-semibold"
                  style={{ color: '#533afd' }}
                >
                  צור שיחה ראשונה
                </button>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === activeConvId}
                  onClick={() => handleSelectConv(conv.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div
          className={`flex-1 flex flex-col rounded-2xl overflow-hidden min-w-0 ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}
          style={{ background: 'white', border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
        >
          {activeConv ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0" style={{ background: '#fafbff' }}>
                <button
                  className="md:hidden p-1.5 rounded-lg"
                  style={{ color: '#533afd' }}
                  onClick={() => setMobileShowChat(false)}
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center">
                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700 z-10">
                      {activeConv.businessName.charAt(0)}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-xs font-bold text-pink-700 -mr-2">
                      {activeConv.courierName.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <BuildingStorefrontIcon className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-sm font-semibold text-gray-900">{activeConv.businessName}</span>
                      <span className="text-gray-300">·</span>
                      <TruckIcon className="w-3.5 h-3.5 text-pink-600" />
                      <span className="text-sm font-semibold text-gray-900">{activeConv.courierName}</span>
                    </div>
                    <p className="text-[11px] text-gray-400">שיחה בין עסק לשליח</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4" style={{ background: '#f8faff' }}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <ChatBubbleLeftRightIcon className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm">אין הודעות עדיין</p>
                    <p className="text-xs mt-1">שלח הודעה ראשונה</p>
                  </div>
                ) : (
                  <div>
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} msg={msg} />
                    ))}
                    {isTyping && (
                      <div className="flex items-center gap-2 mr-10 mb-3">
                        <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-gray-100 shadow-sm">
                          <div className="flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">מקליד...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className="p-3 border-t border-gray-100 flex-shrink-0" style={{ background: 'white' }}>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="כתוב הודעה... (Enter לשליחה, Shift+Enter לשורה חדשה)"
                    rows={1}
                    style={{
                      flex: 1, resize: 'none', minHeight: 42, maxHeight: 120,
                      padding: '10px 14px', borderRadius: 12, border: '1px solid #e0e6ed',
                      fontSize: 14, fontFamily: 'inherit', color: '#061b31', background: '#f8fafc',
                      outline: 'none', lineHeight: '1.5',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#533afd'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(83,58,253,0.12)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e0e6ed'; e.currentTarget.style.boxShadow = ''; }}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)', color: 'white' }}
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(83,58,253,0.08)' }}>
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">בחר שיחה</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-xs">בחר שיחה מהרשימה כדי לצפות בהודעות, או צור שיחה חדשה בין עסק לשליח.</p>
              <Button variant="primary" leftIcon={<PlusIcon className="w-4 h-4" />} onClick={() => setNewConvModal(true)}>
                שיחה חדשה
              </Button>
            </div>
          )}
        </div>
      </div>

      <NewConvModal
        open={newConvModal}
        onClose={() => setNewConvModal(false)}
        onCreated={(conv) => {
          loadConversations();
          setActiveConvId(conv.id);
          setMobileShowChat(true);
        }}
      />
    </div>
  );
};

export default Chat;
