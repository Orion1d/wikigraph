import { useEffect, useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';
import { fetchNearbyPlaces, fetchArticleDetails, WikiPlace, WikiArticle } from '@/lib/wikipedia';
import WikiInfoPanel from './WikiInfoPanel';
import { MapPin, Loader2, Layers, Navigation, Map, Mountain, Satellite } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type MapLayer = 'standard' | 'terrain' | 'satellite' | 'topo';

type TileLayerDef = {
  url: string;
  attribution: string;
  name: string;
  options?: L.TileLayerOptions;
};

const TILE_LAYERS: Record<MapLayer, TileLayerDef> = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    name: 'Standard',
    options: { maxZoom: 19, maxNativeZoom: 19, subdomains: 'abc' },
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    name: 'Terrain',
    options: { maxZoom: 19, maxNativeZoom: 17, subdomains: 'abc' },
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    name: 'Satellite',
    options: { maxZoom: 19, maxNativeZoom: 19 },
  },
  topo: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by HOT',
    name: 'Detailed',
    options: { maxZoom: 19, maxNativeZoom: 19, subdomains: 'abc' },
  },
};

const MapView = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  const [places, setPlaces] = useState<WikiPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<WikiPlace | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<MapLayer>('standard');
  const [isLocating, setIsLocating] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

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

    // Keep scanning useful even when fully zoomed in.
    // Wikipedia geosearch can return nothing if radius is too tiny.
    return Math.min(Math.max(distance, 8000), 10000);
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

  const changeMapLayer = (layer: MapLayer) => {
    if (!mapRef.current || !tileLayerRef.current) return;

    mapRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(TILE_LAYERS[layer].url, {
      attribution: TILE_LAYERS[layer].attribution,
      ...(TILE_LAYERS[layer].options || {}),
    }).addTo(mapRef.current);

    tileLayerRef.current.on('tileerror', () => {
      toast.error(`Map tiles failed to load for ${TILE_LAYERS[layer].name}.`);
    });

    setCurrentLayer(layer);
    toast(`Map mode: ${TILE_LAYERS[layer].name}`);
  };

  const handleLocateUser = () => {
    if (!mapRef.current) return;
    
    setIsLocating(true);
    mapRef.current.locate({ setView: true, maxZoom: 14 });
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
    tileLayerRef.current = L.tileLayer(TILE_LAYERS.standard.url, {
      attribution: TILE_LAYERS.standard.attribution,
      ...(TILE_LAYERS.standard.options || {}),
    }).addTo(map);

    tileLayerRef.current.on('tileerror', () => {
      toast.error(`Map tiles failed to load for ${TILE_LAYERS.standard.name}.`);
    });

    // Create markers layer
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Trigger fetch on moveend AND zoomend
    const triggerFetch = () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchPlacesForBounds();
      }, 500);
    };

    map.on('moveend', triggerFetch);
    map.on('zoomend', triggerFetch);
    // Also fetch while the user is zooming/panning (debounced)
    map.on('move', triggerFetch);
    map.on('zoom', triggerFetch);

    // Handle location found
    map.on('locationfound', (e) => {
      setIsLocating(false);

      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
      }

      userLocationMarkerRef.current = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="
              width: 20px;
              height: 20px;
              background: hsl(217, 91%, 60%);
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(map);
    });

    map.on('locationerror', () => {
      setIsLocating(false);
      alert('Could not get your location. Please ensure location access is enabled.');
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

  const getLayerIcon = (layer: MapLayer) => {
    switch (layer) {
      case 'terrain': return <Mountain className="w-4 h-4" />;
      case 'satellite': return <Satellite className="w-4 h-4" />;
      case 'topo': return <Map className="w-4 h-4" />;
      default: return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Layer Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="shadow-lg" aria-label={`Map mode: ${TILE_LAYERS[currentLayer].name}`}
              title={`Map mode: ${TILE_LAYERS[currentLayer].name}`}
            >
              {getLayerIcon(currentLayer)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[2000] bg-popover text-popover-foreground border border-border shadow-md">
            {(Object.keys(TILE_LAYERS) as MapLayer[]).map((layer) => (
              <DropdownMenuItem
                key={layer}
                onClick={() => changeMapLayer(layer)}
                className={currentLayer === layer ? 'bg-accent' : ''}
              >
                <span className="flex items-center gap-2">
                  {getLayerIcon(layer)}
                  {TILE_LAYERS[layer].name}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Location Button */}
        <Button 
          variant="secondary" 
          size="icon" 
          className="shadow-lg"
          onClick={handleLocateUser}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>
      </div>

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
