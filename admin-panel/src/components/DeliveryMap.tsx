import React, { useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';

const LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry'];

interface Props {
  pickupAddress: string;
  dropAddress: string;
  height?: number | string;
}

const mapContainerStyle = { width: '100%', height: '100%' };

// Ashdod center as default
const defaultCenter = { lat: 31.8044, lng: 34.6497 };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

const DeliveryMap: React.FC<Props> = ({ pickupAddress, dropAddress, height = 280 }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: LIBRARIES,
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [pickupLatLng, setPickupLatLng] = useState<google.maps.LatLngLiteral | null>(null);
  const [dropLatLng, setDropLatLng] = useState<google.maps.LatLngLiteral | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    // Geocode both addresses and get directions
    const geocoder = new google.maps.Geocoder();
    const directionsService = new google.maps.DirectionsService();

    const geocodeAddress = (address: string, city = 'אשדוד') =>
      new Promise<google.maps.LatLngLiteral>((resolve, reject) => {
        geocoder.geocode({ address: `${address}, ${city}, Israel` }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            const loc = results[0].geometry.location;
            resolve({ lat: loc.lat(), lng: loc.lng() });
          } else {
            reject(new Error(`Geocode failed: ${status}`));
          }
        });
      });

    Promise.all([geocodeAddress(pickupAddress), geocodeAddress(dropAddress)])
      .then(([pickup, drop]) => {
        setPickupLatLng(pickup);
        setDropLatLng(drop);

        directionsService.route(
          {
            origin: pickup,
            destination: drop,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === 'OK' && result) {
              setDirections(result);
              // Fit bounds
              const bounds = new google.maps.LatLngBounds();
              bounds.extend(pickup);
              bounds.extend(drop);
              map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
            }
          }
        );
      })
      .catch(console.error);
  }, [pickupAddress, dropAddress]);

  if (loadError) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F4F4', borderRadius: 16 }}>
      <p style={{ color: '#757575', fontSize: 13 }}>לא ניתן לטעון מפה</p>
    </div>
  );

  if (!isLoaded) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F4F4', borderRadius: 16 }}>
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        border: '3px solid #E8E8E8',
        borderTopColor: '#009DE0',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', height, position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={pickupLatLng ?? defaultCenter}
        zoom={14}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {directions ? (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: { strokeColor: '#009DE0', strokeWeight: 4, strokeOpacity: 0.9 },
            }}
          />
        ) : null}

        {/* Pickup marker — green */}
        {pickupLatLng && (
          <Marker
            position={pickupLatLng}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#1BA672',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2.5,
              scale: 10,
            }}
            title="נקודת איסוף"
          />
        )}

        {/* Drop marker — red */}
        {dropLatLng && (
          <Marker
            position={dropLatLng}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#E23437',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2.5,
              scale: 10,
            }}
            title="נקודת מסירה"
          />
        )}
      </GoogleMap>

      {/* Address legend strip */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        padding: '8px 14px',
        display: 'flex', flexDirection: 'column', gap: 4,
        borderTop: '1px solid rgba(0,0,0,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#1BA672', flexShrink: 0 }} />
          <p style={{ fontSize: 11, fontWeight: 600, color: '#202125', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pickupAddress}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#E23437', flexShrink: 0 }} />
          <p style={{ fontSize: 11, fontWeight: 600, color: '#202125', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dropAddress}
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DeliveryMap;
