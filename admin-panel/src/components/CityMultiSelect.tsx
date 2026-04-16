import React, { useState, useRef, useEffect } from 'react';
import { ISRAELI_CITIES } from '../data/israeliCities';
import { X } from '@phosphor-icons/react';

interface Props {
  selected: string[];
  onChange: (cities: string[]) => void;
  placeholder?: string;
  label?: string;
}

const CityMultiSelect: React.FC<Props> = ({
  selected,
  onChange,
  placeholder = 'חפש עיר...',
  label,
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search.trim()
    ? ISRAELI_CITIES.filter((city) =>
        city.includes(search.trim())
      )
    : [...ISRAELI_CITIES];

  const addCity = (city: string) => {
    if (!selected.includes(city)) {
      onChange([...selected, city]);
    }
    setSearch('');
    setOpen(false);
  };

  const removeCity = (city: string) => {
    onChange(selected.filter((c) => c !== city));
  };

  return (
    <div ref={containerRef} className="relative w-full" dir="rtl">
      {label && (
        <p className="text-[12px] font-semibold mb-1.5 uppercase tracking-[0.05em]" style={{ color: '#3c4257' }}>
          {label}
        </p>
      )}

      {/* Search input */}
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
        className="w-full px-3 py-2.5 rounded-[6px] text-sm border outline-none transition-all"
        style={{
          borderColor: open ? '#009DE0' : '#e0e6ed',
          background: '#f8fafc',
          color: '#061b31',
          fontFamily: 'inherit',
        }}
      />

      {/* Dropdown */}
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
            filtered.map((city) => {
              const isSelected = selected.includes(city);
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => addCity(city)}
                  className="w-full text-right px-3 py-2 text-sm flex items-center justify-between transition-colors hover:bg-blue-50"
                  style={{ color: isSelected ? '#aab0bc' : '#061b31' }}
                >
                  <span>{city}</span>
                  {isSelected && <span style={{ color: '#009DE0', fontSize: 12 }}>✓</span>}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((city) => (
            <span
              key={city}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold"
              style={{ background: '#EEF8FF', color: '#009DE0' }}
            >
              {city}
              <button
                type="button"
                onClick={() => removeCity(city)}
                className="flex items-center justify-center rounded-full transition-colors hover:bg-blue-100"
                style={{ color: '#9ba3af', marginRight: 2 }}
                aria-label={`הסר ${city}`}
              >
                <X size={11} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CityMultiSelect;
