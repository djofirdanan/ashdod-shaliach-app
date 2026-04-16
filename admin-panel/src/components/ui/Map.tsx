import React, { useEffect } from 'react';
import { Star } from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Courier, Delivery } from '../../types';

// Fix default leaflet icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const courierIcon = L.divIcon({
  className: '',
  html: `<div style="background:#6C63FF;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const deliveryIcon = L.divIcon({
  className: '',
  html: `<div style="background:#FF6584;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

interface LiveMapProps {
  couriers?: Courier[];
  activeDeliveries?: Delivery[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  couriers = [],
  activeDeliveries = [],
  center = [31.8044, 34.6553], // Ashdod coordinates
  zoom = 12,
  height = '400px',
}) => {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: '12px' }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <RecenterMap center={center} />

      {couriers
        .filter((c) => c.currentLocation)
        .map((courier) => (
          <Marker
            key={courier.id}
            position={[courier.currentLocation!.lat, courier.currentLocation!.lng]}
            icon={courierIcon}
          >
            <Popup>
              <div className="text-right" dir="rtl">
                <p className="font-bold">{courier.name}</p>
                <p className="text-sm text-gray-500">{courier.phone}</p>
                <p className="text-sm">
                  משלוחים פעילים: <strong>{courier.activeDeliveries}</strong>
                </p>
                <p className="text-sm">
                  דירוג: <strong className="flex items-center gap-1"><Star size={12} weight="fill" style={{ color: '#f59e0b' }} /> {courier.rating.toFixed(1)}</strong>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

      {activeDeliveries
        .filter((d) => d.deliveryAddress.coordinates)
        .map((delivery) => (
          <Marker
            key={delivery.id}
            position={[
              delivery.deliveryAddress.coordinates!.lat,
              delivery.deliveryAddress.coordinates!.lng,
            ]}
            icon={deliveryIcon}
          >
            <Popup>
              <div className="text-right" dir="rtl">
                <p className="font-bold">{delivery.trackingNumber}</p>
                <p className="text-sm">{delivery.deliveryAddress.street}, {delivery.deliveryAddress.city}</p>
                <p className="text-sm text-gray-500">{delivery.customer.name}</p>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
};
