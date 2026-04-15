import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getConversations,
  getMessages,
  addMessage,
  markMessagesRead,
  getDeliveries,
  updateDelivery,
  updateCourier,
  getCourier,
  type StoredConversation,
  type StoredMessage,
  type StoredDelivery,
  type StoredCourier,
} from '../../../services/storage.service';
import { syncDeliveriesDown, syncMessagesDown, syncConversationsDown } from '../../../services/sync.service';
import { sendAdminSupportNotification } from '../../../services/email.service';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { playNewMessage, getMuted, setMuted } from '../../../utils/sounds';

const ETA_OPTIONS = ['5 דקות', '10 דקות', '15 דקות', '20 דקות', '30 דקות'];

function navUrl(address: string, pref: 'waze' | 'google' | 'apple'): string {
  const encoded = encodeURIComponent(address + ', ישראל');
  if (pref === 'waze') return `https://waze.com/ul?q=${encoded}&navigate=yes`;
  if (pref === 'apple') return `maps://maps.apple.com/?daddr=${encoded}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
}

const statusLabel: Record<StoredDelivery['status'], string> = {
  scheduled: '📅 מתוזמן',
  pending: 'ממתין לשליח',
  accepted: 'שליח בדרך לאיסוף',
  picked_up: 'בדרך ללקוח',
  delivered: 'נמסר ✓',
  cancelled: 'בוטל',
};

/* ─── Delivery context banner ─────────────────── */
const DeliveryBanner: React.FC<{
  delivery: StoredDelivery;
  courierId: string;
  userName: string;
  convId: string;
  onStatusUpdate: () => void;
}> = ({ delivery, courierId, userName, convId, onStatusUpdate }) => {
  const [showEta, setShowEta] = useState(false);
  const [updating, setUpdating] = useState(false);

  const canPickUp = delivery.status === 'accepted';
  const canDeliver = delivery.status === 'picked_up';
  const isDone = delivery.status === 'delivered' || delivery.status === 'cancelled';

  const sendSystemMsg = (text: string) => {
    addMessage(convId, {
      senderId: courierId,
      senderName: userName,
      senderType: 'courier',
      content: text,
      messageType: 'text',
    });
  };

  const handleEta = (eta: string) => {
    sendSystemMsg(`⏱️ אני מגיע בעוד ${eta}`);
    setShowEta(false);
    toast.success(`נשלח: אני מגיע בעוד ${eta}`);
  };

  const handlePickedUp = () => {
    setUpdating(true);
    updateDelivery(delivery.id, { status: 'picked_up', pickedUpAt: new Date().toISOString() });
    sendSystemMsg('📦 אספתי את החבילה — בדרך ללקוח!');
    toast.success('סטטוס עודכן: נאסף');
    setUpdating(false);
    onStatusUpdate();
  };

  const handleDelivered = () => {
    setUpdating(true);
    updateDelivery(delivery.id, { status: 'delivered', deliveredAt: new Date().toISOString() });
    // Update courier stats
    const c = getCourier(courierId);
    if (c) {
      updateCourier(courierId, {
        totalDeliveries: (c.totalDeliveries || 0) + 1,
        activeDeliveries: Math.max(0, (c.activeDeliveries || 1) - 1),
        earnings: {
          ...c.earnings,
          today: c.earnings.today + (delivery.price || 0),
          thisWeek: c.earnings.thisWeek + (delivery.price || 0),
          thisMonth: c.earnings.thisMonth + (delivery.price || 0),
          total: c.earnings.total + (delivery.price || 0),
        },
      });
    }
    sendSystemMsg('✅ המשלוח נמסר! עבודה מצוינת!');
    toast.success('משלוח הושלם!');
    setUpdating(false);
    onStatusUpdate();
  };

  return (
    <div
      className="px-4 py-3 space-y-2"
      style={{ background: isDone ? '#f0fdf4' : '#eef2ff', borderBottom: '1px solid #e8ecf0' }}
    >
      {/* Status + addresses */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <TruckIcon className="w-4 h-4 flex-shrink-0" style={{ color: isDone ? '#10b981' : '#533afd' }} />
            <span
              className="text-[11px] font-black px-2 py-0.5 rounded-full"
              style={{
                background: isDone ? '#dcfce7' : '#e0e7ff',
                color: isDone ? '#10b981' : '#533afd',
              }}
            >
              {statusLabel[delivery.status]}
            </span>
            {delivery.price > 0 && (
              <span className="text-[12px] font-black" style={{ color: '#533afd' }}>₪{delivery.price}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#6b7280' }}>
            <MapPinIcon className="w-3 h-3 text-green-500 flex-shrink-0" />
            <span className="truncate">{delivery.pickupAddress}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#6b7280' }}>
            <MapPinIcon className="w-3 h-3 text-red-400 flex-shrink-0" />
            <span className="truncate">{delivery.dropAddress}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {!isDone && (
        <div className="flex gap-2 flex-wrap">
          {/* Navigation button — pickup or dropoff depending on status */}
          {(canPickUp || canDeliver) && (() => {
            const address = canPickUp ? delivery.pickupAddress : delivery.dropAddress;
            const navPref = getCourier(courierId)?.navPreference ?? 'waze';
            const label = canPickUp ? '🗺️ נווט לאיסוף' : '🗺️ נווט ללקוח';
            return (
              <a
                href={navUrl(address, navPref)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95"
                style={{ background: '#fff7ed', border: '1px solid #fde68a', color: '#d97706' }}
              >
                {label}
              </a>
            );
          })()}

          {/* ETA button */}
          <div className="relative">
            <button
              onClick={() => setShowEta(!showEta)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95"
              style={{ background: '#fff', border: '1px solid #e0e7ff', color: '#533afd' }}
            >
              <ClockIcon className="w-3.5 h-3.5" />
              ⏱️ זמן הגעה
            </button>
            {showEta && (
              <div
                className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden z-10"
                style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 130 }}
              >
                {ETA_OPTIONS.map((eta) => (
                  <button
                    key={eta}
                    onClick={() => handleEta(eta)}
                    className="w-full px-4 py-2 text-[12px] font-semibold text-right hover:bg-purple-50 transition-colors"
                    style={{ color: '#061b31' }}
                  >
                    {eta}
                  </button>
                ))}
              </div>
            )}
          </div>

          {canPickUp && (
            <button
              onClick={handlePickedUp}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 disabled:opacity-60"
              style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#d97706' }}
            >
              📦 אספתי
            </button>
          )}

          {canDeliver && (
            <button
              onClick={handleDelivered}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 disabled:opacity-60"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}
            >
              <CheckCircleIcon className="w-3.5 h-3.5" />
              מסרתי ✅
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Main Component ──────────────────────────── */
const CourierChat: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';
  const courierName = getCourier(courierId)?.name ?? 'שליח';

  // Parse URL params
  const searchParams = new URLSearchParams(location.search);
  const initialConvId = searchParams.get('convId');
  const urlDeliveryId = searchParams.get('deliveryId');

  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(initialConvId);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [text, setText] = useState('');
  const [delivery, setDelivery] = useState<StoredDelivery | null>(null);
  const [muted, setMutedState] = useState(getMuted());
  const [showOlder, setShowOlder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);

  const loadConvs = () => {
    const all = getConversations().filter((c) => c.courierId === courierId);
    setConversations(all.sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')));
  };

  const loadDelivery = async () => {
    if (!urlDeliveryId) return;
    // Sync deliveries from Supabase first to get latest status
    await syncDeliveriesDown();
    const all = getDeliveries();
    const d = all.find(x => x.id === urlDeliveryId);
    setDelivery(d ?? null);
  };

  useEffect(() => {
    loadConvs();
    loadDelivery();
    if (courierId) {
      syncConversationsDown(courierId, 'courier').then(loadConvs);
    }
  }, [courierId, urlDeliveryId]);

  // Auto-select conv if passed via URL
  useEffect(() => {
    if (initialConvId && !selectedConvId) {
      setSelectedConvId(initialConvId);
    }
  }, [initialConvId]);

  useEffect(() => {
    if (!selectedConvId) return;
    setMessages(getMessages(selectedConvId));
    markMessagesRead(selectedConvId, 'courier');
    loadConvs();

    prevMsgCount.current = getMessages(selectedConvId).length;
    // Poll Supabase every 3s for new messages (real-time cross-device)
    const poll = async () => {
      await syncMessagesDown(selectedConvId);
      const fresh = getMessages(selectedConvId);
      if (fresh.length > prevMsgCount.current) {
        const newest = fresh[fresh.length - 1];
        if (newest.senderType !== 'courier') playNewMessage();
        prevMsgCount.current = fresh.length;
        setMessages(fresh);
      }
      if (urlDeliveryId) {
        await syncDeliveriesDown();
        const d = getDeliveries().find(x => x.id === urlDeliveryId);
        setDelivery(d ?? null);
      }
      loadConvs();
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [selectedConvId, urlDeliveryId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !selectedConvId) return;
    const msgContent = text.trim();
    addMessage(selectedConvId, {
      senderId: courierId,
      senderName: courierName,
      senderType: 'courier',
      content: msgContent,
      messageType: 'text',
    });
    setText('');
    setMessages(getMessages(selectedConvId));

    // Notify admin by email when sending to admin support conversation
    const conv = getConversations().find(c => c.id === selectedConvId);
    if (conv && (conv.courierId === 'admin' || conv.businessId === 'admin')) {
      sendAdminSupportNotification(courierName, 'courier', msgContent).catch(() => {});
    }
  };

  const handleBack = () => {
    // Clear URL params when going back
    if (initialConvId) {
      navigate('/courier/chat', { replace: true });
    }
    setSelectedConvId(null);
    setDelivery(null);
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  // ─── Conversation list ─────────────────────────
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
            <p className="font-bold text-[15px]" style={{ color: '#061b31' }}>עדיין אין שיחות עם עסקים</p>
            <p className="text-[12px]" style={{ color: '#8898aa' }}>
              כאשר תקבל משלוח, תוכל לדבר עם בעל העסק כאן
            </p>
          </div>
        ) : (() => {
          const todayStr = new Date().toDateString();
          const recent = conversations.filter((c) => {
            const d = c.lastMessageAt ? new Date(c.lastMessageAt) : new Date(c.createdAt);
            return d.toDateString() === todayStr;
          });
          const older = conversations.filter((c) => {
            const d = c.lastMessageAt ? new Date(c.lastMessageAt) : new Date(c.createdAt);
            return d.toDateString() !== todayStr;
          });
          const ConvBtn = ({ c }: { c: StoredConversation }) => (
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
                {c.businessName[0] ?? 'ע'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold truncate" style={{ color: '#061b31' }}>{c.businessName}</p>
                  {c.unreadCourier > 0 && (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0" style={{ background: '#ea2261' }}>
                      {c.unreadCourier}
                    </span>
                  )}
                </div>
                {c.lastMessage && <p className="text-[12px] truncate mt-0.5" style={{ color: '#8898aa' }}>{c.lastMessage}</p>}
                {c.lastMessageAt && <p className="text-[10px] mt-0.5" style={{ color: '#c0cadd' }}>{new Date(c.lastMessageAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>}
              </div>
            </button>
          );
          return (
            <div className="space-y-4">
              {recent.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold mb-2 px-1" style={{ color: '#8898aa' }}>היום</p>
                  <div className="space-y-2">{recent.map((c) => <ConvBtn key={c.id} c={c} />)}</div>
                </div>
              )}
              {older.length > 0 && (
                <div>
                  <button onClick={() => setShowOlder(!showOlder)} className="text-[11px] font-bold px-1 mb-2 flex items-center gap-1" style={{ color: '#8898aa' }}>
                    {showOlder ? '▾' : '▸'} שיחות ישנות ({older.length})
                  </button>
                  {showOlder && <div className="space-y-2">{older.map((c) => <ConvBtn key={c.id} c={c} />)}</div>}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  }

  // ─── Active chat ───────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-w-lg mx-auto">
      {/* Chat header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: '#fff', borderBottom: '1px solid #e8ecf0' }}
      >
        <button onClick={handleBack} className="text-[13px] font-semibold" style={{ color: '#533afd' }}>
          ← חזרה
        </button>
        <div className="flex-1">
          <p className="text-[14px] font-bold" style={{ color: '#061b31' }}>
            {selectedConv?.businessId === 'admin' ? '🔧 מנהל האתר' : (selectedConv?.businessName ?? 'עסק')}
          </p>
        </div>
        <button
          onClick={() => { const next = !muted; setMuted(next); setMutedState(next); toast.success(next ? '🔇 סאונד מושתק' : '🔊 סאונד פעיל'); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: '#f0f4f8', color: '#8898aa' }}
        >
          {muted ? <SpeakerXMarkIcon className="w-4 h-4" /> : <SpeakerWaveIcon className="w-4 h-4" />}
        </button>
      </div>

      {/* Delivery context banner — only for real business conversations */}
      {delivery && selectedConv?.businessId !== 'admin' && (
        <DeliveryBanner
          delivery={delivery}
          courierId={courierId}
          userName={courierName}
          convId={selectedConvId}
          onStatusUpdate={() => {
            setMessages(getMessages(selectedConvId));
            const d = getDeliveries().find(x => x.id === urlDeliveryId);
            setDelivery(d ?? null);
          }}
        />
      )}

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
          const isMine = m.senderType === 'courier';
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className="max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[13px]"
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
        <div ref={messagesEndRef} />
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

export default CourierChat;
