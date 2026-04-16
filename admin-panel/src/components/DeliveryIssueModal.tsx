import React, { useState } from 'react';
import { WarningCircle, X, CaretLeft } from '@phosphor-icons/react';

interface IssueOption {
  id: string;
  label: string;
  subLabel?: string;
}

const ISSUE_OPTIONS: IssueOption[] = [
  { id: 'not_at_address', label: 'המשלוח לא נמצא בכתובת', subLabel: 'החבילה לא הייתה במקום האיסוף' },
  { id: 'customer_not_answering', label: 'הלקוח לא עונה', subLabel: 'ניסיתי ליצור קשר מספר פעמים' },
  { id: 'wrong_address', label: 'כתובת שגויה', subLabel: 'הכתובת לא נמצאת או שגויה' },
  { id: 'package_damaged', label: 'החבילה פגומה', subLabel: 'נזק לחבילה לפני/אחרי האיסוף' },
  { id: 'customer_refused', label: 'הלקוח סירב לקבל', subLabel: 'הלקוח דחה את המשלוח' },
  { id: 'restaurant_closed', label: 'העסק סגור', subLabel: 'העסק לא זמין לאיסוף' },
  { id: 'other', label: 'בעיה אחרת', subLabel: 'תאר את הבעיה' },
];

interface Props {
  deliveryId: string;
  onClose: () => void;
  onReport: (issueId: string, note: string) => void;
}

const DeliveryIssueModal: React.FC<Props> = ({ onClose, onReport }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [step, setStep] = useState<'select' | 'note'>('select');

  const selectedOption = ISSUE_OPTIONS.find(o => o.id === selected);

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        dir="rtl"
        className="fixed bottom-0 right-0 left-0 z-50 rounded-t-3xl"
        style={{ background: '#fff', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)', animation: 'slideUp 0.25s ease', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: '#E8E8E8' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #F0F0F0' }}>
          {step === 'note' ? (
            <button onClick={() => setStep('select')} className="p-1">
              <CaretLeft size={20} style={{ color: '#757575' }} />
            </button>
          ) : <div className="w-6" />}
          <div className="flex items-center gap-2">
            <WarningCircle size={18} weight="fill" style={{ color: '#E23437' }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#202125', margin: 0 }}>דווח על תקלה</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full" style={{ background: '#F4F4F4' }}>
            <X size={16} style={{ color: '#757575' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {step === 'select' ? (
            <div className="flex flex-col gap-2">
              <p style={{ fontSize: 13, color: '#757575', marginBottom: 8 }}>מה הבעיה?</p>
              {ISSUE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSelected(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: 14, textAlign: 'right', width: '100%',
                    border: `1.5px solid ${selected === opt.id ? '#E23437' : '#E8E8E8'}`,
                    background: selected === opt.id ? '#FFF0F0' : '#FAFAFA',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#202125', margin: 0 }}>{opt.label}</p>
                    {opt.subLabel && <p style={{ fontSize: 11, color: '#757575', margin: '2px 0 0' }}>{opt.subLabel}</p>}
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: `2px solid ${selected === opt.id ? '#E23437' : '#E8E8E8'}`,
                    background: selected === opt.id ? '#E23437' : 'transparent',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {selected === opt.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#202125', marginBottom: 8 }}>
                {selectedOption?.label}
              </p>
              <textarea
                autoFocus
                placeholder="הוסף פרטים נוספים (אופציונלי)..."
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 14,
                  border: '1.5px solid #E8E8E8', fontSize: 14, color: '#202125',
                  background: '#FAFAFA', resize: 'none', minHeight: 120, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="px-4 pb-8 pt-3 flex-shrink-0" style={{ borderTop: '1px solid #F0F0F0' }}>
          {step === 'select' ? (
            <button
              disabled={!selected}
              onClick={() => selected === 'other' ? setStep('note') : onReport(selected!, note)}
              style={{
                width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                background: selected ? '#E23437' : '#E8E8E8',
                color: selected ? '#fff' : '#9CA3AF',
                fontWeight: 800, fontSize: 15, cursor: selected ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              {selected === 'other' ? 'המשך' : 'שלח דיווח'}
            </button>
          ) : (
            <button
              onClick={() => onReport(selected!, note)}
              style={{
                width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                background: '#E23437', color: '#fff',
                fontWeight: 800, fontSize: 15, cursor: 'pointer',
              }}
            >
              שלח דיווח
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </>
  );
};

export default DeliveryIssueModal;
