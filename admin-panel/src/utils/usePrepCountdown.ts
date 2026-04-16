import { useState, useEffect } from 'react';

export type PrepUrgency = 'ok' | 'soon' | 'ready';

export interface PrepCountdownState {
  label: string;      // e.g. "12:34" or "מוכן!"
  minsLeft: number;   // minutes remaining (0 when ready)
  isPast: boolean;    // true when time elapsed
  urgency: PrepUrgency;
  readyTime: string;  // e.g. "14:30" — clock time when ready
}

export function usePrepCountdown(prepReadyAt: string | undefined): PrepCountdownState {
  const [state, setState] = useState<PrepCountdownState>({
    label: '', minsLeft: 0, isPast: false, urgency: 'ok', readyTime: '',
  });

  useEffect(() => {
    if (!prepReadyAt) {
      setState({ label: '', minsLeft: 0, isPast: false, urgency: 'ok', readyTime: '' });
      return;
    }

    const readyTime = new Date(prepReadyAt).toLocaleTimeString('he-IL', {
      hour: '2-digit', minute: '2-digit',
    });

    const calc = () => {
      const diff = new Date(prepReadyAt).getTime() - Date.now();
      if (diff <= 0) {
        setState({ label: 'מוכן!', minsLeft: 0, isPast: true, urgency: 'ready', readyTime });
        return;
      }
      const totalSec = Math.ceil(diff / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      const label = `${m}:${String(s).padStart(2, '0')}`;
      const urgency: PrepUrgency = m < 2 ? 'soon' : 'ok';
      setState({ label, minsLeft: m, isPast: false, urgency, readyTime });
    };

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [prepReadyAt]);

  return state;
}
