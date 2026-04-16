import React, { useRef, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry'];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onCityChange?: (city: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  labelStyle?: React.CSSProperties;
  required?: boolean;
  id?: string;
}

function parseAddressComponents(components: google.maps.GeocoderAddressComponent[]) {
  let streetNumber = '';
  let route = '';
  let city = '';

  for (const c of components) {
    if (c.types.includes('street_number')) streetNumber = c.long_name;
    if (c.types.includes('route')) route = c.long_name;
    if (
      c.types.includes('locality') ||
      c.types.includes('sublocality') ||
      c.types.includes('administrative_area_level_2')
    ) {
      if (!city) city = c.long_name;
    }
  }

  const street = [route, streetNumber].filter(Boolean).join(' ');
  return { street, city };
}

const AddressAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  onCityChange,
  placeholder = 'רחוב הרצל 22',
  className = '',
  style,
  label,
  labelStyle,
  required,
  id,
}) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: LIBRARIES,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || initializedRef.current) return;
    initializedRef.current = true;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'il' },
      fields: ['formatted_address', 'address_components'],
      types: ['address'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current!.getPlace();
      if (!place) return;

      if (place.address_components) {
        const { street, city } = parseAddressComponents(place.address_components);
        if (street) onChange(street);
        else if (place.formatted_address) {
          const addr = place.formatted_address.replace(/, ישראל$/, '').replace(/, Israel$/, '').trim();
          onChange(addr);
        }
        if (city && onCityChange) onCityChange(city);
      } else if (place.formatted_address) {
        const addr = place.formatted_address.replace(/, ישראל$/, '').replace(/, Israel$/, '').trim();
        onChange(addr);
      }
    });
  }, [isLoaded, onChange, onCityChange]);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-[11px] font-semibold mb-1"
          style={labelStyle ?? { color: '#757575' }}
        >
          {label}{required && ' *'}
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        style={style}
        autoComplete="off"
        dir="rtl"
      />
    </div>
  );
};

export default AddressAutocomplete;
