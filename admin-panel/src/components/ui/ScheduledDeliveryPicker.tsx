import React, { useState, useRef } from 'react';
import { ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

// ── Design tokens (Wolt) ──────────────────────────────────────────────────────
const BLUE    = '#009DE0';
const BG      = '#F4F4F4';
const TEXT    = '#202125';
const TEXT2   = '#757575';
const BORDER  = '#E8E8E8';
const SUCCESS = '#1BA672';

// ── Hebrew locale helpers ─────────────────────────────────────────────────────
const HE_DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']; // Sun → Sat
const HE_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function heWeekday(date: Date): string {
  return date.toLocaleDateString('he-IL', { weekday: 'long' });
}

// Round minutes up to next 5-min boundary
function roundUp5(date: Date): Date {
  const d = new Date(date);
  const m = d.getMinutes();
  const rounded = Math.ceil(m / 5) * 5;
  if (rounded >= 60) {
    d.setMinutes(0);
    d.setHours(d.getHours() + 1);
  } else {
    d.setMinutes(rounded);
  }
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}

function stripTime(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Quick offset options
const QUICK_OFFSETS = [
  { label: '+1 שעה', hours: 1 },
  { label: '+2 שעות', hours: 2 },
  { label: '+3 שעות', hours: 3 },
  { label: '+4 שעות', hours: 4 },
  { label: '+6 שעות', hours: 6 },
  { label: '+12 שעות', hours: 12 },
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  value: Date | null;
  onChange: (d: Date) => void;
}

type DateMode = 'today' | 'tomorrow' | 'custom';

// ── Component ─────────────────────────────────────────────────────────────────
export const ScheduledDeliveryPicker: React.FC<Props> = ({ value, onChange }) => {
  const nowBase = roundUp5(new Date(Date.now() + 60 * 60 * 1000)); // default: +1h

  // Resolve initial selected date from value prop
  const initDate = value ?? nowBase;
  const todayStripped   = stripTime(new Date());
  const tomorrowStripped = stripTime(new Date(Date.now() + 86_400_000));

  function resolveDateMode(d: Date): DateMode {
    const s = stripTime(d);
    if (s.getTime() === todayStripped.getTime())   return 'today';
    if (s.getTime() === tomorrowStripped.getTime()) return 'tomorrow';
    return 'custom';
  }

  const [dateMode, setDateMode]         = useState<DateMode>(() => resolveDateMode(initDate));
  const [customDate, setCustomDate]     = useState<Date>(() => stripTime(initDate));
  const [calViewYear,  setCalViewYear]  = useState(initDate.getFullYear());
  const [calViewMonth, setCalViewMonth] = useState(initDate.getMonth());
  const [hour,   setHour]   = useState(initDate.getHours());
  const [minute, setMinute] = useState(initDate.getMinutes());

  // Track last active quick offset for visual highlight
  const [activeOffset, setActiveOffset] = useState<number | null>(1);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getDateForMode = (mode: DateMode, cd?: Date): Date => {
    if (mode === 'today')    return new Date(todayStripped);
    if (mode === 'tomorrow') return new Date(tomorrowStripped);
    return new Date(cd ?? customDate);
  };

  const emit = (mode: DateMode, h: number, m: number, cd?: Date) => {
    const base = getDateForMode(mode, cd);
    base.setHours(h, m, 0, 0);
    onChange(base);
  };

  // ── Quick offset handler ───────────────────────────────────────────────────
  const applyOffset = (offsetHours: number) => {
    setActiveOffset(offsetHours);
    const target = roundUp5(new Date(Date.now() + offsetHours * 3_600_000));
    const h = target.getHours();
    const m = target.getMinutes();
    setHour(h);
    setMinute(m);

    const targetStripped = stripTime(target);
    if (targetStripped.getTime() === todayStripped.getTime()) {
      setDateMode('today');
      emit('today', h, m);
    } else if (targetStripped.getTime() === tomorrowStripped.getTime()) {
      setDateMode('tomorrow');
      emit('tomorrow', h, m);
    } else {
      setDateMode('custom');
      setCustomDate(targetStripped);
      setCalViewYear(targetStripped.getFullYear());
      setCalViewMonth(targetStripped.getMonth());
      emit('custom', h, m, targetStripped);
    }
  };

  // ── Date mode change ───────────────────────────────────────────────────────
  const handleDateMode = (mode: DateMode, cd?: Date) => {
    setActiveOffset(null);
    if (mode === 'custom' && dateMode !== 'custom') {
      // Open calendar to current month
      const d = cd ?? customDate;
      setCalViewYear(d.getFullYear());
      setCalViewMonth(d.getMonth());
    }
    setDateMode(mode);
    if (mode === 'custom' && cd) setCustomDate(cd);
    emit(mode, hour, minute, cd);
  };

  // ── Hour / minute controls ─────────────────────────────────────────────────
  const changeHour = (delta: number) => {
    setActiveOffset(null);
    const h = (hour + delta + 24) % 24;
    setHour(h);
    emit(dateMode, h, minute);
  };

  const changeMinute = (delta: number) => {
    setActiveOffset(null);
    const totalMins = minute + delta * 5;
    const m = ((totalMins % 60) + 60) % 60;
    setMinute(m);
    emit(dateMode, hour, m);
  };

  // Swipe support for time wheels
  const hourDragY  = useRef<number | null>(null);
  const minDragY   = useRef<number | null>(null);

  // ── Calendar renderer ──────────────────────────────────────────────────────
  const renderCalendar = () => {
    const firstDow     = new Date(calViewYear, calViewMonth, 1).getDay(); // 0=Sun
    const daysInMonth  = new Date(calViewYear, calViewMonth + 1, 0).getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const canGoPrev =
      calViewYear > todayStripped.getFullYear() ||
      (calViewYear === todayStripped.getFullYear() && calViewMonth > todayStripped.getMonth());

    const prevMonth = () => {
      const d = new Date(calViewYear, calViewMonth - 1, 1);
      setCalViewYear(d.getFullYear());
      setCalViewMonth(d.getMonth());
    };
    const nextMonth = () => {
      const d = new Date(calViewYear, calViewMonth + 1, 1);
      setCalViewYear(d.getFullYear());
      setCalViewMonth(d.getMonth());
    };

    return (
      <div
        style={{
          marginTop: 12,
          background: '#fff',
          border: `1.5px solid ${BORDER}`,
          borderRadius: 16,
          padding: '14px 10px 10px',
          boxShadow: '0 4px 20px rgba(0,157,224,0.10)',
        }}
      >
        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 4px' }}>
          <button
            type="button"
            onClick={prevMonth}
            disabled={!canGoPrev}
            style={{
              background: canGoPrev ? BG : 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: canGoPrev ? 'pointer' : 'default',
              padding: '5px 7px',
              color: canGoPrev ? TEXT : '#ccc',
              display: 'flex', alignItems: 'center',
            }}
          >
            <ChevronRightIcon style={{ width: 16, height: 16 }} />
          </button>

          <span style={{ fontSize: 15, fontWeight: 800, color: TEXT, letterSpacing: 0.2 }}>
            {HE_MONTHS[calViewMonth]} {calViewYear}
          </span>

          <button
            type="button"
            onClick={nextMonth}
            style={{
              background: BG,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              padding: '5px 7px',
              color: TEXT,
              display: 'flex', alignItems: 'center',
            }}
          >
            <ChevronLeftIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
          {HE_DAYS_SHORT.map((d, i) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: i === 6 ? '#EA580C' : TEXT2, // שבת = orange
                padding: '2px 0 4px',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />;

            const cellDate = new Date(calViewYear, calViewMonth, day);
            cellDate.setHours(0, 0, 0, 0);
            const isPast     = cellDate < todayStripped;
            const isToday    = cellDate.getTime() === todayStripped.getTime();
            const isSelected =
              dateMode === 'custom' &&
              customDate.getTime() === cellDate.getTime();
            const isSat = cellDate.getDay() === 6;

            return (
              <button
                key={`d-${i}`}
                type="button"
                disabled={isPast}
                onClick={() => {
                  const cd = new Date(cellDate);
                  setCustomDate(cd);
                  handleDateMode('custom', cd);
                }}
                style={{
                  padding: '8px 0',
                  borderRadius: 10,
                  border: isToday && !isSelected ? `2px solid ${BLUE}` : '2px solid transparent',
                  background: isSelected ? BLUE : 'transparent',
                  color: isPast
                    ? '#d1d5db'
                    : isSelected
                    ? '#fff'
                    : isToday
                    ? BLUE
                    : isSat
                    ? '#EA580C'
                    : TEXT,
                  fontWeight: isSelected || isToday ? 800 : 400,
                  fontSize: 14,
                  cursor: isPast ? 'not-allowed' : 'pointer',
                  transition: 'all 0.12s',
                  lineHeight: 1,
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Drum wheel column ──────────────────────────────────────────────────────
  const DrumColumn: React.FC<{
    value: number;
    min: number;
    max: number;
    step: number;
    label: string;
    onUp: () => void;
    onDown: () => void;
    dragRef: React.MutableRefObject<number | null>;
  }> = ({ value, min, max, step, label, onUp, onDown, dragRef }) => {
    const prev = value - step < min ? max - step + step : value - step;
    const next = value + step > max ? min : value + step;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, userSelect: 'none' }}>
        {/* Up arrow */}
        <button
          type="button"
          onMouseDown={onUp}
          onTouchStart={(e) => { e.preventDefault(); onUp(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 20px', color: BLUE, fontSize: 10, fontWeight: 700,
            opacity: 0.8, letterSpacing: 2,
          }}
        >
          ▲
        </button>

        {/* Drum window */}
        <div
          style={{
            position: 'relative',
            height: 104,
            overflow: 'hidden',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
          onTouchStart={(e) => { dragRef.current = e.touches[0].clientY; }}
          onTouchMove={(e) => {
            if (dragRef.current === null) return;
            const delta = dragRef.current - e.touches[0].clientY;
            if (Math.abs(delta) > 18) {
              if (delta > 0) onUp(); else onDown();
              dragRef.current = e.touches[0].clientY;
            }
          }}
          onTouchEnd={() => { dragRef.current = null; }}
        >
          {/* Previous (faded) */}
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: TEXT2,
            opacity: 0.3,
            lineHeight: '34px',
            height: 34,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {String(prev).padStart(2, '0')}
          </div>

          {/* Selected (highlight bar) */}
          <div style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 46,
          }}>
            {/* Highlight bar */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `${BLUE}18`,
              borderTop: `2px solid ${BLUE}`,
              borderBottom: `2px solid ${BLUE}`,
              borderRadius: 10,
              margin: '0 6px',
            }} />
            <span style={{
              fontSize: 34,
              fontWeight: 900,
              color: TEXT,
              fontVariantNumeric: 'tabular-nums',
              position: 'relative',
              zIndex: 1,
            }}>
              {String(value).padStart(2, '0')}
            </span>
          </div>

          {/* Next (faded) */}
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: TEXT2,
            opacity: 0.3,
            lineHeight: '24px',
            height: 24,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {String(next).padStart(2, '0')}
          </div>
        </div>

        {/* Down arrow */}
        <button
          type="button"
          onMouseDown={onDown}
          onTouchStart={(e) => { e.preventDefault(); onDown(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 20px', color: BLUE, fontSize: 10, fontWeight: 700,
            opacity: 0.8, letterSpacing: 2,
          }}
        >
          ▼
        </button>

        <span style={{ fontSize: 11, color: TEXT2, fontWeight: 600, marginTop: 2 }}>{label}</span>
      </div>
    );
  };

  // ── Computed summary ───────────────────────────────────────────────────────
  const selectedDate = getDateForMode(dateMode);
  const resultDt = new Date(selectedDate);
  resultDt.setHours(hour, minute, 0, 0);
  const isValid = resultDt > new Date();

  const summaryDateLabel =
    dateMode === 'today'
      ? `היום (${heWeekday(resultDt)})`
      : dateMode === 'tomorrow'
      ? `מחר (${heWeekday(resultDt)})`
      : resultDt.toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit' });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Info banner */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '10px 14px', borderRadius: 12, background: '#EAF7FD', color: BLUE, fontSize: 12, fontWeight: 600,
      }}>
        <span style={{ lineHeight: 1.5 }}>המשלוח יתוזמן ושליחים יקבלו התראה בזמן שנקבע</span>
      </div>

      {/* ── Section: quick offsets ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: TEXT2, marginBottom: 8, margin: '0 0 8px' }}>
          קיצורים מהירים
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {QUICK_OFFSETS.map(o => {
            const active = activeOffset === o.hours;
            return (
              <button
                key={o.hours}
                type="button"
                onClick={() => applyOffset(o.hours)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: `1.5px solid ${active ? BLUE : BORDER}`,
                  background: active ? BLUE : '#fff',
                  color: active ? '#fff' : BLUE,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  boxShadow: active ? `0 2px 10px ${BLUE}40` : 'none',
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section: date ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: TEXT2, margin: '0 0 8px' }}>
          תאריך
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['today', 'tomorrow'] as DateMode[]).map(mode => {
            const sel = dateMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleDateMode(mode)}
                style={{
                  flex: 1,
                  padding: '11px 4px',
                  borderRadius: 14,
                  border: `1.5px solid ${sel ? BLUE : BORDER}`,
                  background: sel ? '#EAF7FD' : '#fff',
                  color: sel ? BLUE : TEXT,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: sel ? `0 2px 10px ${BLUE}25` : 'none',
                }}
              >
                {mode === 'today' ? (
                  <>
                    <span style={{ display: 'block', fontSize: 15 }}>היום</span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: sel ? BLUE : TEXT2 }}>
                      {todayStripped.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ display: 'block', fontSize: 15 }}>מחר</span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: sel ? BLUE : TEXT2 }}>
                      {tomorrowStripped.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              if (dateMode !== 'custom') {
                setCalViewYear(todayStripped.getFullYear());
                setCalViewMonth(todayStripped.getMonth());
              }
              handleDateMode('custom');
            }}
            style={{
              flex: 1.2,
              padding: '11px 4px',
              borderRadius: 14,
              border: `1.5px solid ${dateMode === 'custom' ? BLUE : BORDER}`,
              background: dateMode === 'custom' ? '#EAF7FD' : '#fff',
              color: dateMode === 'custom' ? BLUE : TEXT,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: dateMode === 'custom' ? `0 2px 10px ${BLUE}25` : 'none',
            }}
          >
            <span style={{ display: 'block', fontSize: 14 }}>📅 תאריך</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: dateMode === 'custom' ? BLUE : TEXT2 }}>
              {dateMode === 'custom'
                ? customDate.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
                : 'אחר'}
            </span>
          </button>
        </div>

        {/* Calendar */}
        {dateMode === 'custom' && renderCalendar()}
      </div>

      {/* ── Section: time drum ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: TEXT2, margin: '0 0 8px' }}>
          שעה
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            background: '#fff',
            border: `1.5px solid ${BORDER}`,
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <DrumColumn
            value={hour}
            min={0}
            max={23}
            step={1}
            label="שעה"
            onUp={() => changeHour(1)}
            onDown={() => changeHour(-1)}
            dragRef={hourDragY}
          />

          {/* Colon divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 2px',
            fontSize: 32,
            fontWeight: 900,
            color: BLUE,
            opacity: 0.7,
            paddingBottom: 26,
          }}>
            :
          </div>

          <DrumColumn
            value={minute}
            min={0}
            max={55}
            step={5}
            label="דקות"
            onUp={() => changeMinute(1)}
            onDown={() => changeMinute(-1)}
            dragRef={minDragY}
          />
        </div>
        <p style={{ fontSize: 11, color: TEXT2, textAlign: 'center', margin: '6px 0 0', fontWeight: 500 }}>
          ניתן גם להחליק למעלה/למטה על השעה
        </p>
      </div>

      {/* ── Summary ── */}
      <div
        style={{
          padding: '12px 18px',
          borderRadius: 14,
          textAlign: 'center',
          background: isValid ? '#F0FDF4' : '#FFF7ED',
          border: `1.5px solid ${isValid ? '#86EFAC' : '#FED7AA'}`,
          transition: 'all 0.2s',
        }}
      >
        {isValid ? (
          <span style={{ fontSize: 14, fontWeight: 800, color: SUCCESS }}>
            ✅ תוזמן ל: {summaryDateLabel},{' '}
            {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: '#EA580C', fontWeight: 700 }}>
            ⚠️ הזמן שנבחר הוא בעבר — בחר זמן עתידי
          </span>
        )}
      </div>
    </div>
  );
};
