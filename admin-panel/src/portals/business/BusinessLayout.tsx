import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { logoutUser } from '../../store/authSlice';
import {
  getUnreadCount,
  getBusiness,
  getDeliveriesByBusiness,
  getOrCreateConversation,
  getOrCreateSupportTicket,
  getSupportMessages,
} from '../../services/storage.service';
import { supabase } from '../../lib/supabase';
import { getConversations } from '../../services/storage.service';
import { syncConversationsDown, syncSupportMessagesDown } from '../../services/sync.service';
import { playNewMessage } from '../../utils/sounds';
import {
  HomeIcon,
  PlusCircleIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  CheckIcon,
  MapPinIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  TruckIcon as TruckIconSolid,
  ChatBubbleLeftRightIcon as ChatIconSolid,
  UserCircleIcon as UserIconSolid,
  PlusCircleIcon as PlusIconSolid,
} from '@heroicons/react/24/solid';

const navItems = [
  { label: 'ראשי',       path: '/business/dashboard',    icon: HomeIcon,                iconSolid: HomeIconSolid  },
  { label: 'משלוח חדש', path: '/business/new-delivery', icon: PlusCircleIcon,          iconSolid: PlusIconSolid  },
  { label: 'משלוחים',   path: '/business/deliveries',   icon: TruckIcon,              iconSolid: TruckIconSolid },
  { label: 'צ׳אט',      path: '/business/chat',         icon: ChatBubbleLeftRightIcon, iconSolid: ChatIconSolid  },
  { label: 'פרופיל',    path: '/business/profile',      icon: UserCircleIcon,          iconSolid: UserIconSolid  },
];

const BLUE   = '#009DE0';
const GREEN  = '#1BA672';
const ORANGE = '#F58F1F';

// ─── Status popup types ───────────────────────────────────────
interface StatusPopup {
  status: 'picked_up' | 'delivered';
  courierName: string;
  courierId: string;
  pickupAddress: string;
  dropAddress: string;
  price: number;
  deliveryId: string;
}

// ─── DeliveryStatusPopup component ───────────────────────────
const DeliveryStatusPopup: React.FC<{
  popup: StatusPopup;
  businessId: string;
  onClose: () => void;
  navigate: ReturnType<typeof useNavigate>;
}> = ({ popup, businessId, onClose, navigate }) => {
  const isPickedUp = popup.status === 'picked_up';
  const accentColor = isPickedUp ? ORANGE : GREEN;
  const title = isPickedUp ? 'השליח אסף את החבילה' : 'המשלוח נמסר ללקוח';

  const handleOpenChat = () => {
    const conv = getOrCreateConversation(businessId, popup.courierId);
    onClose();
    navigate(`/business/chat?convId=${conv.id}`);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        dir="rtl"
        className="fixed bottom-0 right-0 left-0 z-50 rounded-t-3xl px-5 pt-4 pb-8"
        style={{
          background: '#FFFFFF',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.18)',
          animation: 'slideUp 0.28s ease',
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ background: '#E8E8E8' }} />
        </div>

        {/* Icon + title */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: accentColor + '18' }}
          >
            {isPickedUp
              ? <TruckIcon  className="w-6 h-6" style={{ color: accentColor }} />
              : <CheckIcon  className="w-6 h-6" style={{ color: accentColor }} />
            }
          </div>
          <div>
            <p className="text-[16px] font-black" style={{ color: '#202125' }}>{title}</p>
            <p className="text-[13px] font-semibold" style={{ color: '#757575' }}>{popup.courierName}</p>
          </div>
        </div>

        {/* Info card */}
        <div
          className="rounded-2xl p-4 mb-4 space-y-3"
          style={{ background: '#F4F4F4', border: '1px solid #E8E8E8' }}
        >
          {/* Pickup address */}
          <div className="flex items-start gap-3">
            <MapPinIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
            <div>
              <p className="text-[11px] font-semibold" style={{ color: '#757575' }}>איסוף</p>
              <p className="text-[13px] font-medium" style={{ color: '#202125' }}>{popup.pickupAddress}</p>
            </div>
          </div>

          {/* Drop address */}
          <div className="flex items-start gap-3">
            <MapPinIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#E23437' }} />
            <div>
              <p className="text-[11px] font-semibold" style={{ color: '#757575' }}>מסירה</p>
              <p className="text-[13px] font-medium" style={{ color: '#202125' }}>{popup.dropAddress}</p>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <BanknotesIcon className="w-5 h-5 flex-shrink-0" style={{ color: BLUE }} />
            <p className="text-[14px] font-black" style={{ color: BLUE }}>₪{popup.price}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleOpenChat}
            className="flex-1 py-3 rounded-2xl font-bold text-[14px] text-white transition-all active:scale-95"
            style={{ background: BLUE, boxShadow: `0 4px 14px ${BLUE}40` }}
          >
            פתח צ׳אט
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-bold text-[14px] transition-all active:scale-95"
            style={{ background: '#F0F0F0', color: '#757575' }}
          >
            סגור
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

// ─── BusinessLayout ───────────────────────────────────────────
const BusinessLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  useEffect(() => { locationRef.current = location; }, [location]);
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);

  const token = localStorage.getItem('admin_token') ?? '';
  const businessId = token.startsWith('business-') ? token.replace('business-', '') : '';

  const [unread,            setUnread]            = useState(0);
  const [bizName,           setBizName]           = useState('');
  const [waitingDelivery,   setWaitingDelivery]   = useState<{ id: string; dropAddress: string; candidateCount: number } | null>(null);
  const [statusPopup,       setStatusPopup]       = useState<StatusPopup | null>(null);

  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── New-message toasts ───────────────────────────────────────
  interface MsgToast { id: string; name: string; preview: string; path: string; }
  const [msgToasts, setMsgToasts]   = useState<MsgToast[]>([]);
  const lastSeenAt   = useRef<Record<string, string>>({});
  const toastSeenIds = useRef<Set<string>>(new Set());
  const toastInitRef = useRef(false);

  // Clear popup after 10 seconds
  const showPopup = (p: StatusPopup) => {
    setStatusPopup(p);
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    popupTimerRef.current = setTimeout(() => setStatusPopup(null), 10_000);
  };

  const closePopup = () => {
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    setStatusPopup(null);
  };

  useEffect(() => {
    const refresh = () => {
      if (businessId) {
        const chatUnread = getUnreadCount(businessId, 'business');
        try {
          const t = getOrCreateSupportTicket(businessId, 'business');
          const msgs = getSupportMessages(t.id);
          const lastRead = localStorage.getItem(`support_last_read_${businessId}`) ?? '2000-01-01T00:00:00.000Z';
          const supportUnread = msgs.filter(m => m.senderType === 'admin' && m.createdAt > lastRead).length;
          setUnread(chatUnread + supportUnread);
        } catch {
          setUnread(chatUnread);
        }
        const biz = getBusiness(businessId);
        if (biz) setBizName(biz.businessName);
      }
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [businessId]);

  // ── Poll every 6s: check if any pending delivery has a courier waiting ──
  useEffect(() => {
    if (!businessId) return;
    const check = async () => {
      const deliveries = getDeliveriesByBusiness(businessId);
      const pending = deliveries.filter(d => d.status === 'pending' || d.status === 'scheduled');
      for (const d of pending) {
        const { data } = await supabase
          .from('delivery_candidates')
          .select('id')
          .eq('delivery_id', d.id)
          .eq('status', 'waiting');
        if (data && data.length > 0) {
          setWaitingDelivery({ id: d.id, dropAddress: d.dropAddress, candidateCount: data.length });
          return;
        }
      }
      setWaitingDelivery(null);
    };
    check();
    const id = setInterval(check, 6_000);
    return () => clearInterval(id);
  }, [businessId]);

  // ── Supabase Realtime: delivery status changes ──
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`business_delivery_updates_${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
        },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          const o = payload.old as Record<string, unknown>;

          if (
            n.business_id !== businessId
          ) return;

          const newStatus = n.status as string;
          const oldStatus = o.status as string;

          if (
            (newStatus === 'picked_up' || newStatus === 'delivered') &&
            oldStatus !== newStatus
          ) {
            showPopup({
              status: newStatus as 'picked_up' | 'delivered',
              courierName:   (n.courier_name   as string)  || 'שליח',
              courierId:     (n.courier_id      as string)  || '',
              pickupAddress: (n.pickup_address  as string)  || '',
              dropAddress:   (n.drop_address    as string)  || '',
              price:         (n.price           as number)  ?? 0,
              deliveryId:    (n.id              as string)  || '',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // Cleanup popup timer on unmount
  useEffect(() => {
    return () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, []);

  // ── Realtime: detect incoming messages on any page ───────────
  useEffect(() => {
    if (!businessId) return;

    // helper: show a toast if conditions are met
    const showToast = (toastId: string, name: string, preview: string, path: string) => {
      if (toastSeenIds.current.has(toastId)) return;
      toastSeenIds.current.add(toastId);
      playNewMessage();
      setMsgToasts(prev => [
        ...prev.slice(-2),
        { id: toastId, name, preview, path },
      ]);
    };

    // ── 1. Subscribe to conversation updates (unread count change = new message)
    //    This is more reliable than messages INSERT because the conversations table
    //    is already used by upsertConversation on every sent message.
    const msgChannel = supabase
      .channel(`biz_convs_${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            unread_business: number;
            last_message: string | null;
            last_message_at: string | null;
          };

          // Only fire when there are unread messages for the business
          const newUnread = Number(row.unread_business) || 0;
          if (newUnread <= 0) return;

          const convId = row.id;
          const loc = locationRef.current;
          const sp = new URLSearchParams(loc.search);
          const isOpen = loc.pathname === '/business/chat' && sp.get('convId') === convId;
          if (isOpen) return;

          // Update local cache immediately
          syncConversationsDown(businessId, 'business').catch(() => {});

          // Get courier name from local cache (may be empty if not yet synced)
          const localConv = getConversations().find(c => c.id === convId);

          showToast(
            `${convId}__${row.last_message_at ?? Date.now()}`,
            localConv?.courierName || 'שליח',
            row.last_message || 'הודעה חדשה',
            `/business/chat?convId=${convId}`,
          );
        },
      )
      .subscribe();

    // ── 2. Subscribe to support messages ─────────────────────────
    let supportTicketId: string | null = null;
    try {
      const t = getOrCreateSupportTicket(businessId, 'business');
      supportTicketId = t.id;
    } catch { /* ignore */ }

    const suppChannel = supabase
      .channel(`biz_supp_${businessId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const row = payload.new as {
            ticket_id: string;
            sender_type: string;
            content: string;
            created_at: string;
          };
          if (row.sender_type !== 'admin') return;
          if (supportTicketId && row.ticket_id !== supportTicketId) return;

          const loc = locationRef.current;
          const sp = new URLSearchParams(loc.search);
          const isSupportOpen = loc.pathname === '/business/chat' && sp.get('support') === '1';
          if (isSupportOpen) return;

          showToast(
            `support__${row.created_at}`,
            'מוקד שירות',
            row.content || 'הודעה חדשה',
            '/business/chat?support=1',
          );
        },
      )
      .subscribe();

    // ── 3. Fallback: sync + re-check badge every 12 s ────────────
    const fallbackId = setInterval(async () => {
      await syncConversationsDown(businessId, 'business').catch(() => {});
      // Badge is updated by the existing `refresh` useEffect; nothing extra needed here
    }, 12_000);

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(suppChannel);
      clearInterval(fallbackId);
    };
  }, [businessId]);

  // ── Auto-dismiss toasts after 5 s ───────────────────────────
  useEffect(() => {
    if (msgToasts.length === 0) return;
    const timers = msgToasts.map(t =>
      setTimeout(() => setMsgToasts(p => p.filter(x => x.id !== t.id)), 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [msgToasts]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #EFF6FF 0%, #F0F4FF 100%)' }}>

      {/* ── Top header ── */}
      <header
        className="portal-header flex items-center justify-between px-4 sticky top-0 z-40"
        style={{ height: 60 }}
      >
        {/* Right: logo + name */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)' }}
          >
            <TruckIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-[15px] leading-tight text-white">
              {bizName || user?.name || 'אשדוד-שליח'}
            </p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.72)' }}>פורטל עסקים</p>
          </div>
        </div>

        {/* Left: logout */}
        <button
          onClick={handleLogout}
          className="text-[13px] font-bold px-4 py-1.5 rounded-2xl transition-all active:scale-95"
          style={{ color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
        >
          יציאה
        </button>
      </header>

      {/* ── New-message toasts ── */}
      {msgToasts.length > 0 && (
        <div
          dir="rtl"
          className="fixed top-[64px] left-0 right-0 z-[500] flex flex-col gap-2 px-3 pt-2 pointer-events-none"
        >
          {msgToasts.map((t) => (
            <div
              key={t.id}
              className="msg-toast pointer-events-auto flex items-center gap-3 px-3 py-2.5"
              style={{
                animation: 'slideDownToast 0.35s cubic-bezier(.34,1.56,.64,1)',
                maxWidth: 420,
                marginLeft: 'auto',
                marginRight: 'auto',
                width: '100%',
              }}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-[14px] font-black flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563EB, #009DE0)' }}
              >
                {t.name[0]}
              </div>
              {/* Text */}
              <button
                className="flex-1 min-w-0 text-right"
                onClick={() => { navigate(t.path); setMsgToasts(p => p.filter(x => x.id !== t.id)); }}
              >
                <p className="text-[12px] font-black truncate" style={{ color: '#1E3A8A' }}>{t.name}</p>
                <p className="text-[11px] truncate" style={{ color: '#6B7280' }}>{t.preview}</p>
              </button>
              {/* Close */}
              <button
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                style={{ background: '#EFF6FF', color: '#93C5FD' }}
                onClick={() => setMsgToasts(p => p.filter(x => x.id !== t.id))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideDownToast {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* ── Persistent courier-waiting banner ── */}
      {waitingDelivery && (
        <div
          className="sticky top-[56px] z-30 flex items-center gap-3 px-4 py-2.5"
          style={{
            background: 'linear-gradient(90deg, #EAF7FD, #F0FAFF)',
            borderBottom: '1.5px solid #009DE030',
            boxShadow: '0 2px 8px rgba(0,157,224,0.10)',
          }}
        >
          {/* Pulsing dot */}
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: BLUE }} />

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black leading-tight" style={{ color: '#202125' }}>
              {waitingDelivery.candidateCount === 1 ? 'שליח ממתין לאישורך' : `${waitingDelivery.candidateCount} שליחים ממתינים`}
            </p>
            <p className="text-[11px] truncate" style={{ color: '#757575' }}>
              {waitingDelivery.dropAddress}
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={() => navigate(`/business/dashboard?tracking=${waitingDelivery.id}`)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white transition-all active:scale-95"
            style={{ background: BLUE }}
          >
            אשר עכשיו
          </button>
        </div>
      )}

      {/* ── Page content ── */}
      <main className="flex-1 overflow-y-auto pb-[72px]">
        <Outlet />
      </main>

      {/* ── Bottom navigation ── */}
      <nav
        className="nav-glass fixed bottom-0 right-0 left-0 z-40 flex items-center justify-around px-2"
        style={{ height: 68 }}
      >
        {navItems.map(({ label, path, icon: Icon, iconSolid: IconSolid }) => {
          const active = location.pathname === path ||
            (path === '/business/dashboard' && location.pathname === '/business');
          const isChat = path === '/business/chat';
          const isNew  = path === '/business/new-delivery';
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center justify-center relative flex-1 py-1"
              style={{ minWidth: 48, maxWidth: 80 }}
            >
              {/* "New delivery" gets a raised orange FAB */}
              {isNew ? (
                <div className="flex flex-col items-center gap-0.5 -mt-6">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{
                      background: 'linear-gradient(135deg, #F97316, #EA580C)',
                      boxShadow: '0 4px 16px rgba(249,115,22,0.45), 0 0 0 3px #EFF6FF',
                    }}
                  >
                    <IconSolid className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[9px] font-bold" style={{ color: '#F97316' }}>{label}</span>
                </div>
              ) : active ? (
                <div className="nav-pill-active">
                  <IconSolid className="w-5 h-5 text-white" />
                  <span className="text-[9px] font-bold text-white leading-none">{label}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="relative">
                    <Icon className="w-6 h-6" style={{ color: '#9CA3AF' }} />
                    {isChat && unread > 0 && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                        style={{ background: '#E23437' }}
                      >
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-medium" style={{ color: '#9CA3AF' }}>{label}</span>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Delivery status popup ── */}
      {statusPopup && (
        <DeliveryStatusPopup
          popup={statusPopup}
          businessId={businessId}
          onClose={closePopup}
          navigate={navigate}
        />
      )}
    </div>
  );
};

export default BusinessLayout;
