import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getConversations,
  getMessages,
  addMessage,
  markMessagesRead,
  getBusiness,
  getCourier,
  getDeliveriesByBusiness,
  getDeliveries,
  deleteConversation,
  addReview,
  updateBusiness,
  getOrCreateSupportTicket,
  getSupportMessages,
  addSupportMessage,
  type StoredConversation,
  type StoredMessage,
  type StoredDelivery,
  type StoredCourier,
  type SupportMessage,
  type SupportTicket,
} from '../../../services/storage.service';
import { syncMessagesDown, syncConversationsDown, syncDeliveriesDown, getCourierLocationFromDB, syncSupportMessagesDown } from '../../../services/sync.service';
import { sendAdminSupportNotification } from '../../../services/email.service';
import { playNewMessage, playStatusUpdate, getMuted, setMuted } from '../../../utils/sounds';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  TruckIcon,
  MapPinIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const BLUE  = '#009DE0';
const GREEN = '#1BA672';
const TEXT  = '#202125';
const TEXT2 = '#757575';

// ─── Business Completion Modal ────────────────────────────────
const BusinessCompletionModal: React.FC<{
  delivery: StoredDelivery;
  businessId: string;
  onClose: () => void;
}> = ({ delivery, businessId, onClose }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [addFav, setAddFav] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating > 0) {
      addReview({
        reviewerId: businessId,
        reviewerType: 'business',
        targetId: delivery.courierId ?? '',
        targetType: 'courier',
        rating,
        comment: comment || undefined,
        deliveryId: delivery.id,
      });
    }
    if (addFav && delivery.courierId) {
      const biz = getBusiness(businessId);
      if (biz) {
        const favs = biz.favoriteCouriers ?? [];
        if (!favs.includes(delivery.courierId)) {
          updateBusiness(businessId, { favoriteCouriers: [...favs, delivery.courierId] });
        }
      }
    }
    setSubmitted(true);
    setTimeout(onClose, 1500);
  };

  if (submitted) return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-3xl p-8 text-center" style={{ background: '#fff', margin: 24 }}>
        <p className="text-5xl mb-3">🎉</p>
        <p className="text-[18px] font-black" style={{ color: '#202125' }}>תודה רבה!</p>
        <p className="text-[13px] mt-1" style={{ color: '#757575' }}>המשלוח הושלם בהצלחה</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg rounded-t-3xl p-5 pb-8" style={{ background: '#fff' }} dir="rtl">
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: '#E8E8E8' }} />
        <p className="text-4xl text-center mb-2">🎉</p>
        <h3 className="text-[18px] font-black text-center mb-1" style={{ color: '#202125' }}>המשלוח הסתיים!</h3>
        <p className="text-[12px] text-center mb-5" style={{ color: '#757575' }}>איך היה השליח {delivery.courierName}?</p>

        <div className="flex justify-center gap-3 mb-4">
          {[1,2,3,4,5].map(i => (
            <button key={i} onClick={() => setRating(i)}>
              <span style={{ fontSize: 32, color: i <= rating ? '#F58F1F' : '#E8E8E8' }}>★</span>
            </button>
          ))}
        </div>

        {rating > 0 && (
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="הערות (לא חובה)..."
            className="w-full rounded-2xl p-3 mb-3 text-[13px] resize-none outline-none"
            style={{ border: '1px solid #E8E8E8', background: '#F8F9FA', height: 64, direction: 'rtl' }}
          />
        )}

        <label className="flex items-center gap-2 mb-5 cursor-pointer">
          <input type="checkbox" checked={addFav} onChange={e => setAddFav(e.target.checked)} className="w-4 h-4 rounded" />
          <span className="text-[13px] font-semibold" style={{ color: '#202125' }}>הוסף לשליחים המועדפים שלי ❤️</span>
        </label>

        <button onClick={handleSubmit} className="w-full py-3.5 rounded-2xl font-black text-[15px] text-white" style={{ background: GREEN }}>
          {rating > 0 ? 'שלח ביקורת' : 'סיים ללא ביקורת'}
        </button>
      </div>
    </div>
  );
};

const statusLabel: Record<StoredDelivery['status'], string> = {
  scheduled: '📅 מתוזמן',
  pending: 'ממתין לשליח',
  accepted: '🚗 שליח בדרך לאיסוף',
  picked_up: '📦 בדרך ללקוח',
  delivered: '✅ נמסר',
  cancelled: '❌ בוטל',
};

const statusColor: Record<StoredDelivery['status'], string> = {
  scheduled: '#6366f1',
  pending: '#8898aa',
  accepted: '#533afd',
  picked_up: '#f59e0b',
  delivered: '#10b981',
  cancelled: '#ef4444',
};

// ─── Courier profile modal ────────────────────────────────────
const CourierProfileModal: React.FC<{ courier: StoredCourier; onClose: () => void }> = ({ courier, onClose }) => (
  <div
    className="fixed inset-0 z-[300] flex items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.6)' }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: '#fff' }} dir="rtl">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-5"
        style={{ background: 'linear-gradient(135deg, #061b31, #1c1e54)' }}
      >
        {courier.photo ? (
          <img src={courier.photo} className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[22px] font-black"
            style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
          >
            {courier.name[0]}
          </div>
        )}
        <div>
          <p className="text-white font-black text-[16px]">{courier.name}</p>
          <p className="text-white/60 text-[11px]">
            {courier.vehicle === 'motorcycle' ? '🏍️ אופנוע' : courier.vehicle === 'bicycle' ? '🚲 אופניים' : courier.vehicle === 'scooter' ? '🛵 קטנוע' : '🚗 רכב'}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {[1,2,3,4,5].map((i) => (
              <span key={i} style={{ color: i <= Math.round(courier.rating) ? '#f59e0b' : 'rgba(255,255,255,0.25)', fontSize: 14 }}>★</span>
            ))}
            <span className="text-white/60 text-[11px] mr-1">{courier.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
      {/* Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold w-20" style={{ color: '#8898aa' }}>טלפון</span>
          <a href={`tel:${courier.phone}`} className="text-[13px] font-bold" style={{ color: '#533afd' }}>
            {courier.phone || 'לא זמין'}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold w-20" style={{ color: '#8898aa' }}>מייל</span>
          <a href={`mailto:${courier.email}`} className="text-[13px]" style={{ color: '#061b31' }}>
            {courier.email}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold w-20" style={{ color: '#8898aa' }}>משלוחים</span>
          <span className="text-[13px] font-bold" style={{ color: '#061b31' }}>{courier.totalDeliveries}</span>
        </div>
        {courier.bitPhone && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold w-20" style={{ color: '#8898aa' }}>Bit 💙</span>
            <a
              href={`https://bit.ly/pay/${courier.bitPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
            >
              💙 שלם בביט ל-{courier.bitPhone}
            </a>
          </div>
        )}
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold text-[14px]"
          style={{ background: '#f0f4f8', color: '#8898aa' }}
        >
          סגור
        </button>
      </div>
    </div>
  </div>
);

// ─── Delivery status banner ───────────────────────────────────
const DeliveryBanner: React.FC<{ delivery: StoredDelivery }> = ({ delivery }) => {
  const isDone = delivery.status === 'delivered' || delivery.status === 'cancelled';
  return (
    <div
      className="px-4 py-3"
      style={{ background: isDone ? '#f0fdf4' : '#eef2ff', borderBottom: '1px solid #e8ecf0' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <TruckIcon className="w-4 h-4 flex-shrink-0" style={{ color: isDone ? '#10b981' : '#533afd' }} />
        <span
          className="text-[11px] font-black px-2 py-0.5 rounded-full"
          style={{ background: statusColor[delivery.status] + '22', color: statusColor[delivery.status] }}
        >
          {statusLabel[delivery.status]}
        </span>
        {delivery.price > 0 && (
          <span className="text-[12px] font-black mr-auto" style={{ color: '#533afd' }}>₪{delivery.price}</span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px]" style={{ color: '#6b7280' }}>
        <div className="flex items-center gap-1">
          <MapPinIcon className="w-3 h-3 text-green-500 flex-shrink-0" />
          <span className="truncate">{delivery.pickupAddress}</span>
        </div>
        <span>→</span>
        <div className="flex items-center gap-1">
          <MapPinIcon className="w-3 h-3 text-red-400 flex-shrink-0" />
          <span className="truncate">{delivery.dropAddress}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Group conversations ──────────────────────────────────────
function groupConversations(convs: StoredConversation[]) {
  const now = new Date();
  const todayStr = now.toDateString();
  const recent: StoredConversation[] = [];
  const older: StoredConversation[] = [];
  convs.forEach((c) => {
    const d = c.lastMessageAt ? new Date(c.lastMessageAt) : new Date(c.createdAt);
    if (d.toDateString() === todayStr) recent.push(c);
    else older.push(c);
  });
  return { recent, older };
}

const BusinessChat: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem('admin_token') ?? '';
  const businessId = token.startsWith('business-') ? token.replace('business-', '') : '';
  const businessName = getBusiness(businessId)?.businessName ?? 'עסק';

  // Read URL params for direct navigation from dashboard
  const urlConvId = searchParams.get('convId');
  const urlDeliveryId = searchParams.get('deliveryId');
  const urlSupportOpen = searchParams.get('support') === '1';

  const SUPPORT_INIT = urlSupportOpen ? '__support__' : null;

  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(urlConvId ?? SUPPORT_INIT);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [text, setText] = useState('');
  const [activeDelivery, setActiveDelivery] = useState<StoredDelivery | null>(null);
  const [showCourierProfile, setShowCourierProfile] = useState(false);
  const [muted, setMutedState] = useState(getMuted());
  const [showOlder, setShowOlder] = useState(false);
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number; updatedAt: string } | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);
  const prevDeliveryStatus = useRef<string | null>(null);

  // ─── Support thread state ────────────────────────────────────
  const SUPPORT_ID = '__support__';
  const [supportTicket, setSupportTicket] = useState<SupportTicket | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const prevSupportCount = useRef(0);

  const loadConvs = () => {
    const all = getConversations().filter((c) => c.businessId === businessId);
    setConversations(all.sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')));
  };

  const loadDelivery = async (courierId?: string) => {
    // No deliveries for admin conversations
    if (!courierId || courierId === 'admin') {
      setActiveDelivery(null);
      setCourierLocation(null);
      return;
    }
    await syncDeliveriesDown();

    // If URL has a specific delivery ID, use that
    if (urlDeliveryId) {
      const all = getDeliveries();
      const specific = all.find(d => d.id === urlDeliveryId);
      if (specific) {
        if (prevDeliveryStatus.current && prevDeliveryStatus.current !== specific.status) {
          playStatusUpdate();
          // Show completion modal when delivery just became delivered
          if (specific.status === 'delivered' && !showCompletionModal) {
            setShowCompletionModal(true);
          }
        }
        prevDeliveryStatus.current = specific.status;
        setActiveDelivery(specific);
        if (!['delivered', 'cancelled'].includes(specific.status)) {
          const loc = await getCourierLocationFromDB(courierId);
          if (loc) setCourierLocation({ lat: loc.latitude, lng: loc.longitude, updatedAt: loc.updatedAt });
        } else {
          setCourierLocation(null);
        }
        return;
      }
    }

    const deliveries = getDeliveriesByBusiness(businessId);
    const active = deliveries
      .filter((d) => d.courierId === courierId && !['delivered', 'cancelled', 'pending', 'scheduled'].includes(d.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const recent = deliveries
      .filter((d) => d.courierId === courierId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const show = active ?? recent ?? null;
    if (show && prevDeliveryStatus.current && prevDeliveryStatus.current !== show.status) {
      playStatusUpdate();
      if (show.status === 'delivered' && !showCompletionModal) {
        setShowCompletionModal(true);
      }
    }
    prevDeliveryStatus.current = show?.status ?? null;
    setActiveDelivery(show);

    if (courierId && show && !['delivered', 'cancelled'].includes(show.status)) {
      const loc = await getCourierLocationFromDB(courierId);
      if (loc) setCourierLocation({ lat: loc.latitude, lng: loc.longitude, updatedAt: loc.updatedAt });
    } else {
      setCourierLocation(null);
    }
  };

  useEffect(() => {
    loadConvs();
    if (businessId) syncConversationsDown(businessId, 'business').then(loadConvs);
  }, [businessId]);

  // ─── Load support ticket once ────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    const t = getOrCreateSupportTicket(businessId, 'business');
    setSupportTicket(t);
    const msgs = getSupportMessages(t.id);
    setSupportMessages(msgs);
    prevSupportCount.current = msgs.length;
  }, [businessId]);

  // ─── Poll support messages when in support mode ───────────────
  useEffect(() => {
    if (selectedConvId !== SUPPORT_ID || !supportTicket) return;
    const poll = async () => {
      await syncSupportMessagesDown(supportTicket.id);
      const fresh = getSupportMessages(supportTicket.id);
      if (fresh.length > prevSupportCount.current) {
        const newest = fresh[fresh.length - 1];
        if (newest.senderType === 'admin') playNewMessage();
        prevSupportCount.current = fresh.length;
      }
      setSupportMessages(fresh);
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvId, supportTicket]);

  // ─── Background poll support unread badge ────────────────────
  useEffect(() => {
    if (!supportTicket || selectedConvId === SUPPORT_ID) return;
    const poll = async () => {
      await syncSupportMessagesDown(supportTicket.id);
      setSupportMessages(getSupportMessages(supportTicket.id));
    };
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportTicket, selectedConvId]);

  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const selectedCourier = selectedConv ? getCourier(selectedConv.courierId) : null;

  useEffect(() => {
    if (!selectedConvId) return;
    setMessages(getMessages(selectedConvId));
    markMessagesRead(selectedConvId, 'business');
    loadConvs();

    const conv = conversations.find((c) => c.id === selectedConvId);
    if (conv) loadDelivery(conv.courierId);

    const poll = async () => {
      await syncMessagesDown(selectedConvId);
      const fresh = getMessages(selectedConvId);
      // Always update messages so courier messages appear immediately (real-time fix)
      if (fresh.length > prevMsgCount.current) {
        const newest = fresh[fresh.length - 1];
        if (newest.senderType !== 'business') playNewMessage();
        prevMsgCount.current = fresh.length;
      }
      setMessages(fresh);
      const c = conversations.find((x) => x.id === selectedConvId);
      if (c) await loadDelivery(c.courierId);
      loadConvs();
    };
    prevMsgCount.current = getMessages(selectedConvId).length;
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !selectedConvId) return;
    const msgContent = text.trim();
    addMessage(selectedConvId, {
      senderId: businessId,
      senderName: businessName,
      senderType: 'business',
      content: msgContent,
      messageType: 'text',
    });
    setText('');
    const fresh = getMessages(selectedConvId);
    prevMsgCount.current = fresh.length;
    setMessages(fresh);

    // Notify admin by email when sending to admin support conversation
    const conv = getConversations().find(c => c.id === selectedConvId);
    if (conv && (conv.courierId === 'admin' || conv.businessId === 'admin')) {
      sendAdminSupportNotification(businessName, 'business', msgContent).catch(() => {});
    }
  };

  const handleSupportSend = () => {
    if (!text.trim() || !supportTicket) return;
    addSupportMessage(supportTicket.id, 'user', businessName, text.trim());
    playNewMessage();
    setText('');
    const fresh = getSupportMessages(supportTicket.id);
    setSupportMessages(fresh);
    prevSupportCount.current = fresh.length;
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    toast.success(next ? '🔇 סאונד מושתק' : '🔊 סאונד פעיל');
  };

  const { recent, older } = groupConversations(conversations);

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);
    if (selectedConvId === id) setSelectedConvId(null);
    loadConvs();
    toast.success('השיחה נמחקה');
  };

  const ConvItem = ({ c }: { c: StoredConversation }) => {
    const active = c.id === selectedConvId;
    const [swipeX, setSwipeX] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const itemRef = useRef<HTMLDivElement>(null);
    const THRESHOLD = 70;

    const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchMove = (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = touchStartX.current - e.touches[0].clientX; // positive = swipe left
      if (dx > 0) setSwipeX(Math.min(dx, 90));
    };
    const onTouchEnd = () => {
      if (swipeX >= THRESHOLD) setShowConfirm(true);
      else setSwipeX(0);
      touchStartX.current = null;
    };

    const reset = () => { setSwipeX(0); setShowConfirm(false); };

    return (
      <div ref={itemRef} className="relative overflow-hidden rounded-2xl" style={{ border: `1px solid ${active ? '#c7d2fe' : '#e8ecf0'}` }}>
        {/* Delete reveal layer */}
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-center"
          style={{ width: 80, background: '#ef4444', zIndex: 1 }}
        >
          {showConfirm ? (
            <div className="flex flex-col items-center gap-1 px-2">
              <button
                onClick={() => handleDeleteConversation(c.id)}
                className="text-white text-[10px] font-bold bg-white/20 rounded-lg px-2 py-1"
              >
                אשר מחיקה
              </button>
              <button onClick={reset} className="text-white/70 text-[10px]">ביטול</button>
            </div>
          ) : (
            <TrashIcon className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Main row — slides left on swipe */}
        <div
          className="relative flex items-center gap-3 p-4 cursor-pointer transition-transform"
          style={{
            background: active ? '#eef2ff' : '#fff',
            transform: `translateX(-${showConfirm ? 80 : swipeX}px)`,
            transition: swipeX === 0 || showConfirm ? 'transform 0.2s ease' : 'none',
            zIndex: 2,
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={() => { if (swipeX < 5 && !showConfirm) { setSelectedConvId(c.id); setActiveDelivery(null); setCourierLocation(null); } else reset(); }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #061b31, #1c1e54)' }}
          >
            {(c.courierName || 'ש')[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold truncate" style={{ color: '#061b31' }}>{c.courierName || 'שליח'}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.unreadBusiness > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ background: '#ea2261' }}>
                    {c.unreadBusiness}
                  </span>
                )}
                {/* Desktop delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.id); }}
                  className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg transition-all hover:bg-red-50"
                  title="מחק שיחה"
                >
                  <TrashIcon className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
                </button>
              </div>
            </div>
            {c.lastMessage && (
              <p className="text-[12px] truncate mt-0.5" style={{ color: '#8898aa' }}>{c.lastMessage}</p>
            )}
            {c.lastMessageAt && (
              <p className="text-[10px] mt-0.5" style={{ color: '#c0cadd' }}>
                {new Date(c.lastMessageAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Support unread count (track last read via localStorage) ─
  const supportReadKey = `support_last_read_${businessId}`;
  const lastSupportRead = localStorage.getItem(supportReadKey) ?? '2000-01-01T00:00:00.000Z';
  const unreadSupport = supportMessages.filter(m => m.senderType === 'admin' && m.createdAt > lastSupportRead).length;
  const lastSupportMsg = supportMessages[supportMessages.length - 1];

  // ─── Conversation list ───────────────────────────────────────
  if (!selectedConvId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-5">
        <h1 className="text-[20px] font-black mb-5" style={{ color: '#061b31' }}>הודעות</h1>

        {/* ── Pinned support thread ── */}
        <div className="mb-4">
          <p className="text-[11px] font-bold mb-2 px-1" style={{ color: '#8898aa' }}>שירות לקוחות</p>
          <div
            className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
            style={{ background: '#fff', border: '1.5px solid #533afd30', boxShadow: '0 2px 8px rgba(83,58,253,0.08)' }}
            onClick={() => setSelectedConvId(SUPPORT_ID)}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[18px] flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #533afd22, #ea226122)', border: '1.5px solid #533afd30' }}
            >
              🎧
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-black" style={{ color: '#061b31' }}>מוקד שירות</p>
                {unreadSupport > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ background: '#ea2261' }}>
                    {unreadSupport > 9 ? '9+' : unreadSupport}
                  </span>
                )}
              </div>
              <p className="text-[12px] truncate mt-0.5" style={{ color: '#8898aa' }}>
                {lastSupportMsg
                  ? `${lastSupportMsg.senderType === 'admin' ? '🎧 תמיכה: ' : ''}${lastSupportMsg.content}`
                  : 'יש שאלה? צוות התמיכה כאן לעזור'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Courier conversations ── */}
        {conversations.length === 0 ? (
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
            style={{ background: '#fff', border: '1px solid #e8ecf0' }}
          >
            <ChatBubbleLeftRightIcon className="w-12 h-12" style={{ color: '#e8ecf0' }} />
            <p className="font-bold text-[15px]" style={{ color: '#061b31' }}>עדיין אין שיחות עם שליחים</p>
            <p className="text-[12px]" style={{ color: '#8898aa' }}>
              כאשר שליח יקבל את המשלוח שלך, תוכל לשלוח לו הודעות כאן
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recent.length > 0 && (
              <div>
                <p className="text-[11px] font-bold mb-2 px-1" style={{ color: '#8898aa' }}>היום</p>
                <div className="space-y-2">{recent.map((c) => <ConvItem key={c.id} c={c} />)}</div>
              </div>
            )}
            {older.length > 0 && (
              <div>
                <button
                  onClick={() => setShowOlder(!showOlder)}
                  className="text-[11px] font-bold px-1 mb-2 flex items-center gap-1"
                  style={{ color: '#8898aa' }}
                >
                  {showOlder ? '▾' : '▸'} שיחות ישנות ({older.length})
                </button>
                {showOlder && <div className="space-y-2">{older.map((c) => <ConvItem key={c.id} c={c} />)}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Support chat ─────────────────────────────────────────────
  if (selectedConvId === SUPPORT_ID) {
    // Mark all admin messages as read when entering support chat
    localStorage.setItem(supportReadKey, new Date().toISOString());
    return (
      <div className="flex flex-col h-[calc(100vh-130px)] max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#fff', borderBottom: '1px solid #e8ecf0' }}>
          <button onClick={() => setSelectedConvId(null)} className="text-[13px] font-semibold" style={{ color: '#533afd' }}>
            ← חזרה
          </button>
          <div className="flex-1">
            <p className="text-[14px] font-black" style={{ color: '#061b31' }}>🎧 מוקד שירות</p>
            <p className="text-[10px]" style={{ color: '#10b981' }}>● צוות אשדוד-שליח</p>
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#f6f9fc' }}>
          {supportMessages.length === 0 && (
            <div className="text-center mt-14">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#eef2ff' }}>
                <span className="text-3xl">🎧</span>
              </div>
              <p className="font-bold text-[14px] mb-1" style={{ color: '#061b31' }}>יש שאלה? אנחנו כאן</p>
              <p className="text-[12px]" style={{ color: '#8898aa' }}>שלח הודעה ונחזור אליך בהקדם</p>
            </div>
          )}
          {supportMessages.map((m) => {
            const isMine = m.senderType === 'user';
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[80%]">
                  {!isMine && (
                    <p className="text-[10px] mb-1 font-bold text-right" style={{ color: '#533afd' }}>🎧 תמיכה</p>
                  )}
                  <div
                    className="px-3.5 py-2.5 rounded-2xl text-[13px]"
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
                  <p className="text-[9px] mt-1" style={{ color: '#8898aa', textAlign: isMine ? 'right' : 'left' }}>
                    {new Date(m.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#fff', borderTop: '1px solid #e8ecf0' }}>
          <input
            className="flex-1 rounded-2xl px-4 py-2.5 text-[13px] outline-none"
            style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', color: '#061b31', direction: 'rtl' }}
            placeholder="כתוב הודעה לתמיכה..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSupportSend(); }}
          />
          <button
            onClick={handleSupportSend}
            disabled={!text.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
          >
            <PaperAirplaneIcon className="w-4 h-4 text-white" style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Active chat ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-w-lg mx-auto">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: '#fff', borderBottom: '1px solid #e8ecf0' }}
      >
        <button onClick={() => setSelectedConvId(null)} className="text-[13px] font-semibold" style={{ color: '#533afd' }}>
          ← חזרה
        </button>
        <div className="flex-1">
          <button
            className="text-right"
            onClick={() => selectedConv?.courierId !== 'admin' && selectedCourier && setShowCourierProfile(true)}
          >
            <p className="text-[14px] font-bold hover:underline" style={{ color: '#061b31' }}>
              {selectedConv?.courierId === 'admin' ? '🔧 מנהל האתר' : (selectedConv?.courierName ?? 'שליח')}
            </p>
            <p className="text-[10px]" style={{ color: '#10b981' }}>● מחובר בזמן אמת</p>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Courier map link — only for real courier conversations */}
          {courierLocation && selectedConv?.courierId !== 'admin' && (
            <a
              href={`https://maps.google.com/?q=${courierLocation.lat},${courierLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold"
              style={{ background: '#f0fdf4', color: '#10b981', border: '1px solid #bbf7d0' }}
              title={`עדכון: ${new Date(courierLocation.updatedAt).toLocaleTimeString('he-IL')}`}
            >
              📍 מיקום
            </a>
          )}
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: '#f0f4f8', color: '#8898aa' }}
          >
            {muted ? <SpeakerXMarkIcon className="w-4 h-4" /> : <SpeakerWaveIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Delivery banner */}
      {activeDelivery && <DeliveryBanner delivery={activeDelivery} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#f6f9fc' }}>
        {messages.length === 0 && (
          <p className="text-center text-[13px] mt-8" style={{ color: '#8898aa' }}>
            אין הודעות עדיין. שלח הודעה ראשונה!
          </p>
        )}
        {messages.map((m) => {
          // Delivery card message
          if (m.messageType === 'delivery_card') {
            let info: { pickupAddress?: string; dropAddress?: string; price?: number; paymentMethod?: string; description?: string } = {};
            try { info = JSON.parse(m.content) as typeof info; } catch { /* ignore */ }
            return (
              <div key={m.id} className="mx-0 my-1">
                <div className="rounded-2xl p-3 space-y-2" style={{ background: '#EAF7FD', border: `1px solid ${BLUE}30` }}>
                  <p className="text-[11px] font-black uppercase" style={{ color: BLUE }}>📦 פרטי משלוח</p>
                  {info.pickupAddress && <p className="text-[12px]" style={{ color: TEXT }}><span style={{ color: '#1BA672' }}>⬆ </span>{info.pickupAddress}</p>}
                  {info.dropAddress && <p className="text-[12px]" style={{ color: TEXT }}><span style={{ color: '#E23437' }}>⬇ </span>{info.dropAddress}</p>}
                  {info.price && <p className="text-[13px] font-black" style={{ color: BLUE }}>₪{info.price} · {info.paymentMethod === 'cash' ? 'מזומן' : 'ביט'}</p>}
                  {info.description && <p className="text-[11px]" style={{ color: TEXT2 }}>{info.description}</p>}
                </div>
              </div>
            );
          }

          // Proof message
          if (m.messageType === 'proof') {
            let info: { note?: string; hasPhoto?: boolean; photo?: string } = {};
            try { info = JSON.parse(m.content); } catch { /* ignore */ }
            return (
              <div key={m.id} className="mx-0 my-1 flex justify-end">
                <div className="rounded-2xl p-3 max-w-[85%]" style={{ background: '#E8F8F0', border: '1px solid #1BA67230' }}>
                  <p className="text-[11px] font-black mb-2" style={{ color: '#1BA672' }}>✅ אישור מסירה</p>
                  {info.hasPhoto && info.photo && (
                    <img src={info.photo} alt="proof" className="rounded-xl mb-2 max-h-40 object-cover w-full" />
                  )}
                  {info.note && <p className="text-[12px]" style={{ color: TEXT }}>{info.note}</p>}
                </div>
              </div>
            );
          }

          const isMine = m.senderType === 'business';
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
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

      {/* Courier profile modal */}
      {showCourierProfile && selectedCourier && (
        <CourierProfileModal courier={selectedCourier} onClose={() => setShowCourierProfile(false)} />
      )}

      {/* Business completion modal */}
      {showCompletionModal && activeDelivery && (
        <BusinessCompletionModal
          delivery={activeDelivery}
          businessId={businessId}
          onClose={() => setShowCompletionModal(false)}
        />
      )}
    </div>
  );
};

export default BusinessChat;
