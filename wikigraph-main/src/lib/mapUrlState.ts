import type { WikiLanguage } from '@/components/SearchPanel';
import { AVAILABLE_LANGUAGES } from '@/lib/mapConstants';

export const DEFAULT_MAP_CENTER = { lat: 41.0082, lng: 28.9784 };
export const DEFAULT_MAP_ZOOM = 13;

export type MapUrlState = {
  lat: number;
  lng: number;
  zoom: number;
  pageid?: number;
  lang?: WikiLanguage;
};

export function parseMapUrl(): MapUrlState | null {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get('lat') || '');
  const lng = parseFloat(params.get('lng') || params.get('lon') || '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const zRaw = parseInt(params.get('z') || '', 10);
  const zoom = Number.isFinite(zRaw) ? Math.min(22, Math.max(1, zRaw)) : DEFAULT_MAP_ZOOM;

  let pageid: number | undefined;
  const pageidRaw = params.get('pageid');
  if (pageidRaw) {
    const p = parseInt(pageidRaw, 10);
    if (Number.isFinite(p) && p > 0) pageid = p;
  }

  const langRaw = params.get('lang')?.toLowerCase();
  const lang =
    langRaw && (AVAILABLE_LANGUAGES as readonly string[]).includes(langRaw)
      ? (langRaw as WikiLanguage)
      : undefined;

  return { lat, lng, zoom, pageid, lang };
}

export function replaceMapUrl(state: {
  lat: number;
  lng: number;
  zoom: number;
  lang: WikiLanguage;
  pageid?: number;
}): void {
  const params = new URLSearchParams();
  params.set('lat', state.lat.toFixed(5));
  params.set('lng', state.lng.toFixed(5));
  params.set('z', String(Math.round(state.zoom)));
  params.set('lang', state.lang);
  if (state.pageid != null) params.set('pageid', String(state.pageid));
  const qs = params.toString();
  const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
  window.history.replaceState(null, '', newUrl);
}
