import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { logoutUser } from '../../store/authSlice';
import { getPendingNotifications, getCourier, updateCourier, updateCourierLocation, getDeliveriesByCourier, getDeliveries, getOrCreateConversation, updateDelivery, getUnreadCount, getOrCreateSupportTicket, getSupportMessages, getConversations, getBusinesses, formatOrderNumber, type StoredDelivery } from '../../services/storage.service';
import { playNewMessage } from '../../utils/sounds';
import { pingCandidateHeartbeat, getCandidacyStatus, withdrawFromQueue, syncConversationsDown, syncSupportMessagesDown, syncCourierDeliveriesDown } from '../../services/sync.service';
import { supabase } from '../../lib/supabase';
import { DeliveryNotificationOverlay } from '../../components/DeliveryNotificationOverlay';
import {
  House,
  Bell,
  Truck as PhosphorTruck,
  ChatCircle,
  User,
} from '@phosphor-icons/react';
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

  const [activeBizCount,    setActiveBizCount]    = useState(0);
  const [pendingCount,      setPendingCount]      = useState(0);
  const [chatUnread,        setChatUnread]        = useState(0);
  const [isAvailable,       setIsAvailable]       = useState(true);
  const [showAvailConfirm,  setShowAvailConfirm]  = useState(false);
  const [courierName,       setCourierName]       = useState('');
  const [courierPhoto,      setCourierPhoto]      = useState<string | null>(null);

  // ── Pending candidacy banner ────────────────────────────────────
  interface CandidacyBanner { deliveryId: string; notifId: string; dropAddress: string; price: number; joinedAt: string; }
  const [candidacyBanner, setCandidacyBanner] = useState<CandidacyBanner | null>(null);
  const [withdrawing,     setWithdrawing]     = useState(false);

  // ── Active delivery strip ─────────────────────────────────────
  const [activeDelivery, setActiveDelivery] = useState<StoredDelivery | null>(null);
  const [stripUpdating,  setStripUpdating]  = useState(false);
  const [stripExpanded,  setStripExpanded]  = useState(false);

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
    setCourierPhoto(c?.photo ?? null);
  }, [courierId]);

  // Count active businesses (for header display)
  useEffect(() => {
    const count = () => {
      const bizList = getBusinesses().filter(b => b.isActive && !b.isBlocked);
      setActiveBizCount(bizList.length);
    };
    count();
    const id = setInterval(count, 10_000);
    return () => clearInterval(id);
  }, []);

  // ── Poll for active delivery — sync from Supabase every tick ──────
  const prevActiveIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!courierId) return;
    const check = async () => {
      // Always pull fresh data from Supabase so courier sees their delivery immediately
      await syncCourierDeliveriesDown(courierId).catch(() => {});
      const mine = getDeliveriesByCourier(courierId);
      const active = mine.find(d => d.status === 'accepted' || d.status === 'picked_up') ?? null;
      setActiveDelivery(active);
      // Toast when a new active delivery appears (e.g. just approved by business)
      if (active && active.id !== prevActiveIdRef.current) {
        if (prevActiveIdRef.current !== null) {
          toast.success(`✅ ${active.businessName} אישר אותך! המשלוח שלך מוכן`, {
            duration: 6000,
            style: { background: '#1BA672', color: '#fff', fontWeight: 700, borderRadius: 14, direction: 'rtl' },
          });
        }
        prevActiveIdRef.current = active.id;
      } else if (!active) {
        prevActiveIdRef.current = null;
      }
    };
    check();
    const id = setInterval(check, 4_000);
    return () => clearInterval(id);
  }, [courierId]);

  // ── Realtime: instant update when courier's delivery status changes ──
  useEffect(() => {
    if (!courierId) return;
    const channel = supabase
      .channel(`layout_courier_del_${courierId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'deliveries',
        filter: `courier_id=eq.${courierId}`,
      }, async () => {
        await syncCourierDeliveriesDown(courierId).catch(() => {});
        const mine = getDeliveriesByCourier(courierId);
        const active = mine.find(d => d.status === 'accepted' || d.status === 'picked_up') ?? null;
        setActiveDelivery(active);
        if (active && active.id !== prevActiveIdRef.current) {
          toast.success(`✅ ${active.businessName} אישר אותך! המשלוח שלך מוכן`, {
            duration: 6000,
            style: { background: '#1BA672', color: '#fff', fontWeight: 700, borderRadius: 14, direction: 'rtl' },
          });
          prevActiveIdRef.current = active.id;
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
          toast.success('אושרת על ידי העסק!');
          navigate(`/courier/chat?convId=${conv.id}&deliveryId=${deliveryId}`);
        } else {
          localStorage.removeItem('pending_candidacy');
          toast.success('אושרת על ידי העסק!');
        }
      } else if (status === 'rejected') {
        localStorage.removeItem('pending_candidacy');
        toast.error('העסק בחר שליח אחר, המשך לחפש');
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

  // ── Strip quick action: advance delivery status ───────────────
  const handleStripAction = async () => {
    if (!activeDelivery || stripUpdating) return;
    setStripUpdating(true);
    try {
      if (activeDelivery.status === 'accepted') {
        updateDelivery(activeDelivery.id, { status: 'picked_up', pickedUpAt: new Date().toISOString() });
        setActiveDelivery(d => d ? { ...d, status: 'picked_up' } : null);
        toast.success('אספת את החבילה!');
      } else if (activeDelivery.status === 'picked_up') {
        updateDelivery(activeDelivery.id, { status: 'delivered', deliveredAt: new Date().toISOString() });
        setActiveDelivery(null);
        toast.success('מסרת את החבילה בהצלחה!');
      }
      setStripExpanded(false);
    } finally {
      setStripUpdating(false);
    }
  };

  const confirmToggleAvailability = () => {
    if (!courierId) return;
    const next = !isAvailable;
    updateCourier(courierId, { isAvailable: next });
    setIsAvailable(next);
    setShowAvailConfirm(false);
    toast.success(next ? 'אתה זמין לקבל משלוחים' : 'סימנת את עצמך כלא זמין');
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const navItems = [
    { label: 'ראשי',     path: '/courier/dashboard',  icon: HomeIcon,                iconSolid: HomeIconSolid,  phosphorIcon: House,        badge: 0 },
    { label: 'פנויים',   path: '/courier/available',  icon: BellIcon,               iconSolid: BellIconSolid,  phosphorIcon: Bell,         badge: pendingCount },
    { label: 'משלוחים', path: '/courier/deliveries', icon: TruckIcon,              iconSolid: TruckIconSolid, phosphorIcon: PhosphorTruck, badge: 0 },
    { label: 'צ׳אט',    path: '/courier/chat',       icon: ChatBubbleLeftRightIcon, iconSolid: ChatIconSolid,  phosphorIcon: ChatCircle,   badge: chatUnread },
    { label: 'פרופיל',  path: '/courier/profile',    icon: UserCircleIcon,         iconSolid: UserIconSolid,  phosphorIcon: User,         badge: 0 },
  ];

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #EFF6FF 0%, #F0F4FF 100%)' }}>

      {/* ── Top header ── */}
      <header
        className="portal-header flex items-center justify-between px-4 sticky top-0 z-40"
        style={{ height: 60 }}
      >
        {/* Right: avatar + name */}
        <div className="flex items-center gap-3">
          {courierPhoto ? (
            <img
              src={courierPhoto}
              alt=""
              className="w-9 h-9 rounded-2xl object-cover flex-shrink-0"
              style={{ border: '1.5px solid rgba(255,255,255,0.4)' }}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)' }}
            >
              <TruckIcon className="w-5 h-5 text-white" />
            </div>
          )}
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
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#4ade80' }} />
            <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {activeBizCount} עסקים
            </span>
          </div>
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

      {/* ── Body: sidebar (desktop) + main content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Desktop sidebar (lg+) ── */}
        <aside
          className="hidden lg:flex flex-col flex-shrink-0 sticky top-[60px] overflow-y-auto"
          style={{
            width: 220,
            height: 'calc(100vh - 60px)',
            background: '#FFFFFF',
            borderLeft: '1px solid #E8E8E8',
            boxShadow: '-2px 0 12px rgba(0,0,0,0.04)',
          }}
        >
          {/* Nav items */}
          <nav className="flex flex-col gap-1 p-3 flex-1">
            {navItems.map(({ label, path, phosphorIcon: PhosphorIcon, badge }) => {
              const active = location.pathname === path ||
                (path === '/courier/dashboard' && location.pathname === '/courier');
              return (
                <Link
                  key={path}
                  to={path}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-150 cursor-pointer"
                  style={{
                    background: active ? 'linear-gradient(135deg, #533afd, #ea2261)' : 'transparent',
                    color: active ? '#FFFFFF' : '#757575',
                    fontWeight: active ? 800 : 600,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F4F6FF'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div className="relative flex-shrink-0">
                    <PhosphorIcon size={20} weight={active ? 'fill' : 'regular'} />
                    {badge > 0 && (
                      <span
                        className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                        style={{ background: '#E23437' }}
                      >
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[14px]">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer: availability status */}
          <div className="p-3 border-t" style={{ borderColor: '#E8E8E8' }}>
            <button
              onClick={() => setShowAvailConfirm(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all hover:opacity-80"
              style={{ background: isAvailable ? '#E8F8F0' : '#FFF0F0', border: `1px solid ${isAvailable ? '#1BA67230' : '#E2343730'}` }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: isAvailable ? '#1BA672' : '#E23437' }}
              />
              <span className="text-[12px] font-bold" style={{ color: isAvailable ? '#1BA672' : '#E23437' }}>
                {isAvailable ? 'זמין לקבל משלוחים' : 'לא זמין כרגע'}
              </span>
            </button>
          </div>
        </aside>

        {/* ── Page content ── */}
        <main className={`flex-1 overflow-y-auto lg:pb-4 ${activeDelivery ? 'pb-[136px]' : 'pb-[72px]'}`}>
          <Outlet />
        </main>
      </div>

      {/* ── Persistent active-delivery strip (above bottom nav) ── */}
      {activeDelivery && (
        <div
          className="fixed left-0 right-0 z-[45] lg:hidden"
          style={{ bottom: 68 }}
        >
          {/* Expanded panel */}
          {stripExpanded && (
            <>
              <div
                className="fixed inset-0 z-[-1]"
                style={{ background: 'rgba(0,0,0,0.35)' }}
                onClick={() => setStripExpanded(false)}
              />
              <div
                dir="rtl"
                className="mx-3 mb-2 rounded-2xl overflow-hidden"
                style={{
                  background: '#fff',
                  boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
                  animation: 'slideUp 0.22s ease',
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    background: activeDelivery.status === 'accepted'
                      ? 'linear-gradient(90deg,#0077AA,#009DE0)'
                      : 'linear-gradient(90deg,#d97706,#F58F1F)',
                    borderBottom: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <div>
                    <p className="text-white font-black text-[15px]">
                      {activeDelivery.status === 'accepted' ? 'בדרך לאיסוף' : 'בדרך ללקוח'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {formatOrderNumber(activeDelivery.orderNumber)}
                      {activeDelivery.businessName ? ` · ${activeDelivery.businessName}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setStripExpanded(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    <span style={{ color: '#fff', fontSize: 16, lineHeight: 1 }}>✕</span>
                  </button>
                </div>

                {/* Addresses */}
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black mt-0.5" style={{ background: '#1BA672' }}>א</span>
                    <div>
                      <p className="text-[10px]" style={{ color: '#9CA3AF' }}>איסוף</p>
                      <p className="text-[13px] font-semibold" style={{ color: '#202125' }}>{activeDelivery.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="w-px h-3 mr-2.5" style={{ background: '#E8E8E8' }} />
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black mt-0.5" style={{ background: '#E23437' }}>ב</span>
                    <div>
                      <p className="text-[10px]" style={{ color: '#9CA3AF' }}>מסירה</p>
                      <p className="text-[13px] font-semibold" style={{ color: '#202125' }}>{activeDelivery.dropAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div className="px-4 pb-4">
                  <button
                    onClick={handleStripAction}
                    disabled={stripUpdating}
                    className="w-full py-3.5 rounded-2xl font-black text-[14px] text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                    style={{
                      background: activeDelivery.status === 'accepted'
                        ? 'linear-gradient(135deg,#F58F1F,#d97706)'
                        : 'linear-gradient(135deg,#1BA672,#16a34a)',
                      boxShadow: activeDelivery.status === 'accepted'
                        ? '0 4px 14px rgba(245,143,31,0.4)'
                        : '0 4px 14px rgba(27,166,114,0.4)',
                    }}
                  >
                    {stripUpdating ? '...' : activeDelivery.status === 'accepted' ? 'אספתי את החבילה' : 'מסרתי ללקוח ✓'}
                  </button>
                  <button
                    onClick={() => { setStripExpanded(false); navigate('/courier/deliveries'); }}
                    className="w-full mt-2 py-2.5 rounded-2xl text-[13px] font-semibold"
                    style={{ background: 'transparent', color: '#009DE0' }}
                  >
                    פרטים מלאים
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Compact strip (always visible) */}
          <div
            className="mx-3 mb-1.5 rounded-2xl flex items-center gap-3 px-3 py-2.5 cursor-pointer"
            style={{
              background: activeDelivery.status === 'accepted'
                ? 'linear-gradient(90deg,#0077AA,#009DE0)'
                : 'linear-gradient(90deg,#d97706,#F58F1F)',
              boxShadow: '0 -2px 16px rgba(0,0,0,0.15)',
            }}
            onClick={() => setStripExpanded(v => !v)}
          >
            {/* Pulsing dot */}
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: 'rgba(255,255,255,0.8)' }} />

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-[13px] leading-tight truncate">
                {activeDelivery.status === 'accepted' ? 'בדרך לאיסוף' : 'בדרך ללקוח'}
                {activeDelivery.orderNumber ? ` · ${formatOrderNumber(activeDelivery.orderNumber)}` : ''}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {activeDelivery.status === 'accepted' ? activeDelivery.pickupAddress : activeDelivery.dropAddress}
              </p>
            </div>

            {/* Quick-action button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleStripAction(); }}
              disabled={stripUpdating}
              className="flex-shrink-0 px-3 py-2 rounded-xl font-black text-[12px] transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: '1.5px solid rgba(255,255,255,0.4)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {stripUpdating ? '...' : activeDelivery.status === 'accepted' ? 'אספתי ✓' : 'מסרתי ✓'}
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom navigation (mobile only, hidden on lg+) ── */}
      <nav
        className="nav-glass fixed bottom-0 right-0 left-0 z-40 flex items-center justify-around px-2 lg:hidden"
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

      {/* ── Availability bottom sheet ── */}
      {showAvailConfirm && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowAvailConfirm(false)} />
          <div
            dir="rtl"
            className="fixed bottom-0 right-0 left-0 z-50 rounded-t-3xl px-5 pt-4 pb-10"
            style={{ background: '#fff', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)', animation: 'slideUp 0.25s ease' }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ background: '#E8E8E8' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#202125', textAlign: 'center', marginBottom: 6 }}>
              שנה סטטוס זמינות
            </h3>
            <p style={{ fontSize: 13, color: '#757575', textAlign: 'center', marginBottom: 24 }}>
              {isAvailable ? 'עבור למצב לא זמין — לא תקבל משלוחים חדשים' : 'עבור למצב זמין — תקבל משלוחים חדשים'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  if (!courierId) return;
                  updateCourier(courierId, { isAvailable: true });
                  setIsAvailable(true);
                  setShowAvailConfirm(false);
                  toast.success('אתה זמין לקבל משלוחים');
                }}
                style={{
                  padding: '16px', borderRadius: 16, border: 'none', width: '100%',
                  background: !isAvailable ? 'linear-gradient(135deg, #1BA672, #16a34a)' : '#F4F4F4',
                  color: !isAvailable ? '#fff' : '#757575',
                  fontWeight: 800, fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                זמין למשלוחים
              </button>
              <button
                onClick={() => {
                  if (!courierId) return;
                  updateCourier(courierId, { isAvailable: false });
                  setIsAvailable(false);
                  setShowAvailConfirm(false);
                  toast.success('סימנת את עצמך כלא זמין');
                }}
                style={{
                  padding: '16px', borderRadius: 16, width: '100%',
                  background: isAvailable ? '#E234371A' : '#F4F4F4',
                  color: isAvailable ? '#E23437' : '#757575',
                  fontWeight: 800, fontSize: 15, cursor: 'pointer',
                  border: isAvailable ? '1.5px solid #E2343740' : '1.5px solid #E8E8E8',
                }}
              >
                לא זמין
              </button>
              <button onClick={() => setShowAvailConfirm(false)} style={{ padding: '12px', background: 'none', border: 'none', color: '#757575', fontSize: 14, cursor: 'pointer' }}>
                ביטול
              </button>
            </div>
          </div>
          <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </>
      )}
    </div>
  );
};

export default CourierLayout;
