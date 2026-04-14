import { Address } from '../types';

const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface GeocodedLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
}

class MapsService {
  async getAutocompleteSuggestions(
    input: string,
    location?: { lat: number; lng: number }
  ): Promise<PlacePrediction[]> {
    if (!input || input.length < 2) return [];

    // Mock suggestions for Ashdod
    const mockSuggestions: PlacePrediction[] = [
      {
        placeId: 'place_1',
        description: `${input} - רחוב הרצל, אשדוד`,
        mainText: `${input} - רחוב הרצל`,
        secondaryText: 'אשדוד',
      },
      {
        placeId: 'place_2',
        description: `${input} - שדרות בן גוריון, אשדוד`,
        mainText: `${input} - שדרות בן גוריון`,
        secondaryText: 'אשדוד',
      },
      {
        placeId: 'place_3',
        description: `${input} - רחוב יהודה הלוי, אשדוד`,
        mainText: `${input} - רחוב יהודה הלוי`,
        secondaryText: 'אשדוד',
      },
      {
        placeId: 'place_4',
        description: `${input} - רחוב הנביאים, אשדוד`,
        mainText: `${input} - רחוב הנביאים`,
        secondaryText: 'אשדוד',
      },
    ];

    return mockSuggestions;
  }

  async geocodeAddress(address: string): Promise<GeocodedLocation | null> {
    // Mock geocoding for Ashdod area
    const ashdodCenter = { lat: 31.8014, lng: 34.6553 };
    const randomOffset = () => (Math.random() - 0.5) * 0.05;

    return {
      lat: ashdodCenter.lat + randomOffset(),
      lng: ashdodCenter.lng + randomOffset(),
      formattedAddress: address,
    };
  }

  async getPlaceDetails(placeId: string): Promise<GeocodedLocation | null> {
    const ashdodCenter = { lat: 31.8014, lng: 34.6553 };
    const randomOffset = () => (Math.random() - 0.5) * 0.05;

    return {
      lat: ashdodCenter.lat + randomOffset(),
      lng: ashdodCenter.lng + randomOffset(),
      formattedAddress: 'אשדוד',
    };
  }

  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  formatAddressForDisplay(address: Address): string {
    const parts = [address.street, address.city];
    if (address.floor) parts.push(`קומה ${address.floor}`);
    if (address.apartment) parts.push(`דירה ${address.apartment}`);
    return parts.filter(Boolean).join(', ');
  }
}

export const mapsService = new MapsService();
