import React, { useEffect, useRef, useState } from 'react';
import {
  getOrCreateSupportTicket,
  getSupportMessages,
  addSupportMessage,
  getCourier,
  type SupportMessage,
  type SupportTicket,
} from '../../../services/storage.service';
import { syncSupportMessagesDown } from '../../../services/sync.service';
import { playNewMessage, playSupportReply } from '../../../utils/sounds';
import { PaperAirplaneIcon, LifebuoyIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Headphones } from '@phosphor-icons/react';

const CourierSupport: React.FC = () => {
  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';
  const courier = getCourier(courierId);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!courierId) return;
    const t = getOrCreateSupportTicket(courierId, 'courier');
    setTicket(t);
    const msgs = getSupportMessages(t.id);
    setMessages(msgs);
    prevCountRef.current = msgs.length;
  }, [courierId]);

  // Poll for new messages every 5s
  useEffect(() => {
    if (!ticket) return;
    const poll = async () => {
      await syncSupportMessagesDown(ticket.id);
      const fresh = getSupportMessages(ticket.id);
      if (fresh.length > prevCountRef.current) {
        const newest = fresh[fresh.length - 1];
        if (newest.senderType === 'admin') {
          playSupportReply();
          toast.success('תגובה חדשה מהתמיכה!');
        }
        prevCountRef.current = fresh.length;
        setMessages(fresh);
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [ticket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !ticket || sending) return;
    setSending(true);
    addSupportMessage(ticket.id, 'user', courier?.name ?? 'שליח', text.trim());
    playNewMessage();
    setText('');
    setMessages(getSupportMessages(ticket.id));
    prevCountRef.current = getSupportMessages(ticket.id).length;
    setSending(false);
  };

  const statusBadge = ticket?.status === 'replied'
    ? { label: 'נענה ✓', bg: '#f0fdf4', color: '#10b981' }
    : ticket?.status === 'closed'
    ? { label: 'סגור', bg: '#f0f4f8', color: '#8898aa' }
    : { label: 'פתוח', bg: '#fffbeb', color: '#f59e0b' };

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-130px)]">
      {/* Header */}
      <div
        className="px-4 py-4 flex items-center gap-3"
        style={{ background: '#fff', borderBottom: '1px solid #e8ecf0' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #533afd22, #ea226122)' }}
        >
          <LifebuoyIcon className="w-5 h-5" style={{ color: '#533afd' }} />
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-black" style={{ color: '#061b31' }}>תמיכה טכנית</p>
          <p className="text-[11px]" style={{ color: '#8898aa' }}>אנחנו זמינים לעזור</p>
        </div>
        {ticket && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: statusBadge.bg, color: statusBadge.color }}
          >
            {statusBadge.label}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#f6f9fc' }}>
        {messages.length === 0 && (
          <div className="text-center mt-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: '#eef2ff' }}
            >
              <LifebuoyIcon className="w-8 h-8" style={{ color: '#533afd' }} />
            </div>
            <p className="text-[14px] font-bold mb-1" style={{ color: '#061b31' }}>שלח לנו הודעה</p>
            <p className="text-[12px]" style={{ color: '#8898aa' }}>
              נחזור אליך בהקדם האפשרי
            </p>
          </div>
        )}
        {messages.map((m) => {
          const isMine = m.senderType === 'user';
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
              <div>
                {!isMine && (
                  <p className="text-[10px] mb-1 text-right font-bold flex items-center justify-end gap-1" style={{ color: '#533afd' }}>
                    <Headphones size={10} /> תמיכה
                  </p>
                )}
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
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: '#fff', borderTop: '1px solid #e8ecf0' }}
      >
        <input
          className="flex-1 rounded-2xl px-4 py-2.5 text-[13px] outline-none"
          style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', color: '#061b31', direction: 'rtl' }}
          placeholder="כתוב הודעה לתמיכה..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
        >
          <PaperAirplaneIcon className="w-4 h-4 text-white" style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>
    </div>
  );
};

export default CourierSupport;
