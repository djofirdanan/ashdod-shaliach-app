import React, { useState, useRef, useEffect } from 'react';
import { ISRAELI_CITIES } from '../data/israeliCities';

interface CitySelectProps {
  value: string;
  onChange: (city: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const CitySelect: React.FC<CitySelectProps> = ({
  value,
  onChange,
  label,
  placeholder = 'חפש עיר...',
  required,
  className = '',
}) => {
  const [search, setSearch] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep search in sync with external value changes
  useEffect(() => {
    setSearch(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // If user typed something not in the list, revert to current value
        if (!ISRAELI_CITIES.includes(search as typeof ISRAELI_CITIES[number])) {
          setSearch(value);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [search, value]);

  const filtered = search.trim()
    ? ISRAELI_CITIES.filter((city) => city.includes(search.trim()))
    : [...ISRAELI_CITIES];

  const selectCity = (city: string) => {
    onChange(city);
    setSearch(city);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} dir="rtl">
      {label && (
        <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-[0.05em]" style={{ color: '#3c4257' }}>
          {label}{required && ' *'}
        </label>
      )}
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        dir="rtl"
        required={required}
        className="w-full px-3 py-2.5 rounded-[6px] text-sm border outline-none transition-all"
        style={{
          borderColor: open ? '#009DE0' : '#e0e6ed',
          background: '#f8fafc',
          color: '#061b31',
          fontFamily: 'inherit',
        }}
      />

      {open && (
        <div
          className="absolute z-50 w-full rounded-xl border shadow-lg overflow-y-auto"
          style={{
            top: 'calc(100% + 4px)',
            maxHeight: 200,
            background: '#ffffff',
            borderColor: '#e0e6ed',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm" style={{ color: '#aab0bc' }}>
              לא נמצאה עיר
            </div>
          ) : (
            filtered.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => selectCity(city)}
                className="w-full text-right px-3 py-2 text-sm transition-colors hover:bg-blue-50"
                style={{ color: city === value ? '#009DE0' : '#061b31', fontWeight: city === value ? 700 : 400 }}
              >
                {city}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CitySelect;
