import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  getSupportTickets,
  getSupportMessages,
  addSupportMessage,
  updateSupportTicket,
  getOrCreateSupportTicket,
  getBusinesses,
  getCouriers,
  type SupportTicket,
  type SupportMessage,
} from '../services/storage.service';
import { syncSupportDown, syncSupportMessagesDown, syncDown } from '../services/sync.service';
import { playNewMessage } from '../utils/sounds';
import { sendBroadcastEmail } from '../services/email.service';
import {
  LifebuoyIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronRightIcon,
  MegaphoneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const statusLabel: Record<SupportTicket['status'], string> = {
  open: 'פתוח',
  replied: 'נענה',
  closed: 'סגור',
};

const statusColor: Record<SupportTicket['status'], { bg: string; color: string }> = {
  open:    { bg: '#fef2f2', color: '#ef4444' },
  replied: { bg: '#f0fdf4', color: '#10b981' },
  closed:  { bg: '#f0f4f8', color: '#8898aa' },
};

const AdminSupport: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Broadcast state ──
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState<'all' | 'businesses' | 'couriers'>('all');
  const [broadcasting, setBroadcasting] = useState(false);

  const loadTickets = useCallback(async () => {
    await syncSupportDown();
    const t = getSupportTickets();
    setTickets(t);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTickets();
    const id = setInterval(loadTickets, 30_000);
    return () => clearInterval(id);
  }, [loadTickets]);

  // Poll messages when a ticket is selected
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selected) return;

    const msgs = getSupportMessages(selected.id);
    setMessages(msgs);
    prevMsgCount.current = msgs.length;

    const poll = async () => {
      await syncSupportMessagesDown(selected.id);
      const fresh = getSupportMessages(selected.id);
      if (fresh.length > prevMsgCount.current) {
        prevMsgCount.current = fresh.length;
        setMessages(fresh);
        playNewMessage();
      }
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectTicket = (t: SupportTicket) => {
    setSelected(t);
    setMobileShowChat(true);
  };

  const handleSend = () => {
    if (!text.trim() || !selected) return;
    addSupportMessage(selected.id, 'admin', 'תמיכה', text.trim());
    playNewMessage();
    setText('');
    const fresh = getSupportMessages(selected.id);
    setMessages(fresh);
    prevMsgCount.current = fresh.length;
    setTickets(getSupportTickets());
    toast.success('תשובה נשלחה');
  };

  const handleClose = (ticketId: string) => {
    updateSupportTicket(ticketId, { status: 'closed' });
    setTickets(getSupportTickets());
    if (selected?.id === ticketId) setSelected((prev) => prev ? { ...prev, status: 'closed' } : null);
    toast.success('הפנייה סומנה כסגורה');
  };

  const openCount = tickets.filter((t) => t.status === 'open').length;

  const handleBroadcast = async () => {
    if (!broadcastText.trim()) return;
    setBroadcasting(true);
    try {
      // Sync latest data first so we have all businesses/couriers
      await syncDown().catch(() => {});

      const businesses = broadcastAudience !== 'couriers' ? getBusinesses().filter(b => b.isActive && !b.isBlocked) : [];
      const couriers   = broadcastAudience !== 'businesses' ? getCouriers().filter(c => c.isActive && !c.isBlocked) : [];

      let count = 0;
      for (const biz of businesses) {
        const t = getOrCreateSupportTicket(biz.id, 'business');
        addSupportMessage(t.id, 'admin', 'מנהל המערכת', broadcastText.trim());
        updateSupportTicket(t.id, { status: 'replied' });
        count++;
      }
      for (const courier of couriers) {
        const t = getOrCreateSupportTicket(courier.id, 'courier');
        addSupportMessage(t.id, 'admin', 'מנהל המערכת', broadcastText.trim());
        updateSupportTicket(t.id, { status: 'replied' });
        count++;
      }

      // Send emails in background
      const allRecipients = [
        ...businesses.map(b => ({ email: b.email, name: b.businessName })),
        ...couriers.map(c => ({ email: c.email, name: c.name })),
      ];
      sendBroadcastEmail(allRecipients, broadcastText.trim()).catch(() => {});

      toast.success(`✅ ההודעה נשלחה ל-${count} משתמשים!`);
      setBroadcastText('');
      setShowBroadcast(false);
      loadTickets();
    } catch {
      toast.error('שגיאה בשליחת ההודעה');
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <>
    <div
      dir="rtl"
      className="flex h-[calc(100vh-152px)] md:h-[calc(100vh-108px)] rounded-2xl overflow-hidden"
      style={{ border: '1px solid #e8ecf0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
    >
      {/* ── Ticket list sidebar ── */}
      <div
        className={`flex-shrink-0 flex flex-col overflow-hidden w-full md:w-72 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}
        style={{ borderLeft: '1px solid #e8ecf0', background: '#fff' }}
      >
        {/* Header */}
        <div className="p-4 flex-shrink-0" style={{ background: '#fff', borderBottom: '1px solid #e8ecf0' }}>
          <div className="flex items-center gap-2">
            <LifebuoyIcon className="w-5 h-5" style={{ color: '#533afd' }} />
            <h2 className="font-black text-[15px]" style={{ color: '#061b31' }}>תמיכה</h2>
            {openCount > 0 && (
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                style={{ background: '#ea2261' }}
              >
                {openCount}
              </span>
            )}
            <button
              onClick={() => setShowBroadcast(true)}
              className="mr-auto flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
              title="שלח הודעה לכולם"
            >
              <MegaphoneIcon className="w-3.5 h-3.5" />
              שלח לכולם
            </button>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: '#8898aa' }}>
            {tickets.length} פניות סה"כ
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-[12px]" style={{ color: '#8898aa' }}>טוען...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center">
              <LifebuoyIcon className="w-8 h-8 mx-auto mb-2" style={{ color: '#e8ecf0' }} />
              <p className="text-[12px]" style={{ color: '#8898aa' }}>אין פניות עדיין</p>
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTicket(t)}
                className="w-full text-right p-3.5 transition-all hover:bg-purple-50 active:bg-purple-100"
                style={{
                  borderBottom: '1px solid #f0f4f8',
                  background: selected?.id === t.id ? '#eef2ff' : undefined,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={statusColor[t.status]}
                  >
                    {statusLabel[t.status]}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{
                      background: t.userType === 'business' ? '#eef2ff' : '#f0fdf4',
                      color: t.userType === 'business' ? '#533afd' : '#10b981',
                    }}
                  >
                    {t.userType === 'business' ? 'עסק' : 'שליח'}
                  </span>
                </div>
                <p className="text-[13px] font-bold truncate" style={{ color: '#061b31' }}>{t.userName}</p>
                <p className="text-[11px] truncate" style={{ color: '#8898aa' }}>{t.userEmail}</p>
                <p className="text-[10px] mt-1" style={{ color: '#c0cadd' }}>
                  {new Date(t.updatedAt).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileShowChat ? 'flex' : 'hidden md:flex'}`} style={{ background: '#f6f9fc' }}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <LifebuoyIcon className="w-14 h-14 mb-4" style={{ color: '#e8ecf0' }} />
            <p className="text-[15px] font-bold" style={{ color: '#8898aa' }}>בחר פנייה לצפייה ומענה</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div
              className="px-4 py-3 flex items-center gap-2.5 flex-shrink-0"
              style={{ background: '#fff', borderBottom: '1px solid #e8ecf0' }}
            >
              {/* Mobile back button */}
              <button
                className="md:hidden p-1.5 rounded-lg flex-shrink-0"
                style={{ color: '#533afd', background: '#eef2ff' }}
                onClick={() => setMobileShowChat(false)}
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-black truncate" style={{ color: '#061b31' }}>{selected.userName}</p>
                <p className="text-[11px] truncate" style={{ color: '#8898aa' }}>
                  {selected.userEmail} · {selected.userType === 'business' ? 'עסק' : 'שליח'}
                </p>
              </div>

              <span
                className="text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                style={statusColor[selected.status]}
              >
                {statusLabel[selected.status]}
              </span>

              {selected.status !== 'closed' && (
                <button
                  onClick={() => handleClose(selected.id)}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80 flex-shrink-0"
                  style={{ background: '#f0f4f8', color: '#8898aa' }}
                >
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  סגור
                </button>
              )}
              {selected.status !== 'closed' && (
                <button
                  onClick={() => handleClose(selected.id)}
                  className="sm:hidden p-1.5 rounded-lg flex-shrink-0"
                  style={{ background: '#f0f4f8', color: '#8898aa' }}
                  title="סגור פנייה"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center mt-10">
                  <ClockIcon className="w-8 h-8 mx-auto mb-2" style={{ color: '#e8ecf0' }} />
                  <p className="text-[13px]" style={{ color: '#8898aa' }}>ממתין להודעה ראשונה...</p>
                </div>
              )}
              {messages.map((m) => {
                const isAdmin = m.senderType === 'admin';
                return (
                  <div key={m.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[80%]">
                      <p className="text-[10px] mb-1 font-semibold" style={{ color: '#8898aa', textAlign: isAdmin ? 'right' : 'left' }}>
                        {isAdmin ? 'תמיכה' : selected.userName}
                      </p>
                      <div
                        className="px-4 py-2.5 rounded-2xl text-[13px]"
                        style={{
                          background: isAdmin ? 'linear-gradient(135deg, #533afd, #ea2261)' : '#fff',
                          color: isAdmin ? '#fff' : '#061b31',
                          border: isAdmin ? 'none' : '1px solid #e8ecf0',
                          borderTopRightRadius: isAdmin ? 4 : 16,
                          borderTopLeftRadius: isAdmin ? 16 : 4,
                        }}
                      >
                        {m.content}
                      </div>
                      <p className="text-[9px] mt-1" style={{ color: '#8898aa' }}>
                        {new Date(m.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ background: '#fff', borderTop: '1px solid #e8ecf0' }}
            >
              <input
                className="flex-1 rounded-2xl px-4 py-2.5 text-[13px] outline-none min-w-0"
                style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', color: '#061b31', direction: 'rtl' }}
                placeholder="כתוב תשובה..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                disabled={selected.status === 'closed'}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || selected.status === 'closed'}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
              >
                <PaperAirplaneIcon className="w-4 h-4 text-white" style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>

    {/* ── Broadcast modal ── */}

    {showBroadcast && (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowBroadcast(false); }}
      >
        <div className="w-full max-w-md rounded-2xl overflow-hidden" dir="rtl" style={{ background: '#fff' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}>
            <div className="flex items-center gap-2">
              <MegaphoneIcon className="w-5 h-5 text-white" />
              <h3 className="text-[16px] font-black text-white">שלח הודעה לכולם</h3>
            </div>
            <button onClick={() => setShowBroadcast(false)} className="text-white/70 hover:text-white">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Audience selector */}
            <div>
              <p className="text-[12px] font-bold mb-2" style={{ color: '#8898aa' }}>קהל יעד</p>
              <div className="flex gap-2">
                {[
                  { key: 'all',        label: 'כולם 👥' },
                  { key: 'businesses', label: 'עסקים 🏪' },
                  { key: 'couriers',   label: 'שליחים 🛵' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setBroadcastAudience(key as typeof broadcastAudience)}
                    className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all"
                    style={{
                      background: broadcastAudience === key ? 'linear-gradient(135deg, #533afd, #ea2261)' : '#f0f4f8',
                      color: broadcastAudience === key ? '#fff' : '#8898aa',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message textarea */}
            <div>
              <p className="text-[12px] font-bold mb-2" style={{ color: '#8898aa' }}>תוכן ההודעה</p>
              <textarea
                className="w-full rounded-xl px-4 py-3 text-[13px] outline-none resize-none"
                style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', color: '#061b31', direction: 'rtl', height: 100 }}
                placeholder="כתוב את ההודעה שתופיע לכל המשתמשים בצ׳אט..."
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
              />
            </div>

            <p className="text-[11px]" style={{ color: '#c0cadd' }}>
              ההודעה תופיע בצ׳אט של כל משתמש תחת "מוקד שירות" ותישלח גם למייל שלהם.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowBroadcast(false)}
                className="flex-1 py-3 rounded-xl font-bold text-[14px]"
                style={{ background: '#f0f4f8', color: '#8898aa' }}
              >
                ביטול
              </button>
              <button
                onClick={handleBroadcast}
                disabled={!broadcastText.trim() || broadcasting}
                className="flex-1 py-3 rounded-xl font-bold text-[14px] text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
              >
                {broadcasting ? 'שולח...' : '📢 שלח לכולם'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AdminSupport;
