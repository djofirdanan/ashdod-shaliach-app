import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getConversations,
  getMessages,
  addMessage,
  markMessagesRead,
  getDeliveries,
  updateDelivery,
  updateCourier,
  getCourier,
  deleteConversation,
  addReview,
  getOrCreateSupportTicket,
  getSupportMessages,
  addSupportMessage,
  type StoredConversation,
  type StoredMessage,
  type StoredDelivery,
  type SupportMessage,
  type SupportTicket,
} from '../../../services/storage.service';
import {
  syncDeliveriesDown,
  syncMessagesDown,
  syncConversationsDown,
  joinCandidatesQueue,
  courierApproveDelivery,
  saveDeliveryProof,
  insertMessage,
  syncSupportMessagesDown,
} from '../../../services/sync.service';
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
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { playNewMessage, getMuted, setMuted } from '../../../utils/sounds';

const BLUE  = '#009DE0';
const GREEN = '#1BA672';
const TEXT  = '#202125';
const TEXT2 = '#757575';

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

// ─── Proof Modal ───────────────────────────────────────────────
const ProofModal: React.FC<{
  onConfirm: (photo: string | null, note: string) => void;
  onClose: () => void;
}> = ({ onConfirm, onClose }) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg rounded-t-3xl p-5 pb-8" style={{ background: '#fff' }} dir="rtl">
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: '#E8E8E8' }} />
        <h3 className="text-[17px] font-black mb-1" style={{ color: '#202125' }}>אישור מסירה</h3>
        <p className="text-[12px] mb-4" style={{ color: '#757575' }}>ניתן להוסיף תמונה והערה כהוכחת מסירה (לא חובה)</p>

        {/* Photo upload */}
        <label className="block mb-3">
          <div
            className="w-full rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden"
            style={{ border: '2px dashed #E8E8E8', height: 100, background: photo ? 'transparent' : '#F8F9FA' }}
          >
            {photo
              ? <img src={photo} alt="proof" className="h-full w-full object-cover" />
              : <>
                  <span className="text-2xl">📷</span>
                  <span className="text-[12px] font-semibold" style={{ color: '#757575' }}>לחץ להוספת תמונה</span>
                </>
            }
          </div>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        </label>

        {/* Note */}
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="הערה (לא חובה)..."
          className="w-full rounded-2xl p-3 mb-4 text-[13px] resize-none outline-none"
          style={{ border: '1px solid #E8E8E8', background: '#F8F9FA', height: 72, direction: 'rtl' }}
        />

        <div className="space-y-2">
          <button
            onClick={() => onConfirm(photo, note)}
            className="w-full py-3.5 rounded-2xl font-black text-[15px] text-white"
            style={{ background: GREEN }}
          >
            ✅ אשר מסירה
          </button>
          <button onClick={onClose} className="w-full py-3 rounded-2xl text-[13px] font-semibold" style={{ background: '#F4F4F4', color: '#757575' }}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Completion / Review Modal ─────────────────────────────────
const CompletionModal: React.FC<{
  delivery: StoredDelivery;
  courierId: string;
  onClose: () => void;
}> = ({ delivery, courierId, onClose }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [addFav, setAddFav] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating > 0) {
      addReview({
        reviewerId: courierId,
        reviewerType: 'courier',
        targetId: delivery.businessId,
        targetType: 'business',
        rating,
        comment: comment || undefined,
        deliveryId: delivery.id,
      });
    }
    if (addFav) {
      const courier = getCourier(courierId);
      if (courier) {
        const favs = courier.favoriteBusinesses ?? [];
        if (!favs.includes(delivery.businessId)) {
          updateCourier(courierId, { favoriteBusinesses: [...favs, delivery.businessId] });
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
        <h3 className="text-[18px] font-black text-center mb-1" style={{ color: '#202125' }}>משלוח הושלם!</h3>
        <p className="text-[12px] text-center mb-5" style={{ color: '#757575' }}>איך היה העסק {delivery.businessName}?</p>

        {/* Star rating */}
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
          <span className="text-[13px] font-semibold" style={{ color: '#202125' }}>הוסף לעסקים המועדפים שלי ❤️</span>
        </label>

        <div className="space-y-2">
          <button onClick={handleSubmit} className="w-full py-3.5 rounded-2xl font-black text-[15px] text-white" style={{ background: GREEN }}>
            {rating > 0 ? 'שלח ביקורת' : 'סיים ללא ביקורת'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Delivery context banner ─────────────────── */
const DeliveryBanner: React.FC<{
  delivery: StoredDelivery;
  courierId: string;
  userName: string;
  convId: string;
  onStatusUpdate: () => void;
  onShowProof: () => void;
}> = ({ delivery, courierId, userName, convId, onStatusUpdate, onShowProof }) => {
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
              style={{ background: isDone ? '#dcfce7' : '#e0e7ff', color: isDone ? '#10b981' : '#533afd' }}
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

      {/* Approve button when delivery is pending */}
      {delivery.status === 'pending' && (
        <button
          onClick={async () => {
            const courierData = getCourier(courierId);
            if (!courierData) return;
            await joinCandidatesQueue(delivery.id, courierId, courierData.name, courierData.rating, courierData.vehicle);
            await courierApproveDelivery(delivery.id, courierId);
            localStorage.setItem('pending_candidacy', JSON.stringify({ deliveryId: delivery.id, notifId: '', joinedAt: new Date().toISOString() }));
            toast.success('אישרת את המשלוח! ממתין לאישור העסק 🕐');
          }}
          className="w-full py-3 rounded-2xl font-bold text-[14px] text-white flex items-center justify-center gap-2"
          style={{ background: GREEN }}
        >
          ✅ אשר משלוח
        </button>
      )}

      {/* Action buttons */}
      {!isDone && (
        <div className="flex gap-2 flex-wrap">
          {/* Navigation button */}
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
              onClick={onShowProof}
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
  const [searchParams] = useSearchParams();

  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';
  const courierName = getCourier(courierId)?.name ?? 'שליח';

  // Parse URL params
  const urlSearchParams = new URLSearchParams(location.search);
  const initialConvId = urlSearchParams.get('convId');
  const urlDeliveryId = urlSearchParams.get('deliveryId');
  const prefill = searchParams.get('prefill');
  const urlSupportOpen = searchParams.get('support') === '1';

  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(
    initialConvId ?? (urlSupportOpen ? '__support__' : null)
  );
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [text, setText] = useState(prefill ? decodeURIComponent(prefill) : '');
  const [delivery, setDelivery] = useState<StoredDelivery | null>(null);
  const [muted, setMutedState] = useState(getMuted());
  const [showOlder, setShowOlder] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);

  // ─── Support thread state ────────────────────────────────────
  const SUPPORT_ID = '__support__';
  const [supportTicket, setSupportTicket] = useState<SupportTicket | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const prevSupportCount = useRef(0);

  const loadConvs = () => {
    const all = getConversations().filter((c) => c.courierId === courierId);
    setConversations(all.sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')));
  };

  const loadDelivery = async () => {
    if (!urlDeliveryId) return;
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

  // ─── Load support ticket once ────────────────────────────────
  useEffect(() => {
    if (!courierId) return;
    const t = getOrCreateSupportTicket(courierId, 'courier');
    setSupportTicket(t);
    const msgs = getSupportMessages(t.id);
    setSupportMessages(msgs);
    prevSupportCount.current = msgs.length;
  }, [courierId]);

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

    const conv = getConversations().find(c => c.id === selectedConvId);
    if (conv && (conv.courierId === 'admin' || conv.businessId === 'admin')) {
      sendAdminSupportNotification(courierName, 'courier', msgContent).catch(() => {});
    }
  };

  const handleSupportSend = () => {
    if (!text.trim() || !supportTicket) return;
    addSupportMessage(supportTicket.id, 'user', courierName, text.trim());
    playNewMessage();
    setText('');
    const fresh = getSupportMessages(supportTicket.id);
    setSupportMessages(fresh);
    prevSupportCount.current = fresh.length;
  };

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);
    if (selectedConvId === id) setSelectedConvId(null);
    loadConvs();
    toast.success('השיחה נמחקה');
  };

  // ─── Proof confirm ────────────────────────────────────────────
  const handleProofConfirm = async (photo: string | null, note: string) => {
    if (!delivery) return;
    // Update delivery
    updateDelivery(delivery.id, {
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      proofPhotoUrl: photo ?? undefined,
      proofNote: note || undefined,
      proofSubmittedAt: new Date().toISOString(),
    });
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
    // Save proof to Supabase
    await saveDeliveryProof(delivery.id, photo, note || null).catch(console.error);
    // Send proof message to chat
    if (selectedConvId) {
      const proofContent = JSON.stringify({ note: note || '', hasPhoto: !!photo, photo });
      const proofMsg: StoredMessage = {
        id: Math.random().toString(36).slice(2),
        conversationId: selectedConvId,
        senderId: courierId,
        senderName: getCourier(courierId)?.name ?? 'שליח',
        senderType: 'courier',
        content: proofContent,
        messageType: 'proof',
        deliveryId: delivery.id,
        createdAt: new Date().toISOString(),
      };
      const all = JSON.parse(localStorage.getItem('app_messages') ?? '[]');
      localStorage.setItem('app_messages', JSON.stringify([...all, proofMsg]));
      insertMessage(proofMsg).catch(console.error);
      setMessages(getMessages(selectedConvId));
    }
    // Also send system message
    addMessage(selectedConvId ?? '', {
      senderId: courierId,
      senderName: courierName,
      senderType: 'courier',
      content: '✅ המשלוח נמסר! עבודה מצוינת!',
      messageType: 'text',
    });
    setShowProofModal(false);
    toast.success('משלוח אושר! תודה 🎉');
    // Update local delivery state
    const d = getDeliveries().find(x => x.id === delivery.id);
    setDelivery(d ?? null);
    // Show review modal after delay
    setTimeout(() => setShowReviewModal(true), 1000);
  };

  const ConvBtn = ({ c }: { c: StoredConversation }) => {
    const [swipeX, setSwipeX] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const THRESHOLD = 70;

    const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchMove = (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = touchStartX.current - e.touches[0].clientX;
      if (dx > 0) setSwipeX(Math.min(dx, 90));
    };
    const onTouchEnd = () => {
      if (swipeX >= THRESHOLD) setShowConfirm(true);
      else setSwipeX(0);
      touchStartX.current = null;
    };
    const reset = () => { setSwipeX(0); setShowConfirm(false); };

    return (
      <div className="relative overflow-hidden rounded-2xl" style={{ border: '1px solid #e8ecf0' }}>
        <div className="absolute inset-y-0 left-0 flex items-center justify-center" style={{ width: 80, background: '#ef4444', zIndex: 1 }}>
          {showConfirm ? (
            <div className="flex flex-col items-center gap-1 px-2">
              <button onClick={() => handleDeleteConversation(c.id)} className="text-white text-[10px] font-bold bg-white/20 rounded-lg px-2 py-1">אשר מחיקה</button>
              <button onClick={reset} className="text-white/70 text-[10px]">ביטול</button>
            </div>
          ) : (
            <TrashIcon className="w-5 h-5 text-white" />
          )}
        </div>

        <div
          className="relative flex items-center gap-3 p-4 cursor-pointer"
          style={{
            background: '#fff',
            transform: `translateX(-${showConfirm ? 80 : swipeX}px)`,
            transition: swipeX === 0 || showConfirm ? 'transform 0.2s ease' : 'none',
            zIndex: 2,
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={() => { if (swipeX < 5 && !showConfirm) setSelectedConvId(c.id); else reset(); }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0" style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}>
            {c.businessName[0] ?? 'ע'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold truncate" style={{ color: '#061b31' }}>{c.businessName}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.unreadCourier > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ background: '#ea2261' }}>{c.unreadCourier}</span>
                )}
                <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.id); }} className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-red-50" title="מחק שיחה">
                  <TrashIcon className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
                </button>
              </div>
            </div>
            {c.lastMessage && <p className="text-[12px] truncate mt-0.5" style={{ color: '#8898aa' }}>{c.lastMessage}</p>}
            {c.lastMessageAt && <p className="text-[10px] mt-0.5" style={{ color: '#c0cadd' }}>{new Date(c.lastMessageAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>}
          </div>
        </div>
      </div>
    );
  };

  const handleBack = () => {
    if (initialConvId) navigate('/courier/chat', { replace: true });
    setSelectedConvId(null);
    setDelivery(null);
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  // ─── Support unread / last msg ───────────────────
  const supportReadKey = `support_last_read_${courierId}`;
  const lastSupportRead = localStorage.getItem(supportReadKey) ?? '2000-01-01T00:00:00.000Z';
  const unreadSupport = supportMessages.filter(m => m.senderType === 'admin' && m.createdAt > lastSupportRead).length;
  const lastSupportMsg = supportMessages[supportMessages.length - 1];

  // ─── Conversation list ─────────────────────────
  if (!selectedConvId) {
    const todayStr = new Date().toDateString();
    const recent = conversations.filter((c) => {
      const d = c.lastMessageAt ? new Date(c.lastMessageAt) : new Date(c.createdAt);
      return d.toDateString() === todayStr;
    });
    const older = conversations.filter((c) => {
      const d = c.lastMessageAt ? new Date(c.lastMessageAt) : new Date(c.createdAt);
      return d.toDateString() !== todayStr;
    });

    return (
      <div className="max-w-lg mx-auto px-4 py-5">
        <h1 className="text-[20px] font-black mb-5" style={{ color: '#061b31' }}>הודעות</h1>

        {/* ── Pinned support thread ── */}
        <div className="mb-3">
          <p className="text-[10px] font-bold mb-1.5 px-1" style={{ color: '#8898aa' }}>שירות לקוחות</p>
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
            style={{ background: '#fff', border: '1px solid #533afd20', boxShadow: '0 1px 4px rgba(83,58,253,0.05)' }}
            onClick={() => setSelectedConvId(SUPPORT_ID)}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] flex-shrink-0"
              style={{ background: '#533afd12' }}
            >
              🎧
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold" style={{ color: '#061b31' }}>מוקד שירות</p>
                {unreadSupport > 0 && (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-bold" style={{ background: '#ea2261' }}>
                    {unreadSupport > 9 ? '9+' : unreadSupport}
                  </span>
                )}
              </div>
              <p className="text-[11px] truncate" style={{ color: '#8898aa' }}>
                {lastSupportMsg
                  ? `${lastSupportMsg.senderType === 'admin' ? 'תמיכה: ' : ''}${lastSupportMsg.content}`
                  : 'יש שאלה? צוות התמיכה כאן לעזור'}
              </p>
            </div>
          </div>
        </div>

        {conversations.length === 0 ? (
          <div className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center" style={{ background: '#fff', border: '1px solid #e8ecf0' }}>
            <ChatBubbleLeftRightIcon className="w-12 h-12" style={{ color: '#e8ecf0' }} />
            <p className="font-bold text-[15px]" style={{ color: '#061b31' }}>עדיין אין שיחות עם עסקים</p>
            <p className="text-[12px]" style={{ color: '#8898aa' }}>כאשר תקבל משלוח, תוכל לדבר עם בעל העסק כאן</p>
          </div>
        ) : (
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
        )}
      </div>
    );
  }

  // ─── Support chat view ─────────────────────────
  if (selectedConvId === SUPPORT_ID) {
    // Mark as read on open
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

  // ─── Active chat ───────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-w-lg mx-auto">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#fff', borderBottom: '1px solid #e8ecf0' }}>
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
          onShowProof={() => setShowProofModal(true)}
        />
      )}

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
              <div key={m.id} className="mx-0 my-1 flex justify-start">
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

          const isMine = m.senderType === 'courier';
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
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#fff', borderTop: '1px solid #e8ecf0' }}>
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

      {/* Proof modal */}
      {showProofModal && (
        <ProofModal
          onConfirm={handleProofConfirm}
          onClose={() => setShowProofModal(false)}
        />
      )}

      {/* Completion / review modal */}
      {showReviewModal && delivery && (
        <CompletionModal
          delivery={delivery}
          courierId={courierId}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
};

export default CourierChat;
