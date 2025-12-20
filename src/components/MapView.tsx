import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchNearbyPlaces, fetchArticleDetails, WikiPlace, WikiArticle } from '@/lib/wikipedia';
import WikiInfoPanel from './WikiInfoPanel';
import { MapPin, Loader2 } from 'lucide-react';

// Custom marker icon
const createMarkerIcon = (isSelected: boolean) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="w-8 h-8 ${isSelected ? 'bg-primary scale-125' : 'bg-primary/80'} rounded-full flex items-center justify-center shadow-lg border-2 border-primary-foreground transition-transform cursor-pointer hover:scale-110">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary-foreground">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

interface MapEventsHandlerProps {
  onMove: (center: L.LatLng, bounds: L.LatLngBounds) => void;
}

const MapEventsHandler = ({ onMove }: MapEventsHandlerProps) => {
  const map = useMapEvents({
    moveend: () => {
      onMove(map.getCenter(), map.getBounds());
    },
    zoomend: () => {
      onMove(map.getCenter(), map.getBounds());
    },
  });
  
  return null;
};

const MapView = () => {
  const [places, setPlaces] = useState<WikiPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<WikiPlace | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateRadius = (bounds: L.LatLngBounds) => {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const distance = ne.distanceTo(sw) / 2;
    return Math.min(distance, 10000);
  };

  const handleMapMove = useCallback((center: L.LatLng, bounds: L.LatLngBounds) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(async () => {
      setIsLoadingPlaces(true);
      const radius = calculateRadius(bounds);
      const nearbyPlaces = await fetchNearbyPlaces(center.lat, center.lng, radius);
      setPlaces(nearbyPlaces);
      setIsLoadingPlaces(false);
    }, 500);
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

  // Initial fetch on mount
  useEffect(() => {
    const fetchInitialPlaces = async () => {
      setIsLoadingPlaces(true);
      const initialPlaces = await fetchNearbyPlaces(48.8566, 2.3522, 5000);
      setPlaces(initialPlaces);
      setIsLoadingPlaces(false);
    };
    fetchInitialPlaces();
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapEventsHandler onMove={handleMapMove} />
        
        {places.map((place) => (
          <Marker
            key={place.pageid}
            position={[place.lat, place.lon]}
            icon={createMarkerIcon(selectedPlace?.pageid === place.pageid)}
            eventHandlers={{
              click: () => handleMarkerClick(place),
            }}
          >
            <Popup>
              <span className="font-medium">{place.title}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

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
