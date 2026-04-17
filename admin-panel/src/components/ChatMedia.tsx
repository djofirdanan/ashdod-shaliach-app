/**
 * ChatMedia.tsx — Shared media utilities for all chat portals.
 * Provides: compressImage, VoiceRecorderModal, AttachmentMenu,
 *           ImageChatMessage, VoiceChatMessage, DocumentChatMessage
 *
 * Content encoding (stored in message.content + syncs to Supabase via existing "content" column):
 *   image   → content = base64DataUrl  (data:image/jpeg;base64,...)
 *   voice   → content = JSON.stringify({ _t:'v', a: audioBase64, d: durationSecs })
 *   document→ content = JSON.stringify({ _t:'d', f: fileBase64, n: fileName, s: fileSizeBytes })
 */

import React, { useState, useRef, useEffect } from 'react';
import { Image as PhosphorImage, Camera, Microphone, Paperclip } from '@phosphor-icons/react';

// ─── Image Compressor ──────────────────────────────────────────
export async function compressImage(
  file: File,
  maxDim = 900,
  quality = 0.78,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas unavailable')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')); };
    img.src = url;
  });
}

// ─── Last-message preview label ────────────────────────────────
/**
 * Converts raw message content to a short human-readable preview.
 * Turns base64 images / voice JSON / doc JSON into Hebrew labels.
 */
export function formatMessagePreview(content: string): string {
  if (!content) return '';
  if (content.startsWith('data:image/')) return '📷 תמונה';
  try {
    const obj = JSON.parse(content) as Record<string, unknown>;
    // Media types
    if (obj._t === 'v') return '🎤 הודעה קולית';
    if (obj._t === 'd' && typeof obj.n === 'string') return `📄 מסמך: ${obj.n}`;
    if (obj._t === 'd') return '📄 מסמך';
    // Review system message
    if (obj.type === 'review') {
      const name = typeof obj.reviewerName === 'string' ? obj.reviewerName : '';
      const stars = typeof obj.rating === 'number' ? obj.rating : 0;
      const starsStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
      return `⭐ ביקורת מ${name} ${starsStr}`;
    }
    // Proof of delivery
    if (typeof obj.hasPhoto !== 'undefined' && typeof obj.deliveryId !== 'undefined') {
      return '✅ אישור מסירה';
    }
    // Delivery card
    if (typeof obj.pickupAddress !== 'undefined' && typeof obj.dropAddress !== 'undefined') {
      return '📦 פרטי משלוח';
    }
  } catch { /* plain text — fall through */ }
  return content;
}

// ─── Media content helpers (encode/decode) ─────────────────────
export function encodeVoiceContent(audioBase64: string, duration: number): string {
  return JSON.stringify({ _t: 'v', a: audioBase64, d: duration });
}
export function encodeDocContent(fileBase64: string, fileName: string, fileSize: number): string {
  return JSON.stringify({ _t: 'd', f: fileBase64, n: fileName, s: fileSize });
}
type MediaPayload =
  | { type: 'image'; src: string }
  | { type: 'voice'; src: string; duration: number }
  | { type: 'doc'; src: string; name: string; size: number };

export function parseMediaContent(content: string): MediaPayload | null {
  if (content.startsWith('data:image/')) return { type: 'image', src: content };
  try {
    const obj = JSON.parse(content) as Record<string, unknown>;
    if (obj._t === 'v' && typeof obj.a === 'string')
      return { type: 'voice', src: obj.a, duration: typeof obj.d === 'number' ? obj.d : 0 };
    if (obj._t === 'd' && typeof obj.f === 'string' && typeof obj.n === 'string')
      return { type: 'doc', src: obj.f, name: obj.n, size: typeof obj.s === 'number' ? obj.s : 0 };
  } catch { /* not media */ }
  return null;
}

// ─── Waveform ──────────────────────────────────────────────────
const WAVE_H = [40, 65, 48, 80, 52, 70, 45, 82, 55, 68, 42, 75, 38, 62, 50, 72];

const RecordingWave: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="flex items-center gap-[3px]" style={{ height: 36 }}>
    {WAVE_H.map((h, i) => (
      <div
        key={i}
        style={{
          width: 3,
          height: active ? `${h}%` : '28%',
          background: active ? '#E23437' : '#d1d5db',
          borderRadius: 3,
          animation: active
            ? `chatMediaWave ${0.5 + (i % 5) * 0.11}s ease-in-out ${i * 0.04}s infinite alternate`
            : 'none',
          transition: active ? undefined : 'height 0.3s ease',
        }}
      />
    ))}
  </div>
);

// ─── Voice Recorder Modal ──────────────────────────────────────
export const VoiceRecorderModal: React.FC<{
  onSend: (audioBase64: string, duration: number) => void;
  onClose: () => void;
}> = ({ onSend, onClose }) => {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [duration, setDuration] = useState(0);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const objUrlRef = useRef<string | null>(null);
  const recordedDurRef = useRef(0);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        objUrlRef.current = url;
        setAudioSrc(url);
        const reader = new FileReader();
        reader.onloadend = () => setAudioBase64(reader.result as string);
        reader.readAsDataURL(blob);
        setPhase('preview');
      };

      recorder.start();
      setPhase('recording');
      setDuration(0);
      recordedDurRef.current = 0;
      timerRef.current = setInterval(() => {
        recordedDurRef.current += 1;
        setDuration(recordedDurRef.current);
        if (recordedDurRef.current >= 120) stopRecording(); // 2 min max
      }, 1000);
    } catch {
      alert('לא ניתן לגשת למיקרופון — ודא שניתנה הרשאה.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const reset = () => {
    setPhase('idle');
    setDuration(0);
    setAudioSrc(null);
    setAudioBase64(null);
    if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null; }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <>
      <style>{`@keyframes chatMediaWave { 0% { height: 28%; } 100% { height: 96%; } }`}</style>
      <div
        className="fixed inset-0 z-[200] flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      >
        <div
          className="w-full max-w-lg rounded-t-3xl p-6 pb-8"
          style={{ background: '#fff' }}
          dir="rtl"
        >
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E8E8E8' }} />
          <h3 className="text-[17px] font-black text-center mb-5" style={{ color: '#202125' }}>
            הודעה קולית
          </h3>

          <div className="flex flex-col items-center gap-4">
            {/* Timer */}
            <p
              className="text-[44px] font-mono font-bold leading-none"
              style={{ color: phase === 'recording' ? '#E23437' : '#202125' }}
            >
              {fmt(duration)}
            </p>

            {/* Waveform */}
            <RecordingWave active={phase === 'recording'} />

            {/* Audio preview */}
            {phase === 'preview' && audioSrc && (
              <audio
                controls
                src={audioSrc}
                className="w-full"
                style={{ borderRadius: 8 }}
              />
            )}

            {/* Record / Stop button */}
            {phase !== 'preview' && (
              <button
                onClick={phase === 'idle' ? startRecording : stopRecording}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{
                  background:
                    phase === 'recording'
                      ? '#E23437'
                      : 'linear-gradient(135deg, #533afd, #ea2261)',
                }}
              >
                {phase === 'recording' ? (
                  <div className="w-5 h-5 rounded-sm" style={{ background: '#fff' }} />
                ) : (
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4z" />
                    <path
                      fillRule="evenodd"
                      d="M5 11a1 1 0 012 0 5 5 0 0010 0 1 1 0 012 0 7 7 0 01-6 6.93V20h3a1 1 0 010 2H8a1 1 0 010-2h3v-2.07A7 7 0 015 11z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            )}

            <p className="text-[12px]" style={{ color: '#8898aa' }}>
              {phase === 'idle' && 'לחץ להתחיל הקלטה'}
              {phase === 'recording' && 'מקליט... לחץ לעצור'}
              {phase === 'preview' && 'תצוגה מקדימה — האזן לפני שליחה'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-[14px] font-bold"
              style={{ background: '#f0f0f0', color: '#555' }}
            >
              ביטול
            </button>
            {phase === 'preview' && (
              <>
                <button
                  onClick={reset}
                  className="flex-1 py-3 rounded-2xl text-[14px] font-bold"
                  style={{ background: '#fff', color: '#533afd', border: '1px solid #533afd40' }}
                >
                  הקלט מחדש
                </button>
                {audioBase64 && (
                  <button
                    onClick={() => onSend(audioBase64, recordedDurRef.current)}
                    className="flex-1 py-3 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
                  >
                    שלח <Microphone size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Attachment Menu ───────────────────────────────────────────
export const AttachmentMenu: React.FC<{
  onImage: () => void;
  onCamera: () => void;
  onVoice: () => void;
  onDocument: () => void;
  disabled?: boolean;
}> = ({ onImage, onCamera, onVoice, onDocument, disabled }) => {
  const [open, setOpen] = useState(false);

  const ITEMS = [
    { icon: <PhosphorImage size={18} weight="regular" />, label: 'תמונה מהגלריה', action: onImage },
    { icon: <Camera size={18} weight="regular" />, label: 'צלם תמונה',      action: onCamera },
    { icon: <Microphone size={18} weight="regular" />, label: 'הודעה קולית', action: onVoice },
    { icon: <Paperclip size={18} weight="regular" />, label: 'שלח מסמך',    action: onDocument },
  ];

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
        style={{ background: open ? '#e8e0ff' : '#f0f4f8' }}
        title="שלח מדיה"
        aria-label="שלח מדיה"
      >
        {/* Paperclip icon */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="#533afd"
          strokeWidth={2.2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
          />
        </svg>
      </button>

      {open && (
        <>
          {/* Click-away overlay */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Menu */}
          <div
            className="absolute bottom-12 right-0 z-20 rounded-2xl overflow-hidden shadow-xl"
            style={{ background: '#fff', border: '1px solid #e8ecf0', minWidth: 185 }}
          >
            {ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => { item.action(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                style={{ color: '#202125', fontSize: 13, direction: 'rtl', fontWeight: 500 }}
              >
                <span style={{ display: 'flex', alignItems: 'center', color: '#533afd' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Image Message ─────────────────────────────────────────────
export const ImageChatMessage: React.FC<{ src: string; isMine: boolean }> = ({
  src,
  isMine,
}) => {
  const [lightbox, setLightbox] = useState(false);
  return (
    <>
      <div className={`flex ${isMine ? 'justify-start' : 'justify-end'} my-1`}>
        <img
          src={src}
          alt="תמונה שנשלחה"
          className="rounded-2xl object-cover cursor-zoom-in"
          style={{ maxWidth: 220, maxHeight: 220, border: '1px solid #e8ecf0' }}
          onClick={() => setLightbox(true)}
        />
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 cursor-zoom-out"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightbox(false)}
        >
          <img
            src={src}
            alt="תמונה"
            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
};

// ─── Voice Message ─────────────────────────────────────────────
const BAR_WAVE = [35, 60, 48, 75, 52, 68, 42, 78, 55, 65, 45, 72, 38, 62, 50, 70];

export const VoiceChatMessage: React.FC<{
  audioSrc: string;
  duration?: number;
  isMine: boolean;
}> = ({ audioSrc, duration, isMine }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play().catch(() => {}); }
    setPlaying(!playing);
  };

  const filled = (i: number) => playing && progress > (i / BAR_WAVE.length) * 100;

  return (
    <div className={`flex ${isMine ? 'justify-start' : 'justify-end'} my-1`}>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-2xl"
        style={{
          background: isMine ? 'linear-gradient(135deg, #533afd, #ea2261)' : '#fff',
          border: isMine ? 'none' : '1px solid #e8ecf0',
          maxWidth: 230,
          minWidth: 160,
        }}
      >
        {/* Play/Pause */}
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.18)' }}
        >
          {playing ? (
            <svg
              className="w-4 h-4"
              fill={isMine ? '#fff' : '#533afd'}
              viewBox="0 0 24 24"
            >
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill={isMine ? '#fff' : '#533afd'}
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Waveform + duration */}
        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-[2px] mb-0.5" style={{ height: 22 }}>
            {BAR_WAVE.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 2,
                  height: `${filled(i) ? h : Math.max(h * 0.38, 18)}%`,
                  background: isMine
                    ? `rgba(255,255,255,${filled(i) ? 0.92 : 0.38})`
                    : `rgba(83,58,253,${filled(i) ? 0.82 : 0.25})`,
                  borderRadius: 2,
                  transition: 'height 0.12s ease',
                }}
              />
            ))}
          </div>
          {duration !== undefined && (
            <p
              className="text-[10px]"
              style={{ color: isMine ? 'rgba(255,255,255,0.7)' : '#8898aa' }}
            >
              {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
            </p>
          )}
        </div>

        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={() => { setPlaying(false); setProgress(0); }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration) setProgress((el.currentTime / el.duration) * 100);
          }}
        />
      </div>
    </div>
  );
};

// ─── Document Message ──────────────────────────────────────────
export const DocumentChatMessage: React.FC<{
  fileName: string;
  fileSize?: number;
  fileUrl?: string;
  isMine: boolean;
}> = ({ fileName, fileSize, fileUrl, isMine }) => {
  const ext = (fileName.split('.').pop() ?? 'FILE').toUpperCase().slice(0, 4);
  const sizeStr = fileSize
    ? fileSize > 1_048_576
      ? `${(fileSize / 1_048_576).toFixed(1)} MB`
      : `${Math.round(fileSize / 1024)} KB`
    : '';

  const download = () => {
    if (!fileUrl) return;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    a.click();
  };

  return (
    <div className={`flex ${isMine ? 'justify-start' : 'justify-end'} my-1`}>
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl"
        style={{
          background: isMine ? 'linear-gradient(135deg, #533afd, #ea2261)' : '#fff',
          border: isMine ? 'none' : '1px solid #e8ecf0',
          maxWidth: 240,
        }}
      >
        {/* Extension badge */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isMine ? 'rgba(255,255,255,0.18)' : '#eef2ff' }}
        >
          <span
            className="font-black"
            style={{ fontSize: 9, color: isMine ? '#fff' : '#533afd' }}
          >
            {ext}
          </span>
        </div>

        {/* Name + size */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[12px] font-semibold truncate"
            style={{ color: isMine ? '#fff' : '#202125' }}
          >
            {fileName}
          </p>
          {sizeStr && (
            <p
              className="text-[10px]"
              style={{ color: isMine ? 'rgba(255,255,255,0.65)' : '#8898aa' }}
            >
              {sizeStr}
            </p>
          )}
        </div>

        {/* Download button */}
        {fileUrl && (
          <button
            onClick={download}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: isMine ? 'rgba(255,255,255,0.18)' : '#f0f4f8' }}
            title="הורד"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke={isMine ? '#fff' : '#533afd'}
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// ─── renderMediaMessage ────────────────────────────────────────
/**
 * Try to render a message as a media bubble.
 * Returns null if `content` is not media (plain text message).
 */
export function renderMediaMessage(
  content: string,
  isMine: boolean,
  key: string,
): React.ReactElement | null {
  const media = parseMediaContent(content);
  if (!media) return null;
  if (media.type === 'image')
    return <ImageChatMessage key={key} src={media.src} isMine={isMine} />;
  if (media.type === 'voice')
    return (
      <VoiceChatMessage key={key} audioSrc={media.src} duration={media.duration} isMine={isMine} />
    );
  if (media.type === 'doc')
    return (
      <DocumentChatMessage
        key={key}
        fileName={media.name}
        fileSize={media.size}
        fileUrl={media.src}
        isMine={isMine}
      />
    );
  return null;
}
