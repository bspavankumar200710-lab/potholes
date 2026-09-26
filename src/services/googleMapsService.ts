import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

let isConfigured = false;
let resolvedApiKey: string = 'AIzaSyDt2Ax-40YTEMLio4g5J14z4fM1spWkSVc';

export async function fetchGoogleMapsApiKey(): Promise<string> {
  // Check client env first if set
  if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    resolvedApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    return resolvedApiKey;
  }

  try {
    const res = await fetch('/api/config/maps');
    if (res.ok) {
      const data = await res.json();
      if (data.apiKey) {
        resolvedApiKey = data.apiKey;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch Google Maps API key from backend, using default key:', err);
  }
  return resolvedApiKey;
}

export async function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window !== 'undefined' && window.google?.maps) {
    return window.google;
  }

  if (!isConfigured) {
    const apiKey = await fetchGoogleMapsApiKey();
    setOptions({
      key: apiKey,
      v: 'weekly',
      region: 'IN',
      language: 'en',
    });
    isConfigured = true;
  }

  // Load essential libraries
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
  ]);

  return window.google;
}
