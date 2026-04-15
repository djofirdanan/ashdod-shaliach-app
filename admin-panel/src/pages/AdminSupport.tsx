import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  getSupportTickets,
  getSupportMessages,
  addSupportMessage,
  updateSupportTicket,
  type SupportTicket,
  type SupportMessage,
} from '../services/storage.service';
import { syncSupportDown, syncSupportMessagesDown } from '../services/sync.service';
import { playNewMessage } from '../utils/sounds';
import {
  LifebuoyIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const statusLabel: Record<SupportTicket['status'], string> = {
  open: '🔴 פתוח',
  replied: '🟢 נענה',
  closed: '⚫ סגור',
};

const AdminSupport: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTickets = useCallback(async () => {
    await syncSupportDown();
    const t = getSupportTickets();
    setTickets(t);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTickets();
    // Check for new tickets every 30s
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

  const handleSend = () => {
    if (!text.trim() || !selected) return;
    addSupportMessage(selected.id, 'admin', 'תמיכה', text.trim());
    playNewMessage();
    setText('');
    const fresh = getSupportMessages(selected.id);
    setMessages(fresh);
    prevMsgCount.current = fresh.length;
    // Refresh ticket list to update status
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

  return (
    <div dir="rtl" className="flex h-[calc(100vh-64px)]">
      {/* Sidebar — ticket list */}
      <div
        className="w-72 flex-shrink-0 overflow-y-auto"
        style={{ borderLeft: '1px solid #e8ecf0', background: '#fff' }}
      >
        <div className="p-4 sticky top-0 z-10" style={{ background: '#fff', borderBottom: '1px solid #e8ecf0' }}>
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
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: '#8898aa' }}>
            {tickets.length} פניות סה"כ
          </p>
        </div>

        {loading ? (
          <div className="p-4 text-center text-[12px]" style={{ color: '#8898aa' }}>טוען...</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center">
            <LifebuoyIcon className="w-8 h-8 mx-auto mb-2" style={{ color: '#e8ecf0' }} />
            <p className="text-[12px]" style={{ color: '#8898aa' }}>אין פניות עדיין</p>
          </div>
        ) : (
          <div>
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="w-full text-right p-3 transition-all hover:bg-purple-50"
                style={{
                  borderBottom: '1px solid #f0f4f8',
                  background: selected?.id === t.id ? '#eef2ff' : undefined,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: t.status === 'open' ? '#fef2f2' : t.status === 'replied' ? '#f0fdf4' : '#f0f4f8',
                      color: t.status === 'open' ? '#ef4444' : t.status === 'replied' ? '#10b981' : '#8898aa',
                    }}
                  >
                    {statusLabel[t.status]}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: t.userType === 'business' ? '#eef2ff' : '#f0fdf4', color: t.userType === 'business' ? '#533afd' : '#10b981' }}
                  >
                    {t.userType === 'business' ? '🏪 עסק' : '🛵 שליח'}
                  </span>
                </div>
                <p className="text-[13px] font-bold truncate" style={{ color: '#061b31' }}>{t.userName}</p>
                <p className="text-[11px] truncate" style={{ color: '#8898aa' }}>{t.userEmail}</p>
                <p className="text-[10px] mt-1" style={{ color: '#c0cadd' }}>
                  {new Date(t.updatedAt).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat area */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center" style={{ background: '#f6f9fc' }}>
          <LifebuoyIcon className="w-14 h-14 mb-4" style={{ color: '#e8ecf0' }} />
          <p className="text-[15px] font-bold" style={{ color: '#8898aa' }}>בחר פנייה לצפייה ומענה</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col" style={{ background: '#f6f9fc' }}>
          {/* Chat header */}
          <div
            className="px-5 py-3 flex items-center gap-3"
            style={{ background: '#fff', borderBottom: '1px solid #e8ecf0' }}
          >
            <div className="flex-1">
              <p className="text-[14px] font-black" style={{ color: '#061b31' }}>{selected.userName}</p>
              <p className="text-[11px]" style={{ color: '#8898aa' }}>{selected.userEmail} • {selected.userType === 'business' ? 'עסק' : 'שליח'}</p>
            </div>
            <span
              className="text-[11px] font-bold px-2 py-1 rounded-full"
              style={{
                background: selected.status === 'open' ? '#fef2f2' : selected.status === 'replied' ? '#f0fdf4' : '#f0f4f8',
                color: selected.status === 'open' ? '#ef4444' : selected.status === 'replied' ? '#10b981' : '#8898aa',
              }}
            >
              {statusLabel[selected.status]}
            </span>
            {selected.status !== 'closed' && (
              <button
                onClick={() => handleClose(selected.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
                style={{ background: '#f0f4f8', color: '#8898aa' }}
              >
                <CheckCircleIcon className="w-3.5 h-3.5" />
                סגור פנייה
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
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
                  <div>
                    <p className="text-[10px] mb-1 font-semibold" style={{ color: '#8898aa', textAlign: isAdmin ? 'right' : 'left' }}>
                      {isAdmin ? '🎧 תמיכה' : selected.userName}
                    </p>
                    <div
                      className="max-w-sm px-4 py-2.5 rounded-2xl text-[13px]"
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
            className="flex items-center gap-3 px-5 py-3"
            style={{ background: '#fff', borderTop: '1px solid #e8ecf0' }}
          >
            <input
              className="flex-1 rounded-2xl px-4 py-2.5 text-[13px] outline-none"
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
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
            >
              <PaperAirplaneIcon className="w-4 h-4 text-white" style={{ transform: 'rotate(180deg)' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
