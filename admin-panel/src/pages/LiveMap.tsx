import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored icons
const createIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width: 28px; height: 28px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const createDeliveryIcon = () =>
  L.divIcon({
    className: '',
    html: `<div style="
      width: 24px; height: 24px;
      background: #6C63FF;
      border: 3px solid white;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
    ">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const greenIcon = createIcon('#22C55E');
const orangeIcon = createIcon('#F97316');
const grayIcon = createIcon('#9CA3AF');

type CourierStatus = 'available' | 'busy' | 'offline';

interface CourierMarker {
  id: string;
  name: string;
  phone: string;
  status: CourierStatus;
  lat: number;
  lng: number;
  deliveries: number;
}

interface DeliveryMarker {
  id: string;
  address: string;
  business: string;
  lat: number;
  lng: number;
}

const ASHDOD_CENTER: [number, number] = [31.8044, 34.6553];

const initialCouriers: CourierMarker[] = [
  { id: '1', name: 'יוסי כהן', phone: '0521234567', status: 'available', lat: 31.812, lng: 34.649, deliveries: 0 },
  { id: '2', name: 'מוחמד עלי', phone: '0527654321', status: 'busy', lat: 31.798, lng: 34.661, deliveries: 1 },
  { id: '3', name: 'אמיר אבוטבול', phone: '0541112233', status: 'busy', lat: 31.805, lng: 34.642, deliveries: 2 },
  { id: '4', name: 'שירה אברהם', phone: '0502223344', status: 'available', lat: 31.821, lng: 34.668, deliveries: 0 },
  { id: '5', name: 'ברק שמש', phone: '0548889900', status: 'offline', lat: 31.793, lng: 34.655, deliveries: 0 },
  { id: '6', name: 'יעקב מזרחי', phone: '0524445566', status: 'busy', lat: 31.808, lng: 34.658, deliveries: 1 },
];

const deliveryMarkers: DeliveryMarker[] = [
  { id: 'd1', address: 'רחוב הרצל 15, אשדוד', business: 'פיצה ריינה', lat: 31.802, lng: 34.651 },
  { id: 'd2', address: 'שד\' בן גוריון 72, אשדוד', business: 'סושי טוקיו', lat: 31.815, lng: 34.665 },
  { id: 'd3', address: 'רחוב הנגב 40, אשדוד', business: 'בית מרקחת מכבי', lat: 31.826, lng: 34.644 },
];

const statusLabel: Record<CourierStatus, string> = {
  available: 'זמין',
  busy: 'במשלוח',
  offline: 'לא מחובר',
};

const statusColor: Record<CourierStatus, 'green' | 'yellow' | 'gray'> = {
  available: 'green',
  busy: 'yellow',
  offline: 'gray',
};

const LiveMap: React.FC = () => {
  const [couriers, setCouriers] = useState<CourierMarker[]>(initialCouriers);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);

  // Simulate auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCouriers((prev) =>
        prev.map((c) => ({
          ...c,
          lat: c.lat + (Math.random() - 0.5) * 0.003,
          lng: c.lng + (Math.random() - 0.5) * 0.003,
        }))
      );
      setLastUpdate(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getIcon = (status: CourierStatus) => {
    if (status === 'available') return greenIcon;
    if (status === 'busy') return orangeIcon;
    return grayIcon;
  };

  const availableCount = couriers.filter((c) => c.status === 'available').length;
  const busyCount = couriers.filter((c) => c.status === 'busy').length;
  const offlineCount = couriers.filter((c) => c.status === 'offline').length;

  return (
    <div className="flex flex-col lg:flex-row gap-4" style={{ height: 'calc(100vh - 140px)', minHeight: 600 }} dir="rtl">
      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm" style={{ minHeight: 300 }}>
        <MapContainer
          center={ASHDOD_CENTER}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Courier radius indicator for available couriers */}
          {couriers
            .filter((c) => c.status === 'available')
            .map((c) => (
              <Circle
                key={`circle-${c.id}`}
                center={[c.lat, c.lng]}
                radius={500}
                pathOptions={{ color: '#22C55E', fillColor: '#22C55E', fillOpacity: 0.05, weight: 1 }}
              />
            ))}

          {/* Courier markers */}
          {couriers.map((courier) => (
            <Marker
              key={courier.id}
              position={[courier.lat, courier.lng]}
              icon={getIcon(courier.status)}
            >
              <Popup>
                <div dir="rtl" className="text-right min-w-[140px]">
                  <p className="font-bold text-gray-900">{courier.name}</p>
                  <p className="text-xs text-gray-500" dir="ltr">{courier.phone}</p>
                  <p className="text-xs mt-1">
                    סטטוס:{' '}
                    <span
                      className={`font-semibold ${
                        courier.status === 'available'
                          ? 'text-green-600'
                          : courier.status === 'busy'
                          ? 'text-orange-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {statusLabel[courier.status]}
                    </span>
                  </p>
                  {courier.status === 'busy' && (
                    <p className="text-xs text-blue-600">{courier.deliveries} משלוח פעיל</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Delivery markers */}
          {deliveryMarkers.map((delivery) => (
            <Marker
              key={delivery.id}
              position={[delivery.lat, delivery.lng]}
              icon={createDeliveryIcon()}
            >
              <Popup>
                <div dir="rtl" className="text-right min-w-[140px]">
                  <p className="font-bold text-gray-900 text-xs">{delivery.address}</p>
                  <p className="text-xs text-purple-600">{delivery.business}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Side panel */}
      <div className="lg:w-72 flex flex-col gap-4 overflow-y-auto lg:max-h-full max-h-[50vh]">
        {/* Stats */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">סטטוס שליחים</h2>
            <span className="text-xs text-gray-400">
              עדכון: {lastUpdate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-lg py-2">
              <p className="text-lg font-bold text-green-600">{availableCount}</p>
              <p className="text-xs text-green-700 dark:text-green-400">זמינים</p>
            </div>
            <div className="text-center bg-orange-50 dark:bg-orange-900/20 rounded-lg py-2">
              <p className="text-lg font-bold text-orange-500">{busyCount}</p>
              <p className="text-xs text-orange-700 dark:text-orange-400">במשלוח</p>
            </div>
            <div className="text-center bg-gray-50 dark:bg-gray-700 rounded-lg py-2">
              <p className="text-lg font-bold text-gray-500">{offlineCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">לא פעיל</p>
            </div>
          </div>
        </Card>

        {/* Courier list */}
        <Card padding="none">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">שליחים פעילים</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {couriers.map((courier) => (
              <div
                key={courier.id}
                className={`px-4 py-3 cursor-pointer transition-colors ${
                  selectedCourierId === courier.id
                    ? 'bg-purple-50 dark:bg-purple-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
                onClick={() => setSelectedCourierId(selectedCourierId === courier.id ? null : courier.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        courier.status === 'available'
                          ? 'bg-green-500'
                          : courier.status === 'busy'
                          ? 'bg-orange-500'
                          : 'bg-gray-400'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{courier.name}</p>
                      <p className="text-xs text-gray-400" dir="ltr">{courier.phone}</p>
                    </div>
                  </div>
                  <Badge color={statusColor[courier.status]} size="sm">
                    {statusLabel[courier.status]}
                  </Badge>
                </div>
                {courier.status === 'busy' && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 pr-4">
                    {courier.deliveries} {courier.deliveries === 1 ? 'משלוח' : 'משלוחים'} פעיל
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Active deliveries */}
        <Card padding="none">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              משלוחים פעילים ({deliveryMarkers.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {deliveryMarkers.map((d) => (
              <div key={d.id} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900 dark:text-white">{d.business}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{d.address}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Legend */}
        <Card>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">מקרא</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300">שליח זמין</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300">שליח במשלוח</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-300">שליח לא מחובר</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300">נקודת מסירה</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LiveMap;
