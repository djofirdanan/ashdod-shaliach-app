import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ChevronRightIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  UserCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  StarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import * as storageService from '../services/storage.service';
import type { StoredConversation, StoredMessage, StoredBusiness, StoredCourier, StoredDelivery } from '../services/storage.service';
import { syncMessagesDown, syncConversationsDown } from '../services/sync.service';
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

// ─── Conversation type helper ─────────────────────────────────
function convType(conv: StoredConversation): 'business-courier' | 'admin-business' | 'admin-courier' {
  if (conv.courierId === 'admin') return 'admin-business';
  if (conv.businessId === 'admin') return 'admin-courier';
  return 'business-courier';
}

function convPartnerName(conv: StoredConversation): string {
  const t = convType(conv);
  if (t === 'admin-business') return conv.businessName;
  if (t === 'admin-courier') return conv.courierName;
  return `${conv.businessName} ↔ ${conv.courierName}`;
}

function convPartnerType(conv: StoredConversation): 'business' | 'courier' | 'both' {
  const t = convType(conv);
  if (t === 'admin-business') return 'business';
  if (t === 'admin-courier') return 'courier';
  return 'both';
}

// ─── Avatar ───────────────────────────────────────────────────
const Avatar: React.FC<{ name: string; type: 'business' | 'courier' | 'admin'; size?: 'sm' | 'md' }> = ({ name, type, size = 'md' }) => {
  const colors = {
    business: { bg: '#533afd22', text: '#533afd', border: '1px solid #533afd40' },
    courier:  { bg: '#ea226122', text: '#ea2261', border: '1px solid #ea226140' },
    admin:    { bg: '#00b09022', text: '#00b090', border: '1px solid #00b09040' },
  };
  const { bg, text, border } = colors[type];
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ background: bg, color: text, border }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

// ─── Message Bubble ───────────────────────────────────────────
const MessageBubble: React.FC<{ msg: StoredMessage }> = ({ msg }) => {
  const isAdmin = msg.senderType === 'admin';
  const isBusiness = msg.senderType === 'business';

  if (isAdmin) {
    // Admin messages — shown as own (right-aligned, purple gradient)
    return (
      <div className="flex items-end gap-2 mb-3 flex-row-reverse">
        <Avatar name="מנהל" type="admin" size="sm" />
        <div className="max-w-[70%] items-end flex flex-col">
          <span className="text-[11px] text-gray-400 mb-0.5 px-1">מנהל האתר</span>
          <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
            style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)', color: 'white', borderBottomRightRadius: '4px' }}>
            {msg.content}
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 px-1">{fullTime(msg.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 mb-3 ${isBusiness ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar name={msg.senderName} type={msg.senderType === 'courier' ? 'courier' : 'business'} size="sm" />
      <div className={`max-w-[70%] ${isBusiness ? 'items-end' : 'items-start'} flex flex-col`}>
        <span className="text-[11px] text-gray-400 mb-0.5 px-1">{msg.senderName}</span>
        <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={isBusiness
            ? { background: '#533afd', color: 'white', borderBottomRightRadius: '4px' }
            : { background: 'white', color: '#1a1a2e', border: '1px solid #e8ecf0', borderBottomLeftRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
          }
        >
          {msg.content}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isBusiness ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-400">{fullTime(msg.createdAt)}</span>
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
  const pt = convPartnerType(conv);
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
        {/* Avatar(s) */}
        {pt === 'both' ? (
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
              {conv.businessName.charAt(0)}
            </div>
            <div className="w-0.5 h-3" style={{ background: 'rgba(83,58,253,0.2)' }} />
            <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center text-xs font-bold text-pink-700">
              {conv.courierName.charAt(0)}
            </div>
          </div>
        ) : (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${pt === 'business' ? 'bg-purple-100 text-purple-700' : 'bg-pink-100 text-pink-700'}`}>
            {convPartnerName(conv).charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="text-right min-w-0">
              <p className="text-[12px] font-semibold text-gray-900 truncate leading-tight">
                {convPartnerName(conv)}
              </p>
              {pt !== 'both' && (
                <p className="text-[10px] text-gray-400 leading-tight">
                  {pt === 'business' ? '🏪 עסק' : '🛵 שליח'}
                </p>
              )}
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
type ConvMode = 'business-courier' | 'admin-business' | 'admin-courier';

const NewConvModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: (conv: StoredConversation) => void;
}> = ({ open, onClose, onCreated }) => {
  const businesses = storageService.getBusinesses().filter(b => b.isActive);
  const couriers = storageService.getCouriers().filter(c => c.isActive);
  const [mode, setMode] = useState<ConvMode>('admin-business');
  const [bizId, setBizId] = useState('');
  const [courierId, setCourierId] = useState('');

  const handleCreate = () => {
    if (mode === 'business-courier') {
      if (!bizId || !courierId) { toast.error('בחר עסק ושליח'); return; }
      const conv = storageService.getOrCreateConversation(bizId, courierId);
      onCreated(conv); onClose(); setBizId(''); setCourierId('');
    } else if (mode === 'admin-business') {
      if (!bizId) { toast.error('בחר עסק'); return; }
      const conv = storageService.getOrCreateConversation(bizId, 'admin');
      onCreated(conv); onClose(); setBizId('');
    } else {
      if (!courierId) { toast.error('בחר שליח'); return; }
      const conv = storageService.getOrCreateConversation('admin', courierId);
      onCreated(conv); onClose(); setCourierId('');
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="שיחה חדשה" size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>ביטול</Button>
        <Button variant="primary" onClick={handleCreate}>פתח שיחה</Button>
      </>}
    >
      <div className="space-y-4" dir="rtl">
        {/* Mode selector */}
        <div>
          <label className="block text-[12px] font-semibold mb-2 uppercase tracking-wide" style={{ color: '#3c4257' }}>סוג שיחה</label>
          <div className="grid grid-cols-1 gap-2">
            {([
              { id: 'admin-business', icon: <BuildingStorefrontIcon className="w-4 h-4" />, label: 'שיחה עם עסק', desc: 'אני כמנהל ← עסק' },
              { id: 'admin-courier',  icon: <TruckIcon className="w-4 h-4" />,              label: 'שיחה עם שליח', desc: 'אני כמנהל ← שליח' },
              { id: 'business-courier', icon: <UserCircleIcon className="w-4 h-4" />,       label: 'בין עסק לשליח', desc: 'שיחה קיימת עסק↔שליח' },
            ] as const).map(({ id, icon, label, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-all"
                style={{
                  background: mode === id ? '#eef2ff' : '#f8fafc',
                  border: `1px solid ${mode === id ? '#c7d2fe' : '#e0e6ed'}`,
                  color: mode === id ? '#533afd' : '#6b7c93',
                }}
              >
                <span style={{ color: mode === id ? '#533afd' : '#9ca3af' }}>{icon}</span>
                <div>
                  <p className="text-[13px] font-bold">{label}</p>
                  <p className="text-[10px] opacity-70">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Business selector */}
        {(mode === 'admin-business' || mode === 'business-courier') && (
          <div>
            <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#3c4257' }}>בחר עסק</label>
            <select value={bizId} onChange={(e) => setBizId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[6px] text-sm border outline-none" style={{ borderColor: '#e0e6ed', fontFamily: 'inherit' }}>
              <option value="">-- בחר עסק --</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.businessName}</option>)}
            </select>
          </div>
        )}

        {/* Courier selector */}
        {(mode === 'admin-courier' || mode === 'business-courier') && (
          <div>
            <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#3c4257' }}>בחר שליח</label>
            <select value={courierId} onChange={(e) => setCourierId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[6px] text-sm border outline-none" style={{ borderColor: '#e0e6ed', fontFamily: 'inherit' }}>
              <option value="">-- בחר שליח --</option>
              {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ─── Stars helper ─────────────────────────────────────────────
const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(i => i <= Math.round(rating)
      ? <StarSolid  key={i} className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
      : <StarIcon   key={i} className="w-3.5 h-3.5" style={{ color: '#d1d5db' }} />
    )}
  </div>
);

// ─── Delivery status label ─────────────────────────────────────
const dStatusLabel: Record<StoredDelivery['status'], string> = {
  scheduled: '📅 מתוזמן',
  pending:   'ממתין לשליח',
  accepted:  'שליח בדרך',
  picked_up: 'בדרך ללקוח',
  delivered: '✅ נמסר',
  cancelled: '❌ בוטל',
};
const dStatusColor: Record<StoredDelivery['status'], string> = {
  scheduled: '#6366f1', pending: '#8898aa', accepted: '#533afd',
  picked_up: '#f59e0b', delivered: '#10b981', cancelled: '#ef4444',
};

// ─── Context panel shown beside chat when admin talks to B or C ─
const UserContextPanel: React.FC<{
  conv: StoredConversation;
  onClose: () => void;
}> = ({ conv, onClose }) => {
  const type   = convType(conv);
  const isBiz  = type === 'admin-business';
  const isOpen = type !== 'business-courier';

  if (!isOpen) return null;

  const biz     = isBiz ? storageService.getBusiness(conv.businessId)        : null;
  const courier = !isBiz ? storageService.getCourier(conv.courierId)         : null;

  const deliveries = isBiz
    ? storageService.getDeliveriesByBusiness(conv.businessId)
        .filter(d => !d.archived)
        .sort((a,b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8)
    : storageService.getDeliveries()
        .filter(d => d.courierId === conv.courierId && !d.archived)
        .sort((a,b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8);

  const name    = isBiz ? biz?.businessName  : courier?.name;
  const phone   = isBiz ? biz?.phone         : courier?.phone;
  const email   = isBiz ? biz?.email         : courier?.email;
  const rating  = isBiz ? biz?.rating        : courier?.rating;
  const total   = isBiz ? biz?.totalDeliveries : courier?.totalDeliveries;
  const balance = isBiz ? biz?.balance        : null;

  return (
    <div
      className="w-72 flex-shrink-0 flex flex-col rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ background: isBiz ? '#533afd12' : '#ea226112', borderBottom: '1px solid #e8ecf0' }}
      >
        <p className="text-[12px] font-bold" style={{ color: isBiz ? '#533afd' : '#ea2261' }}>
          {isBiz ? '🏪 פרטי עסק' : '🛵 פרטי שליח'}
        </p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 transition-colors">
          <XMarkIcon className="w-4 h-4" style={{ color: '#9ca3af' }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile card */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-[18px] flex-shrink-0"
              style={{ background: isBiz ? 'linear-gradient(135deg,#533afd,#3d22e0)' : 'linear-gradient(135deg,#ea2261,#c0165a)' }}
            >
              {name?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="font-black text-[14px]" style={{ color: '#061b31' }}>{name ?? '—'}</p>
              {rating != null && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Stars rating={rating} />
                  <span className="text-[11px]" style={{ color: '#8898aa' }}>{rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-2">
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-2 text-[12px]" style={{ color: '#533afd' }}>
                <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0" />
                {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-2 text-[12px]" style={{ color: '#8898aa' }}>
                <EnvelopeIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{email}</span>
              </a>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-xl p-2.5 text-center" style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}>
              <p className="text-[16px] font-black" style={{ color: '#061b31' }}>{total ?? 0}</p>
              <p className="text-[10px]" style={{ color: '#8898aa' }}>משלוחים</p>
            </div>
            {balance != null ? (
              <div className="rounded-xl p-2.5 text-center" style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}>
                <p className="text-[16px] font-black" style={{ color: balance >= 0 ? '#10b981' : '#ef4444' }}>₪{balance}</p>
                <p className="text-[10px]" style={{ color: '#8898aa' }}>יתרה</p>
              </div>
            ) : courier ? (
              <div className="rounded-xl p-2.5 text-center" style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}>
                <p className="text-[14px] font-black" style={{ color: '#061b31' }}>
                  {courier.vehicle === 'motorcycle' ? '🏍️' : courier.vehicle === 'bicycle' ? '🚲' : courier.vehicle === 'scooter' ? '🛵' : '🚗'}
                </p>
                <p className="text-[10px]" style={{ color: '#8898aa' }}>רכב</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Recent deliveries */}
        <div>
          <p className="text-[11px] font-bold mb-2 uppercase tracking-wide" style={{ color: '#8898aa' }}>
            משלוחים אחרונים ({deliveries.length})
          </p>
          {deliveries.length === 0 ? (
            <p className="text-[12px] text-center py-3" style={{ color: '#c1cdd8' }}>אין משלוחים</p>
          ) : (
            <div className="space-y-2">
              {deliveries.map(d => (
                <div
                  key={d.id}
                  className="rounded-xl p-2.5"
                  style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: dStatusColor[d.status] + '18', color: dStatusColor[d.status] }}
                    >
                      {dStatusLabel[d.status]}
                    </span>
                    <span className="text-[11px] font-black" style={{ color: '#533afd' }}>₪{d.price}</span>
                  </div>
                  <p className="text-[11px] leading-snug truncate" style={{ color: '#3c4257' }}>
                    📍 {d.dropAddress}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#c1cdd8' }}>
                    {new Date(d.createdAt).toLocaleDateString('he-IL', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Chat Page ───────────────────────────────────────────
const Chat: React.FC = () => {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [newConvModal, setNewConvModal] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevMsgCount = useRef(0);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  const loadConversations = useCallback(async () => {
    // Sync ALL conversations from Supabase so admin sees latest
    await syncConversationsDown('admin-main', 'admin').catch(() => {});
    const convs = storageService.getConversations().sort((a, b) => {
      const ta = a.lastMessageAt ?? a.createdAt;
      const tb = b.lastMessageAt ?? b.createdAt;
      return tb.localeCompare(ta);
    });
    setConversations(convs);
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    // Always sync from Supabase for real-time updates
    await syncMessagesDown(convId).catch(() => {});
    const msgs = storageService.getMessages(convId);
    if (msgs.length > prevMsgCount.current) {
      prevMsgCount.current = msgs.length;
    }
    setMessages(msgs);
    storageService.markMessagesRead(convId, 'admin');
  }, []);

  // Polling every 2s — sync messages from Supabase
  useEffect(() => {
    loadConversations();
    const interval = setInterval(async () => {
      await loadConversations();
      if (activeConvId) {
        await syncMessagesDown(activeConvId).catch(() => {});
        const fresh = storageService.getMessages(activeConvId);
        setMessages(fresh);
        storageService.markMessagesRead(activeConvId, 'admin');
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [loadConversations, activeConvId]);

  // Load messages when active conv changes
  useEffect(() => {
    if (activeConvId) {
      prevMsgCount.current = 0;
      loadMessages(activeConvId);
    }
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
      senderName: 'מנהל האתר',
      senderType: 'admin',
      content: inputText.trim(),
      messageType: 'text',
    });
    setInputText('');
    const fresh = storageService.getMessages(activeConvId);
    prevMsgCount.current = fresh.length;
    setMessages(fresh);
    loadConversations();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unreadBusiness + c.unreadCourier, 0);

  // Header label for active conversation
  const activeHeader = activeConv ? (() => {
    const t = convType(activeConv);
    if (t === 'admin-business') return { title: activeConv.businessName, sub: '🏪 שיחה עם עסק' };
    if (t === 'admin-courier')  return { title: activeConv.courierName,  sub: '🛵 שיחה עם שליח' };
    return { title: `${activeConv.businessName} ↔ ${activeConv.courierName}`, sub: 'שיחה בין עסק לשליח' };
  })() : null;

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

        {/* ── Chat Area + Context Panel ── */}
        <div className={`flex-1 flex gap-4 min-w-0 overflow-hidden ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
        <div
          className="flex-1 flex flex-col rounded-2xl overflow-hidden min-w-0"
          style={{ background: 'white', border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
        >
          {activeConv && activeHeader ? (
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
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700">
                    {activeHeader.title.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{activeHeader.title}</p>
                    <p className="text-[11px] text-gray-400">{activeHeader.sub}</p>
                  </div>
                </div>
                <div className="mr-auto flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[11px] text-gray-400">בזמן אמת</span>
                  {/* Show user-info panel toggle (only for admin↔B or admin↔C) */}
                  {convType(activeConv) !== 'business-courier' && (
                    <button
                      onClick={() => setShowContextPanel(v => !v)}
                      className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                      style={{
                        background: showContextPanel ? '#533afd18' : '#f0f4f8',
                        color: showContextPanel ? '#533afd' : '#8898aa',
                      }}
                    >
                      <UserCircleIcon className="w-4 h-4" />
                      פרטי משתמש
                    </button>
                  )}
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
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(83,58,253,0.08)' }}>
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">בחר שיחה</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-xs">בחר שיחה מהרשימה, או פתח שיחה חדשה עם עסק, שליח, או בין עסק לשליח.</p>
              <Button variant="primary" leftIcon={<PlusIcon className="w-4 h-4" />} onClick={() => setNewConvModal(true)}>
                שיחה חדשה
              </Button>
            </div>
          )}
        </div>

        {/* ── User context panel ── */}
        {activeConv && showContextPanel && convType(activeConv) !== 'business-courier' && (
          <div className="hidden lg:block">
            <UserContextPanel
              conv={activeConv}
              onClose={() => setShowContextPanel(false)}
            />
          </div>
        )}
        </div>{/* end chat+context wrapper */}
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
