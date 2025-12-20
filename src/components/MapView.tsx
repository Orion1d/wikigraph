import { useEffect, useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchNearbyPlaces, fetchArticleDetails, WikiPlace, WikiArticle } from '@/lib/wikipedia';
import WikiInfoPanel from './WikiInfoPanel';
import { MapPin, Loader2 } from 'lucide-react';

const MapView = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  
  const [places, setPlaces] = useState<WikiPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<WikiPlace | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createMarkerIcon = (isSelected: boolean) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: ${isSelected ? 'hsl(20, 90%, 48%)' : 'hsl(20, 90%, 48%, 0.8)'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 2px solid hsl(33, 100%, 96%);
          transform: ${isSelected ? 'scale(1.25)' : 'scale(1)'};
          transition: transform 0.2s;
          cursor: pointer;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(33, 100%, 96%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  };

  const calculateRadius = (bounds: L.LatLngBounds) => {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const distance = ne.distanceTo(sw) / 2;
    return Math.min(distance, 10000);
  };

  const fetchPlacesForBounds = useCallback(async () => {
    if (!mapRef.current) return;
    
    const center = mapRef.current.getCenter();
    const bounds = mapRef.current.getBounds();
    const radius = calculateRadius(bounds);
    
    setIsLoadingPlaces(true);
    const nearbyPlaces = await fetchNearbyPlaces(center.lat, center.lng, radius);
    setPlaces(nearbyPlaces);
    setIsLoadingPlaces(false);
  }, []);

  const handleMarkerClick = async (place: WikiPlace) => {
    setSelectedPlace(place);
    setIsPanelOpen(true);
    setIsLoadingArticle(true);
    
    const article = await fetchArticleDetails(place.pageid);
    setSelectedArticle(article);
    setIsLoadingArticle(false);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedPlace(null);
    setSelectedArticle(null);
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [48.8566, 2.3522],
      zoom: 13,
      zoomControl: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Create markers layer
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Add event listeners
    map.on('moveend', () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchPlacesForBounds();
      }, 500);
    });

    mapRef.current = map;

    // Initial fetch
    fetchPlacesForBounds();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [fetchPlacesForBounds]);

  // Update markers when places change
  useEffect(() => {
    if (!markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Add new markers
    places.forEach((place) => {
      const marker = L.marker([place.lat, place.lon], {
        icon: createMarkerIcon(selectedPlace?.pageid === place.pageid),
      });

      marker.bindPopup(`<b>${place.title}</b>`);
      marker.on('click', () => handleMarkerClick(place));
      
      markersLayerRef.current?.addLayer(marker);
    });
  }, [places, selectedPlace]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading indicator */}
      {isLoadingPlaces && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-card px-4 py-2 rounded-full shadow-lg border border-border flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-card-foreground">Finding places...</span>
        </div>
      )}

      {/* Places count */}
      {!isLoadingPlaces && places.length > 0 && (
        <div className="absolute top-4 left-4 z-[1000] bg-card px-4 py-2 rounded-full shadow-lg border border-border flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm text-card-foreground">
            {places.length} places found
          </span>
        </div>
      )}

      {/* Info Panel */}
      {isPanelOpen && (
        <WikiInfoPanel
          article={selectedArticle}
          isLoading={isLoadingArticle}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
};

export default MapView;
