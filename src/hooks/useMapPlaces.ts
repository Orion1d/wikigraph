import { useState, useCallback, useRef, useEffect } from 'react';
import L from 'leaflet';
import { fetchNearbyPlaces, WikiPlace } from '@/lib/wikipedia';
import { MIN_SCAN_ZOOM } from '@/lib/mapConstants';
import type { WikiLanguage } from '@/components/SearchPanel';

const FETCH_DEBOUNCE_MS = 500;

export interface MapPlacesState {
  places: WikiPlace[];
  isLoading: boolean;
  isScanDisabled: boolean;
  visibleCount: number;
}

export function useMapPlaces(
  mapRef: React.RefObject<L.Map | null>,
  markersLayerRef: React.RefObject<L.MarkerClusterGroup | null>,
  language: WikiLanguage
) {
  const [places, setPlaces] = useState<WikiPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [isScanDisabled, setIsScanDisabled] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchKeyRef = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const calculateRadius = useCallback((bounds: L.LatLngBounds) => {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const distance = ne.distanceTo(sw) / 2;
    return Math.min(Math.max(distance, 8000), 10000);
  }, []);

  const updateVisibleCount = useCallback(() => {
    const map = mapRef.current;
    const group = markersLayerRef.current;
    if (!map || !group) {
      setVisibleCount(0);
      return;
    }

    const bounds = map.getBounds();
    let count = 0;

    group.eachLayer((layer: L.Layer) => {
      const markerLayer = layer as L.Marker;
      // Marker
      if (markerLayer.getLatLng) {
        const ll = markerLayer.getLatLng();
        if (bounds.contains(ll)) count += 1;
        return;
      }

      // Cluster
      const clusterLayer = layer as L.MarkerClusterGroup;
      if ('getAllChildMarkers' in clusterLayer) {
        const children = (clusterLayer as unknown as { getAllChildMarkers: () => L.Marker[] }).getAllChildMarkers();
        for (const m of children) {
          const ll = m.getLatLng();
          if (bounds.contains(ll)) count += 1;
        }
      }
    });

    setVisibleCount(count);
  }, [mapRef, markersLayerRef]);

  const fetchPlacesForBounds = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    const zoom = map.getZoom();

    // Disable scanning when zoomed out too far
    if (zoom < MIN_SCAN_ZOOM) {
      setIsScanDisabled(true);
      setPlaces([]);
      return;
    }

    setIsScanDisabled(false);
    const center = map.getCenter();
    const bounds = map.getBounds();
    const radius = calculateRadius(bounds);

    // Create a key to avoid duplicate fetches for same area
    const fetchKey = `${center.lat.toFixed(3)}:${center.lng.toFixed(3)}:${radius}:${language}`;
    if (fetchKey === lastFetchKeyRef.current) {
      return;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    lastFetchKeyRef.current = fetchKey;
    setIsLoadingPlaces(true);

    try {
      const nearbyPlaces = await fetchNearbyPlaces(center.lat, center.lng, radius, language);
      
      // Check if this request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      setPlaces(nearbyPlaces);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error fetching places:', error);
    } finally {
      setIsLoadingPlaces(false);
    }
  }, [mapRef, language, calculateRadius]);

  const debouncedFetch = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchPlacesForBounds();
    }, FETCH_DEBOUNCE_MS);
  }, [fetchPlacesForBounds]);

  // Trigger immediate fetch (for language change, initial load)
  const triggerImmediateFetch = useCallback(() => {
    lastFetchKeyRef.current = ''; // Reset to force fetch
    fetchPlacesForBounds();
  }, [fetchPlacesForBounds]);

  return {
    places,
    isLoadingPlaces,
    isScanDisabled,
    visibleCount,
    fetchPlacesForBounds: debouncedFetch,
    triggerImmediateFetch,
    updateVisibleCount,
  };
}
