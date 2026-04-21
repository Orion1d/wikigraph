import { useRef, useCallback } from 'react';
import L from 'leaflet';
import { toast } from 'sonner';
import { DISCOVERY_THEMES, DiscoveryTheme } from '@/lib/mapConstants';

const HISTORY_SIZE = 5;

export function useDiscovery(mapRef: React.RefObject<L.Map | null>) {
  const historyRef = useRef<Map<DiscoveryTheme, number[]>>(new Map());

  const handleThemedDiscover = useCallback(
    (theme: DiscoveryTheme): boolean => {
      const map = mapRef.current;
      if (!map) return false;

      const locations = DISCOVERY_THEMES[theme].locations;
      const history = historyRef.current.get(theme) || [];

      // Filter out recently visited locations
      const availableIndices = locations
        .map((_, i) => i)
        .filter((i) => !history.includes(i));

      // If all locations have been visited recently, reset history for this theme
      const indicesToChooseFrom =
        availableIndices.length > 0 ? availableIndices : locations.map((_, i) => i);

      const randomIndex =
        indicesToChooseFrom[Math.floor(Math.random() * indicesToChooseFrom.length)];
      const location = locations[randomIndex];

      // Add to history and keep only last entries per theme
      const newHistory = [...history, randomIndex].slice(-HISTORY_SIZE);
      historyRef.current.set(theme, newHistory);

      map.flyTo([location.lat, location.lon], 14, { duration: 2 });
      toast.success(`${DISCOVERY_THEMES[theme].name}: ${location.name}`);
      
      return true;
    },
    [mapRef]
  );

  const handleRandomDiscover = useCallback(() => {
    return handleThemedDiscover('random');
  }, [handleThemedDiscover]);

  return {
    handleThemedDiscover,
    handleRandomDiscover,
  };
}
