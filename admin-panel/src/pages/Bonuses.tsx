import React, { useState, useEffect } from 'react';
import { GiftIcon, CalculatorIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Clock, Target, Star, Trophy, Package, Rocket, Warning as PhosphorWarning, Sun, Cloud, Moon } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import { updateBonusRule } from '../services/admin.service';
import type { BonusRule } from '../services/admin.service';

const DEFAULT_BONUS_RULES: BonusRule[] = [
  { id: 'b1', name: 'peak_hours', nameHe: 'שעות עומס', description: 'בונוס בשעות עומס (12:00–14:00, 18:00–21:00)', amount: 5, condition: 'שעות 12–14 ו-18–21', icon: '⏰', isActive: true },
  { id: 'b2', name: 'daily_target', nameHe: 'יעד יומי', description: 'הושלמו 10 משלוחים ביום', amount: 30, condition: '10 משלוחים ביום', icon: '🎯', isActive: true },
  { id: 'b3', name: 'weekly_star', nameHe: 'כוכב שבועי', description: 'שליח עם הכי הרבה משלוחים בשבוע', amount: 100, condition: 'מקום ראשון שבועי', icon: '⭐', isActive: true },
  { id: 'b4', name: 'rating_bonus', nameHe: 'בונוס דירוג', description: 'שמירה על דירוג 4.8+ לאורך חודש', amount: 50, condition: 'דירוג 4.8+', icon: '🏆', isActive: false },
];

const BONUS_STORAGE_KEY = 'app_bonus_rules';
function loadBonusRules(): BonusRule[] {
  try {
    const raw = localStorage.getItem(BONUS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BonusRule[];
  } catch { /* ignore */ }
  return DEFAULT_BONUS_RULES;
}

// ─── Map icon strings to Phosphor icons ──────────────────────────────────────
function getBonusIcon(icon: string | undefined, size = 22): React.ReactNode {
  if (!icon) return <Star size={size} />;
  if (icon.includes('⏰') || icon.includes('🕐') || icon.includes('🕑')) return <Clock size={size} />;
  if (icon.includes('🎯')) return <Target size={size} />;
  if (icon.includes('⭐') || icon.includes('🌟')) return <Star size={size} />;
  if (icon.includes('🏆')) return <Trophy size={size} />;
  if (icon.includes('📦')) return <Package size={size} />;
  if (icon.includes('🚀')) return <Rocket size={size} />;
  if (icon.includes('⚠')) return <PhosphorWarning size={size} />;
  if (icon.includes('🌦') || icon.includes('🌧')) return <Cloud size={size} />;
  if (icon.includes('⛈')) return <Cloud size={size} />;
  if (icon.includes('🌙')) return <Moon size={size} />;
  return <Sun size={size} />;
}

// ─── Color palette for bonus cards ───────────────────────────────────────────

const colorMap: Record<string, { bg: string; border: string; badge: string; toggle: string }> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    toggle: 'bg-blue-600',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200 dark:border-indigo-800',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    toggle: 'bg-indigo-600',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    toggle: 'bg-purple-600',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    toggle: 'bg-orange-500',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    toggle: 'bg-red-600',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    border: 'border-pink-200 dark:border-pink-800',
    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    toggle: 'bg-pink-600',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    toggle: 'bg-green-600',
  },
};

// Derive a color from the rule icon/condition or fall back to blue
const getColor = (rule: BonusRule): string => {
  const icon = rule.icon ?? '';
  if (icon.includes('🌦') || icon.includes('🌧')) return 'blue';
  if (icon.includes('⛈')) return 'indigo';
  if (icon.includes('🌙')) return 'purple';
  if (icon.includes('⏰')) return 'orange';
  if (icon.includes('⚠')) return 'red';
  if (icon.includes('🚀')) return 'pink';
  if (icon.includes('📦')) return 'green';
  return 'blue';
};

// ─── Toggle Component ─────────────────────────────────────────────────────────

const Toggle: React.FC<{ checked: boolean; onChange: () => void; colorKey: string }> = ({
  checked,
  onChange,
  colorKey,
}) => {
  const colors = colorMap[colorKey] ?? colorMap.blue;
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        checked ? colors.toggle : 'bg-gray-200 dark:bg-gray-600'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

// ─── Bonuses Page ─────────────────────────────────────────────────────────────

const Bonuses: React.FC = () => {
  const [rules, setRules] = useState<BonusRule[]>(() => loadBonusRules());
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [calculatorChecked, setCalculatorChecked] = useState<Record<string, boolean>>({});

  // Track pending amount edits (not yet sent to server)
  const [pendingAmounts, setPendingAmounts] = useState<Record<string, number>>({});

  // Persist rule changes to localStorage
  const persistRules = (updated: BonusRule[]) => {
    localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleToggle = async (rule: BonusRule) => {
    const updated = rules.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
    setRules(updated);
    persistRules(updated);
    toast.success(!rule.isActive ? `כלל "${rule.nameHe || rule.name}" הופעל` : `כלל "${rule.nameHe || rule.name}" הושבת`);
    updateBonusRule(rule.id, { isActive: !rule.isActive }).catch(() => {/* offline */});
  };

  const handleAmountChange = (id: string, value: string) => {
    const num = Number(value);
    if (!isNaN(num) && num >= 0) {
      setPendingAmounts((prev) => ({ ...prev, [id]: num }));
    }
  };

  const handleAmountBlur = async (rule: BonusRule) => {
    if (!(rule.id in pendingAmounts)) return;
    const newAmount = pendingAmounts[rule.id];
    if (newAmount === rule.amount) {
      setPendingAmounts((prev) => { const { [rule.id]: _, ...rest } = prev; return rest; });
      return;
    }
    try {
      const updated = await updateBonusRule(rule.id, { amount: newAmount });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      setPendingAmounts((prev) => { const { [rule.id]: _, ...rest } = prev; return rest; });
      toast.success('סכום הבונוס עודכן');
    } catch (err) {
      toast.error('שגיאה בעדכון סכום הבונוס');
      setPendingAmounts((prev) => { const { [rule.id]: _, ...rest } = prev; return rest; });
    }
  };

  const toggleCalc = (id: string) => {
    setCalculatorChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalBonus = rules
    .filter((r) => calculatorChecked[r.id])
    .reduce((sum, r) => sum + (pendingAmounts[r.id] ?? r.amount), 0);

  const activeCount = rules.filter((r) => r.isActive).length;

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ניהול בונוסים</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">טוען כללים...</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
          <div>
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-7 h-7 text-red-500" />
          </div>
          <p className="font-semibold text-gray-800 dark:text-white mb-1">שגיאה בטעינת הנתונים</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button
            variant="primary"
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={() => { setRules(loadBonusRules()); }}
          >
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (rules.length === 0) {
    return (
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ניהול בונוסים</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <GiftIcon className="w-14 h-14 mb-4 opacity-25" />
          <p className="text-base font-medium">אין חוקי בונוס</p>
          <p className="text-sm mt-1">הוסף חוק ראשון כדי להתחיל</p>
          <Button variant="primary" className="mt-4">הוסף חוק</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ניהול בונוסים</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {activeCount} מתוך {rules.length} כללים פעילים
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <GiftIcon className="w-5 h-5 text-purple-500" />
            כללי בונוס
          </h2>
          {rules.map((rule) => {
            const colorKey = getColor(rule);
            const colors = colorMap[colorKey] ?? colorMap.blue;
            const displayAmount = pendingAmounts[rule.id] ?? rule.amount;

            return (
              <div
                key={rule.id}
                className={`rounded-xl border p-4 transition-all ${
                  rule.isActive
                    ? `${colors.bg} ${colors.border}`
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="flex-shrink-0 flex items-center" style={{ color: '#6b7280' }}>{getBonusIcon(rule.icon)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {rule.nameHe || rule.name}
                        </h3>
                        {rule.isActive ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                            פעיל
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            לא פעיל
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {rule.description}
                      </p>

                      {/* Amount input */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">סכום הבונוס:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">₪</span>
                          <input
                            type="number"
                            min="0"
                            value={displayAmount}
                            onChange={(e) => handleAmountChange(rule.id, e.target.value)}
                            onBlur={() => handleAmountBlur(rule)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-sm text-gray-400">לכל משלוח</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex-shrink-0 pt-1">
                    <Toggle
                      checked={rule.isActive}
                      onChange={() => handleToggle(rule)}
                      colorKey={colorKey}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bonus Calculator */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <CalculatorIcon className="w-5 h-5 text-orange-500" />
            מחשבון בונוס
          </h2>

          <Card className="lg:sticky lg:top-4">
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                סמן את התנאים הפעילים כדי לחשב את הבונוס הכולל למשלוח:
              </p>
              {rules.map((rule) => (
                <label key={rule.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!calculatorChecked[rule.id]}
                    onChange={() => toggleCalc(rule.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 flex items-center gap-1">
                    <span style={{ color: '#9ca3af' }}>{getBonusIcon(rule.icon, 14)}</span>
                    {rule.nameHe || rule.name}
                  </span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    +₪{pendingAmounts[rule.id] ?? rule.amount}
                  </span>
                </label>
              ))}

              {/* Total */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-gradient-to-l from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">סה"כ בונוס למשלוח</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    +₪{totalBonus}
                  </p>
                  {totalBonus > 0 && (
                    <p className="text-xs text-gray-400 mt-1">מעל מחיר הבסיס</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Summary Card */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">סיכום כללים פעילים</h3>
            <div className="space-y-2">
              {rules.filter((r) => r.isActive).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">אין כללים פעילים</p>
              ) : (
                rules
                  .filter((r) => r.isActive)
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <span style={{ color: '#9ca3af' }}>{getBonusIcon(r.icon, 14)}</span>
                        {r.nameHe || r.name}
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        +₪{pendingAmounts[r.id] ?? r.amount}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Bonuses;
