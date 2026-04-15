import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { logoutUser } from '../../store/authSlice';
import { getPendingNotifications, getCourier, updateCourier, updateCourierLocation, getDeliveriesByCourier, getDeliveries, getOrCreateConversation, updateDelivery, getUnreadCount, getOrCreateSupportTicket, getSupportMessages, getConversations } from '../../services/storage.service';
import { playNewMessage } from '../../utils/sounds';
import { pingCandidateHeartbeat, getCandidacyStatus, withdrawFromQueue, syncConversationsDown, syncSupportMessagesDown } from '../../services/sync.service';
import { supabase } from '../../lib/supabase';
import { DeliveryNotificationOverlay } from '../../components/DeliveryNotificationOverlay';
import {
  HomeIcon,
  BellIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  BellIcon as BellIconSolid,
  TruckIcon as TruckIconSolid,
  ChatBubbleLeftRightIcon as ChatIconSolid,
  UserCircleIcon as UserIconSolid,
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const BLUE = '#009DE0';

const CourierLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  useEffect(() => { locationRef.current = location; }, [location]);
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);

  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [pendingCount,      setPendingCount]      = useState(0);
  const [chatUnread,        setChatUnread]        = useState(0);
  const [isAvailable,       setIsAvailable]       = useState(true);
  const [showAvailConfirm,  setShowAvailConfirm]  = useState(false);
  const [courierName,       setCourierName]       = useState('');

  // ── Pending candidacy banner ────────────────────────────────────
  interface CandidacyBanner { deliveryId: string; notifId: string; dropAddress: string; price: number; joinedAt: string; }
  const [candidacyBanner, setCandidacyBanner] = useState<CandidacyBanner | null>(null);
  const [withdrawing,     setWithdrawing]     = useState(false);

  // ── New-message toasts ───────────────────────────────────────
  interface MsgToast { id: string; name: string; preview: string; path: string; }
  const [msgToasts, setMsgToasts]   = useState<MsgToast[]>([]);
  const lastSeenAt   = useRef<Record<string, string>>({});
  const toastSeenIds = useRef<Set<string>>(new Set());
  const toastInitRef = useRef(false);

  const refreshAvailability = useCallback(() => {
    if (!courierId) return;
    const c = getCourier(courierId);
    setIsAvailable(c?.isAvailable ?? true);
    if (c?.name) setCourierName(c.name);
  }, [courierId]);

  useEffect(() => {
    const refresh = () => {
      if (!courierId) return;
      setPendingCount(getPendingNotifications(courierId).length);
      const convUnread = getUnreadCount(courierId, 'courier');
      try {
        const t = getOrCreateSupportTicket(courierId, 'courier');
        const msgs = getSupportMessages(t.id);
        const lastRead = localStorage.getItem(`support_last_read_${courierId}`) ?? '2000-01-01T00:00:00.000Z';
        const supportUnread = msgs.filter(m => m.senderType === 'admin' && m.createdAt > lastRead).length;
        setChatUnread(convUnread + supportUnread);
      } catch {
        setChatUnread(convUnread);
      }
    };
    refresh();
    refreshAvailability();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [courierId, refreshAvailability]);

  // Share live location when courier has an active delivery
  useEffect(() => {
    if (!courierId || !navigator.geolocation) return;
    const shareLocation = () => {
      const deliveries = getDeliveriesByCourier(courierId);
      const hasActive = deliveries.some((d) => d.status === 'accepted' || d.status === 'picked_up');
      if (!hasActive) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => updateCourierLocation(courierId, pos.coords.latitude, pos.coords.longitude),
        () => {},
        { timeout: 5000, enableHighAccuracy: true }
      );
    };
    shareLocation();
    const locId = setInterval(shareLocation, 30_000);
    return () => clearInterval(locId);
  }, [courierId]);

  // ── Poll pending_candidacy every 3s → drive the top banner ──────────────
  useEffect(() => {
    const check = () => {
      const raw = localStorage.getItem('pending_candidacy');
      if (!raw) { setCandidacyBanner(null); return; }
      try {
        const p: { deliveryId: string; notifId: string; joinedAt?: string } = JSON.parse(raw);
        const delivery = getDeliveries().find(d => d.id === p.deliveryId);
        setCandidacyBanner({
          deliveryId: p.deliveryId,
          notifId:    p.notifId,
          dropAddress: delivery?.dropAddress ?? '...',
          price:       delivery?.price ?? 0,
          joinedAt:    p.joinedAt ?? new Date().toISOString(),
        });
      } catch { setCandidacyBanner(null); }
    };
    check();
    const id = setInterval(check, 3_000);
    return () => clearInterval(id);
  }, []);

  const handleWithdraw = async () => {
    if (!candidacyBanner || !courierId) return;
    setWithdrawing(true);
    await withdrawFromQueue(candidacyBanner.deliveryId, courierId);
    localStorage.removeItem('pending_candidacy');
    setCandidacyBanner(null);
    setWithdrawing(false);
    toast.success('יצאת מהתור');
  };

  // ─── Heartbeat: ping every 20s while waiting for business acceptance ──────
  useEffect(() => {
    if (!courierId) return;
    const tick = async () => {
      const raw = localStorage.getItem('pending_candidacy');
      if (!raw) return;
      let parsed: { deliveryId: string; notifId: string };
      try { parsed = JSON.parse(raw); } catch { return; }
      const { deliveryId } = parsed;

      // Ping heartbeat
      await pingCandidateHeartbeat(deliveryId, courierId);

      // Check candidacy status
      const status = await getCandidacyStatus(deliveryId, courierId);
      if (status === 'accepted') {
        // Find delivery and open chat
        const allDeliveries = getDeliveries();
        const delivery = allDeliveries.find(d => d.id === deliveryId);
        if (delivery) {
          updateDelivery(deliveryId, { status: 'accepted', courierId, acceptedAt: new Date().toISOString() });
          const conv = getOrCreateConversation(delivery.businessId, courierId);
          localStorage.removeItem('pending_candidacy');
          toast.success('🎉 אושרת על ידי העסק!');
          navigate(`/courier/chat?convId=${conv.id}&deliveryId=${deliveryId}`);
        } else {
          localStorage.removeItem('pending_candidacy');
          toast.success('🎉 אושרת על ידי העסק!');
        }
      } else if (status === 'rejected') {
        localStorage.removeItem('pending_candidacy');
        toast.error('❌ העסק בחר שליח אחר, המשך לחפש');
      }
    };
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [courierId, navigate]);

  // ── Realtime: detect incoming messages on any page ───────────
  useEffect(() => {
    if (!courierId) return;

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
    //    More reliable than messages INSERT subscription.
    const msgChannel = supabase
      .channel(`cour_convs_${courierId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `courier_id=eq.${courierId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            unread_courier: number;
            last_message: string | null;
            last_message_at: string | null;
          };

          // Only fire when there are unread messages for the courier
          const newUnread = Number(row.unread_courier) || 0;
          if (newUnread <= 0) return;

          const convId = row.id;
          const loc = locationRef.current;
          const sp = new URLSearchParams(loc.search);
          const isOpen = loc.pathname === '/courier/chat' && sp.get('convId') === convId;
          if (isOpen) return;

          // Update local cache immediately
          syncConversationsDown(courierId, 'courier').catch(() => {});

          // Get business name from local cache
          const localConv = getConversations().find(c => c.id === convId);

          showToast(
            `${convId}__${row.last_message_at ?? Date.now()}`,
            localConv?.businessName || 'עסק',
            row.last_message || 'הודעה חדשה',
            `/courier/chat?convId=${convId}`,
          );
        },
      )
      .subscribe();

    // ── 2. Subscribe to support messages ─────────────────────────
    let supportTicketId: string | null = null;
    try {
      const t = getOrCreateSupportTicket(courierId, 'courier');
      supportTicketId = t.id;
    } catch { /* ignore */ }

    const suppChannel = supabase
      .channel(`cour_supp_${courierId}`)
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
          const isSupportOpen = loc.pathname === '/courier/chat' && sp.get('support') === '1';
          if (isSupportOpen) return;

          showToast(
            `support__${row.created_at}`,
            'מוקד שירות',
            row.content || 'הודעה חדשה',
            '/courier/chat?support=1',
          );
        },
      )
      .subscribe();

    // ── 3. Fallback sync every 12 s ───────────────────────────────
    const fallbackId = setInterval(async () => {
      await syncConversationsDown(courierId, 'courier').catch(() => {});
    }, 12_000);

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(suppChannel);
      clearInterval(fallbackId);
    };
  }, [courierId]);

  // ── Auto-dismiss toasts after 5 s ───────────────────────────
  useEffect(() => {
    if (msgToasts.length === 0) return;
    const timers = msgToasts.map(t =>
      setTimeout(() => setMsgToasts(p => p.filter(x => x.id !== t.id)), 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [msgToasts]);

  const confirmToggleAvailability = () => {
    if (!courierId) return;
    const next = !isAvailable;
    updateCourier(courierId, { isAvailable: next });
    setIsAvailable(next);
    setShowAvailConfirm(false);
    toast.success(next ? '🟢 אתה זמין לקבל משלוחים' : '🔴 סימנת את עצמך כלא זמין');
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const navItems = [
    { label: 'ראשי',     path: '/courier/dashboard',  icon: HomeIcon,                iconSolid: HomeIconSolid,  badge: 0 },
    { label: 'פנויים',   path: '/courier/available',  icon: BellIcon,               iconSolid: BellIconSolid,  badge: pendingCount },
    { label: 'משלוחים', path: '/courier/deliveries', icon: TruckIcon,              iconSolid: TruckIconSolid, badge: 0 },
    { label: 'צ׳אט',    path: '/courier/chat',       icon: ChatBubbleLeftRightIcon, iconSolid: ChatIconSolid,  badge: chatUnread },
    { label: 'פרופיל',  path: '/courier/profile',    icon: UserCircleIcon,         iconSolid: UserIconSolid,  badge: 0 },
  ];

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
              {courierName || user?.name || 'אשדוד-שליח'}
            </p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.72)' }}>פורטל שליחים</p>
          </div>
        </div>

        {/* Left: availability pill + logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAvailConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all active:scale-95"
            style={{
              background: isAvailable ? 'rgba(27,166,114,0.2)' : 'rgba(226,52,55,0.2)',
              border:     `1.5px solid ${isAvailable ? 'rgba(255,255,255,0.5)' : 'rgba(255,150,150,0.5)'}`,
              color:      'white',
            }}
          >
            <span
              className={isAvailable ? 'status-live' : 'w-2 h-2 rounded-full'}
              style={isAvailable ? {} : { background: '#FCA5A5' }}
            />
            {isAvailable ? 'זמין' : 'לא זמין'}
          </button>
          <button
            onClick={handleLogout}
            className="text-[13px] font-bold px-3 py-1.5 rounded-2xl transition-all active:scale-95"
            style={{ color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            יציאה
          </button>
        </div>
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

      {/* ── Persistent candidacy banner ── */}
      {candidacyBanner && (
        <div
          className="sticky top-[56px] z-30 flex items-center gap-3 px-4 py-2.5"
          style={{
            background: 'linear-gradient(90deg, #FFF8E6, #FFFCF0)',
            borderBottom: '1.5px solid #F58F1F30',
            boxShadow: '0 2px 8px rgba(245,143,31,0.10)',
          }}
        >
          {/* Pulsing dot */}
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#F58F1F' }} />

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black leading-tight truncate" style={{ color: '#202125' }}>
              ממתין לאישור העסק
            </p>
            <p className="text-[11px] truncate" style={{ color: '#F58F1F' }}>
              {candidacyBanner.dropAddress}
              {candidacyBanner.price > 0 && ` · ₪${candidacyBanner.price}`}
              {' · '}
              {Math.round((Date.now() - new Date(candidacyBanner.joinedAt).getTime()) / 60000)} דק׳ בתור
            </p>
          </div>

          {/* Cancel button */}
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: '#FFF0F0', color: '#E23437', border: '1px solid #E2343730' }}
          >
            {withdrawing ? '...' : 'ביטול'}
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
        {navItems.map(({ label, path, icon: Icon, iconSolid: IconSolid, badge }) => {
          const active = location.pathname === path ||
            (path === '/courier/dashboard' && location.pathname === '/courier');
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center justify-center relative flex-1 py-1"
              style={{ minWidth: 48, maxWidth: 80 }}
            >
              {active ? (
                <div className="nav-pill-active">
                  <div className="relative">
                    <IconSolid className="w-5 h-5 text-white" />
                    {badge > 0 && (
                      <span
                        className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center text-[8px] text-white font-bold"
                        style={{ background: '#F97316' }}
                      >
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-white leading-none">{label}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="relative">
                    <Icon className="w-6 h-6" style={{ color: '#9CA3AF' }} />
                    {badge > 0 && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                        style={{ background: '#E23437' }}
                      >
                        {badge > 9 ? '9+' : badge}
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

      {/* ── Delivery popup overlay ── */}
      <DeliveryNotificationOverlay />

      {/* ── Availability confirmation dialog ── */}
      {showAvailConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAvailConfirm(false); }}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl p-6"
            style={{ background: '#fff' }}
            dir="rtl"
          >
            {/* Handle bar */}
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E8E8E8' }} />

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]"
                style={{ background: isAvailable ? '#FFF0F0' : '#E8F8F0' }}
              >
                {isAvailable ? '🔴' : '🟢'}
              </div>
              <div>
                <h3 className="text-[17px] font-black" style={{ color: '#202125' }}>
                  {isAvailable ? 'סימון כלא זמין?' : 'סימון כזמין?'}
                </h3>
                <p className="text-[13px]" style={{ color: '#757575' }}>
                  {isAvailable
                    ? 'לא תקבל משלוחים חדשים'
                    : 'תתחיל לקבל התראות על משלוחים'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowAvailConfirm(false)}
                className="flex-1 py-3.5 rounded-2xl font-bold text-[14px]"
                style={{ background: '#F4F4F4', color: '#757575' }}
              >
                ביטול
              </button>
              <button
                onClick={confirmToggleAvailability}
                className="flex-1 py-3.5 rounded-2xl font-bold text-[14px] text-white"
                style={{ background: isAvailable ? '#E23437' : '#1BA672' }}
              >
                {isAvailable ? 'אשר — לא זמין' : 'אשר — זמין'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierLayout;
