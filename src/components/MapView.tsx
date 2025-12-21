import { useEffect, useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';
import { fetchNearbyPlaces, fetchArticleDetails, WikiPlace, WikiArticle } from '@/lib/wikipedia';
import WikiInfoPanel from './WikiInfoPanel';
import { Loader2, Layers, Navigation, Map, Mountain, Satellite, ZoomIn, ZoomOut, Menu, Moon, Sun, Bookmark } from 'lucide-react';
import { useTheme } from 'next-themes';
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
    attribution: '&copy; OpenStreetMap',
    name: 'Standard',
    options: { maxZoom: 19, maxNativeZoom: 19, subdomains: 'abc' },
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
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
    attribution: '&copy; HOT OSM',
    name: 'Detailed',
    options: { maxZoom: 19, maxNativeZoom: 19, subdomains: 'abc' },
  },
};

// Minimum zoom level to enable scanning (below this = too far)
const MIN_SCAN_ZOOM = 12;

export interface BookmarkedPlace {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  savedAt: number;
}

const MapView = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const { theme, setTheme } = useTheme();
  
  const [places, setPlaces] = useState<WikiPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<WikiPlace | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<MapLayer>('standard');
  const [isLocating, setIsLocating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(13);
  const [isScanDisabled, setIsScanDisabled] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkedPlace[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  // Load bookmarks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('wiki-bookmarks');
    if (saved) {
      setBookmarks(JSON.parse(saved));
    }
  }, []);

  const toggleBookmark = (place: WikiPlace) => {
    setBookmarks(prev => {
      const exists = prev.find(b => b.pageid === place.pageid);
      let updated: BookmarkedPlace[];
      if (exists) {
        updated = prev.filter(b => b.pageid !== place.pageid);
        toast.success('Bookmark removed');
      } else {
        updated = [...prev, { pageid: place.pageid, title: place.title, lat: place.lat, lon: place.lon, savedAt: Date.now() }];
        toast.success('Bookmark added');
      }
      localStorage.setItem('wiki-bookmarks', JSON.stringify(updated));
      return updated;
    });
  };

  const isBookmarked = (pageid: number) => bookmarks.some(b => b.pageid === pageid);

  const flyToBookmark = (bookmark: BookmarkedPlace) => {
    if (mapRef.current) {
      mapRef.current.flyTo([bookmark.lat, bookmark.lon], 15);
      setShowBookmarks(false);
    }
  };

  const createMarkerIcon = (isSelected: boolean) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: ${isSelected ? '40px' : '32px'};
          height: ${isSelected ? '40px' : '32px'};
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg) ${isSelected ? 'scale(1.1)' : 'scale(1)'};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px hsl(var(--primary) / 0.4);
          border: 3px solid hsl(var(--background));
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        ">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="hsl(var(--background))" stroke="hsl(var(--background))" stroke-width="0">
              <circle cx="12" cy="12" r="4"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
      iconAnchor: [isSelected ? 20 : 16, isSelected ? 40 : 32],
    });
  };

  const calculateRadius = (bounds: L.LatLngBounds) => {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const distance = ne.distanceTo(sw) / 2;
    return Math.min(Math.max(distance, 8000), 10000);
  };

  const fetchPlacesForBounds = useCallback(async () => {
    if (!mapRef.current) return;
    
    const zoom = mapRef.current.getZoom();
    setZoomLevel(zoom);
    
    // Disable scanning when zoomed out too far
    if (zoom < MIN_SCAN_ZOOM) {
      setIsScanDisabled(true);
      setPlaces([]);
      return;
    }
    
    setIsScanDisabled(false);
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
      toast.error(`Failed to load ${TILE_LAYERS[layer].name} tiles`);
    });

    setCurrentLayer(layer);
    toast.success(`${TILE_LAYERS[layer].name} view`);
  };

  const handleLocateUser = () => {
    if (!mapRef.current) return;
    setIsLocating(true);
    mapRef.current.locate({ setView: true, maxZoom: 14 });
  };

  const handleZoomIn = () => {
    if (!mapRef.current) return;
    mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (!mapRef.current) return;
    mapRef.current.zoomOut();
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [48.8566, 2.3522],
      zoom: 13,
      zoomControl: false, // Use custom controls
    });

    tileLayerRef.current = L.tileLayer(TILE_LAYERS.standard.url, {
      attribution: TILE_LAYERS.standard.attribution,
      ...(TILE_LAYERS.standard.options || {}),
    }).addTo(map);

    tileLayerRef.current.on('tileerror', () => {
      toast.error(`Failed to load map tiles`);
    });

    markersLayerRef.current = L.layerGroup().addTo(map);

    const triggerFetch = () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchPlacesForBounds();
      }, 500);
    };

    map.on('moveend', triggerFetch);
    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
      triggerFetch();
    });

    map.on('locationfound', (e) => {
      setIsLocating(false);

      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
      }

      userLocationMarkerRef.current = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="position: relative;">
              <div style="
                width: 18px;
                height: 18px;
                background: hsl(217, 91%, 60%);
                border-radius: 50%;
                border: 3px solid hsl(var(--background));
                box-shadow: 0 0 0 3px hsl(217, 91%, 60% / 0.3), 0 4px 12px rgba(0,0,0,0.2);
              "></div>
              <div style="
                position: absolute;
                top: -4px;
                left: -4px;
                width: 26px;
                height: 26px;
                border: 2px solid hsl(217, 91%, 60% / 0.4);
                border-radius: 50%;
                animation: pulse 2s infinite;
              "></div>
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      }).addTo(map);
      
      toast.success('Location found');
    });

    map.on('locationerror', () => {
      setIsLocating(false);
      toast.error('Could not get your location');
    });

    mapRef.current = map;
    fetchPlacesForBounds();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [fetchPlacesForBounds]);

  // Update markers when places change
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    places.forEach((place) => {
      const marker = L.marker([place.lat, place.lon], {
        icon: createMarkerIcon(selectedPlace?.pageid === place.pageid),
      });

      marker.bindPopup(`
        <div style="font-family: var(--font-sans); padding: 4px;">
          <strong style="font-size: 14px;">${place.title}</strong>
        </div>
      `);
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
    <div className="relative w-full h-full overflow-hidden bg-background">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Status Bar - Glassmorphism */}
      <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
        <div className="flex items-center justify-between">
          {/* Left: Status */}
          <div className="pointer-events-auto">
            {isLoadingPlaces && (
              <div className="bg-card/90 backdrop-blur-md px-4 py-2.5 border-2 border-border shadow-sm flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
                <span className="text-sm font-medium text-card-foreground">Scanning area...</span>
              </div>
            )}
            
            {!isLoadingPlaces && isScanDisabled && (
              <div className="bg-muted/90 backdrop-blur-md px-4 py-2.5 border-2 border-border shadow-sm flex items-center gap-3">
                <ZoomIn className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Zoom in to discover places</span>
              </div>
            )}
            
            {!isLoadingPlaces && !isScanDisabled && markersLayerRef.current && (
              <div className="bg-card/90 backdrop-blur-md px-4 py-2.5 border-2 border-border shadow-sm flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-card-foreground">
                  <span className="text-primary font-bold">{markersLayerRef.current.getLayers().length}</span> places visible
                </span>
              </div>
            )}
          </div>

          {/* Right: Layer Selector */}
          <div className="pointer-events-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="bg-card/90 backdrop-blur-md border-2 border-border shadow-sm hover:bg-card gap-2 h-10"
                >
                  {getLayerIcon(currentLayer)}
                  <span className="hidden sm:inline text-sm font-medium">{TILE_LAYERS[currentLayer].name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[2000] bg-card border-2 border-border shadow-md min-w-[140px]">
                {(Object.keys(TILE_LAYERS) as MapLayer[]).map((layer) => (
                  <DropdownMenuItem
                    key={layer}
                    onClick={() => changeMapLayer(layer)}
                    className={`flex items-center gap-3 cursor-pointer ${currentLayer === layer ? 'bg-accent' : ''}`}
                  >
                    {getLayerIcon(layer)}
                    <span className="font-medium">{TILE_LAYERS[layer].name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Right Side Controls - Vertical Stack */}
      <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-2">
        {/* Zoom Controls */}
        <div className="bg-card/90 backdrop-blur-md border-2 border-border shadow-sm flex flex-col overflow-hidden">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleZoomIn}
            className="h-10 w-10 rounded-none border-b border-border hover:bg-accent"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleZoomOut}
            className="h-10 w-10 rounded-none hover:bg-accent"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Location Button */}
        <Button 
          variant="secondary"
          size="icon"
          className="h-10 w-10 bg-card/90 backdrop-blur-md border-2 border-border shadow-sm hover:bg-card"
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

      {/* Menu Button */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="secondary" 
              size="icon"
              className="h-10 w-10 bg-card/90 backdrop-blur-md border-2 border-border shadow-sm hover:bg-card"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="z-[2000] bg-card border-2 border-border shadow-md min-w-[180px]">
            <DropdownMenuItem
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-3 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowBookmarks(true)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Bookmark className="w-4 h-4" />
              <span className="font-medium">Bookmarks ({bookmarks.length})</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bookmarks Panel */}
      {showBookmarks && (
        <div className="absolute inset-y-0 left-0 w-full sm:w-[320px] bg-card/95 backdrop-blur-xl border-r-2 border-border shadow-2xl z-[1001] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b-2 border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary flex items-center justify-center">
                <Bookmark className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-card-foreground">Bookmarks</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBookmarks(false)}
              className="h-10 w-10 border-2 border-border hover:bg-accent"
            >
              <span className="text-lg">×</span>
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {bookmarks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No bookmarks yet</p>
            ) : (
              bookmarks.map(b => (
                <div
                  key={b.pageid}
                  onClick={() => flyToBookmark(b)}
                  className="p-3 bg-muted/50 border border-border hover:bg-accent cursor-pointer transition-colors"
                >
                  <p className="font-medium text-card-foreground text-sm">{b.title}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {b.lat.toFixed(4)}° / {b.lon.toFixed(4)}°
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Info Panel */}
      {isPanelOpen && (
        <WikiInfoPanel
          article={selectedArticle}
          isLoading={isLoadingArticle}
          onClose={handleClosePanel}
          onToggleBookmark={selectedPlace ? () => toggleBookmark(selectedPlace) : undefined}
          isBookmarked={selectedPlace ? isBookmarked(selectedPlace.pageid) : false}
        />
      )}
    </div>
  );
};

export default MapView;
