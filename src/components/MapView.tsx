import { useEffect, useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { toast } from 'sonner';
import { fetchNearbyPlaces, fetchArticleDetails, searchPlaceByName, WikiPlace, WikiArticle } from '@/lib/wikipedia';
import WikiInfoPanel from './WikiInfoPanel';
import SearchPanel, { WikiLanguage } from './SearchPanel';
import { Loader2, Layers, Navigation, Map, Satellite, ZoomIn, ZoomOut, Menu, Moon, Sun, Bookmark, Shuffle, Search, Globe, ChevronRight, ArrowLeft, Castle, Mountain, Landmark, Church, Trees, Compass } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type MapLayer = 'standard' | 'satellite' | 'topo';

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
const MIN_SCAN_ZOOM = 11;

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
  const markersLayerRef = useRef<L.MarkerClusterGroup | null>(null);
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
  const [showSearch, setShowSearch] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showDiscoveryMenu, setShowDiscoveryMenu] = useState(false);
  const [hoveredArticle, setHoveredArticle] = useState<WikiArticle | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [isLoadingHover, setIsLoadingHover] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverCacheRef = useRef<globalThis.Map<number, WikiArticle>>(new globalThis.Map());
  
  const [selectedLanguage, setSelectedLanguage] = useState<WikiLanguage>(() => {
    const availableLanguages: WikiLanguage[] = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ar', 'ko', 'nl', 'pl', 'sv', 'tr'];
    const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
    return (availableLanguages.includes(browserLang as WikiLanguage) ? browserLang : 'en') as WikiLanguage;
  });
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

  const createMarkerIcon = () => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#000000" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
          <circle cx="12" cy="10" r="3" fill="#ffffff" stroke="#000000"/>
        </svg>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
  };

  const calculateRadius = (bounds: L.LatLngBounds) => {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const distance = ne.distanceTo(sw) / 2;
    return Math.min(Math.max(distance, 8000), 10000);
  };

  const updateVisibleCount = useCallback(() => {
    const map = mapRef.current;
    const group = markersLayerRef.current;
    if (!map || !group) {
      setVisibleCount(0);
      return;
    }

    const bounds = map.getBounds();
    let count = 0;

    group.eachLayer((layer: any) => {
      // Marker
      if (layer?.getLatLng) {
        const ll: L.LatLng = layer.getLatLng();
        if (bounds.contains(ll)) count += 1;
        return;
      }

      // Cluster
      if (layer?.getAllChildMarkers) {
        const children: L.Marker[] = layer.getAllChildMarkers();
        for (const m of children) {
          const ll = m.getLatLng();
          if (bounds.contains(ll)) count += 1;
        }
      }
    });

    setVisibleCount(count);
  }, []);

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
    const nearbyPlaces = await fetchNearbyPlaces(center.lat, center.lng, radius, selectedLanguage);
    setPlaces(nearbyPlaces);
    setIsLoadingPlaces(false);
  }, [selectedLanguage]);

  const handleMarkerClick = async (place: WikiPlace) => {
    setSelectedPlace(place);
    setIsPanelOpen(true);
    setIsLoadingArticle(true);
    
    const article = await fetchArticleDetails(place.pageid, selectedLanguage);
    setSelectedArticle(article);
    setIsLoadingArticle(false);
  };

  const handleSearch = async (query: string, coords?: { lat: number; lon: number }) => {
    if (!mapRef.current) return;
    
    if (coords) {
      mapRef.current.flyTo([coords.lat, coords.lon], 14, { duration: 2 });
      toast.success(`Flying to ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`);
      setShowSearch(false);
      return;
    }
    
    // Search by name
    const result = await searchPlaceByName(query, selectedLanguage);
    if (result) {
      mapRef.current.flyTo([result.lat, result.lon], 14, { duration: 2 });
      toast.success(`Found: ${result.title}`);
      setShowSearch(false);
    } else {
      toast.error('Place not found. Try a different search.');
    }
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

  // Discovery themes with categorized locations
  type DiscoveryTheme = 'random' | 'castles' | 'ruins' | 'nature' | 'religious' | 'landmarks';

  const DISCOVERY_THEMES: Record<DiscoveryTheme, { name: string; icon: React.ReactNode; locations: { name: string; lat: number; lon: number }[] }> = {
    random: {
      name: 'Random',
      icon: <Shuffle className="w-4 h-4" />,
      locations: [
        { name: 'Rome, Italy', lat: 41.9028, lon: 12.4964 },
        { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
        { name: 'New York, USA', lat: 40.7128, lon: -74.0060 },
        { name: 'Cairo, Egypt', lat: 30.0444, lon: 31.2357 },
        { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093 },
        { name: 'Paris, France', lat: 48.8566, lon: 2.3522 },
        { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
        { name: 'Barcelona, Spain', lat: 41.3851, lon: 2.1734 },
        { name: 'Istanbul, Turkey', lat: 41.0082, lon: 28.9784 },
        { name: 'Kyoto, Japan', lat: 35.0116, lon: 135.7681 },
        { name: 'Prague, Czech Republic', lat: 50.0755, lon: 14.4378 },
        { name: 'Vienna, Austria', lat: 48.2082, lon: 16.3738 },
        { name: 'Amsterdam, Netherlands', lat: 52.3676, lon: 4.9041 },
        { name: 'Berlin, Germany', lat: 52.5200, lon: 13.4050 },
        { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
      ],
    },
    castles: {
      name: 'Castles',
      icon: <Castle className="w-4 h-4" />,
      locations: [
        { name: 'Neuschwanstein Castle, Germany', lat: 47.5576, lon: 10.7498 },
        { name: 'Edinburgh Castle, Scotland', lat: 55.9486, lon: -3.1999 },
        { name: 'Prague Castle, Czech Republic', lat: 50.0909, lon: 14.4010 },
        { name: 'Windsor Castle, UK', lat: 51.4839, lon: -0.6044 },
        { name: 'Château de Chambord, France', lat: 47.6162, lon: 1.5170 },
        { name: 'Alhambra, Spain', lat: 37.1760, lon: -3.5881 },
        { name: 'Bran Castle, Romania', lat: 45.5150, lon: 25.3672 },
        { name: 'Warwick Castle, UK', lat: 52.2795, lon: -1.5849 },
        { name: 'Hohenzollern Castle, Germany', lat: 48.3232, lon: 8.9673 },
        { name: 'Château de Versailles, France', lat: 48.8049, lon: 2.1204 },
      ],
    },
    ruins: {
      name: 'Ancient Ruins',
      icon: <Landmark className="w-4 h-4" />,
      locations: [
        { name: 'Machu Picchu, Peru', lat: -13.1631, lon: -72.5450 },
        { name: 'Colosseum, Rome', lat: 41.8902, lon: 12.4922 },
        { name: 'Petra, Jordan', lat: 30.3285, lon: 35.4444 },
        { name: 'Angkor Wat, Cambodia', lat: 13.4125, lon: 103.8670 },
        { name: 'Chichen Itza, Mexico', lat: 20.6843, lon: -88.5678 },
        { name: 'Acropolis, Athens', lat: 37.9715, lon: 23.7257 },
        { name: 'Pompeii, Italy', lat: 40.7462, lon: 14.4989 },
        { name: 'Ephesus, Turkey', lat: 37.9490, lon: 27.3680 },
        { name: 'Great Wall, China', lat: 40.4319, lon: 116.5704 },
        { name: 'Teotihuacan, Mexico', lat: 19.6925, lon: -98.8438 },
      ],
    },
    nature: {
      name: 'Nature Wonders',
      icon: <Mountain className="w-4 h-4" />,
      locations: [
        { name: 'Grand Canyon, USA', lat: 36.1069, lon: -112.1129 },
        { name: 'Victoria Falls, Zimbabwe', lat: -17.9243, lon: 25.8572 },
        { name: 'Niagara Falls, Canada', lat: 43.0962, lon: -79.0377 },
        { name: 'Yosemite, USA', lat: 37.8651, lon: -119.5383 },
        { name: 'Galápagos Islands, Ecuador', lat: -0.9538, lon: -90.9656 },
        { name: 'Ha Long Bay, Vietnam', lat: 20.9101, lon: 107.1839 },
        { name: 'Plitvice Lakes, Croatia', lat: 44.8654, lon: 15.5820 },
        { name: 'Yellowstone, USA', lat: 44.4280, lon: -110.5885 },
        { name: 'Swiss Alps, Switzerland', lat: 46.5197, lon: 7.9596 },
        { name: 'Zhangjiajie, China', lat: 29.3177, lon: 110.4343 },
      ],
    },
    religious: {
      name: 'Sacred Sites',
      icon: <Church className="w-4 h-4" />,
      locations: [
        { name: 'Vatican City', lat: 41.9029, lon: 12.4534 },
        { name: 'Notre-Dame, Paris', lat: 48.8530, lon: 2.3499 },
        { name: 'Hagia Sophia, Istanbul', lat: 41.0086, lon: 28.9802 },
        { name: 'Sagrada Familia, Barcelona', lat: 41.4036, lon: 2.1744 },
        { name: 'Blue Mosque, Istanbul', lat: 41.0054, lon: 28.9768 },
        { name: 'Golden Temple, India', lat: 31.6200, lon: 74.8765 },
        { name: 'Wat Phra Kaew, Bangkok', lat: 13.7516, lon: 100.4927 },
        { name: 'St. Peter\'s Basilica, Vatican', lat: 41.9022, lon: 12.4539 },
        { name: 'Sensoji Temple, Tokyo', lat: 35.7148, lon: 139.7967 },
        { name: 'Westminster Abbey, London', lat: 51.4994, lon: -0.1273 },
      ],
    },
    landmarks: {
      name: 'Famous Landmarks',
      icon: <Trees className="w-4 h-4" />,
      locations: [
        { name: 'Eiffel Tower, Paris', lat: 48.8584, lon: 2.2945 },
        { name: 'Statue of Liberty, USA', lat: 40.6892, lon: -74.0445 },
        { name: 'Big Ben, London', lat: 51.5007, lon: -0.1246 },
        { name: 'Sydney Opera House', lat: -33.8568, lon: 151.2153 },
        { name: 'Taj Mahal, India', lat: 27.1751, lon: 78.0421 },
        { name: 'Christ the Redeemer, Brazil', lat: -22.9519, lon: -43.2105 },
        { name: 'Burj Khalifa, Dubai', lat: 25.1972, lon: 55.2744 },
        { name: 'Tower Bridge, London', lat: 51.5055, lon: -0.0754 },
        { name: 'Golden Gate Bridge, USA', lat: 37.8199, lon: -122.4783 },
        { name: 'Leaning Tower of Pisa, Italy', lat: 43.7230, lon: 10.3966 },
      ],
    },
  };

  // Track last 10 visited locations to avoid repeats
  const discoveryHistoryRef = useRef<globalThis.Map<DiscoveryTheme, number[]>>(new globalThis.Map());

  const handleThemedDiscover = (theme: DiscoveryTheme) => {
    if (!mapRef.current) return;
    
    const locations = DISCOVERY_THEMES[theme].locations;
    const history = discoveryHistoryRef.current.get(theme) || [];
    
    // Filter out recently visited locations
    const availableIndices = locations.map((_, i) => i)
      .filter(i => !history.includes(i));
    
    // If all locations have been visited recently, reset history for this theme
    const indicesToChooseFrom = availableIndices.length > 0 
      ? availableIndices 
      : locations.map((_, i) => i);
    
    const randomIndex = indicesToChooseFrom[Math.floor(Math.random() * indicesToChooseFrom.length)];
    const location = locations[randomIndex];
    
    // Add to history and keep only last 5 per theme
    const newHistory = [...history, randomIndex].slice(-5);
    discoveryHistoryRef.current.set(theme, newHistory);
    
    mapRef.current.flyTo([location.lat, location.lon], 14, { duration: 2 });
    toast.success(`${DISCOVERY_THEMES[theme].name}: ${location.name}`);
    setShowDiscoveryMenu(false);
  };

  const handleRandomDiscover = () => handleThemedDiscover('random');

  // Handle marker hover for quick facts
  const handleMarkerHover = useCallback(async (place: WikiPlace, e: L.LeafletMouseEvent) => {
    // Clear any pending timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set position immediately
    setHoverPosition({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });

    // Check cache first
    if (hoverCacheRef.current.has(place.pageid)) {
      setHoveredArticle(hoverCacheRef.current.get(place.pageid)!);
      return;
    }

    // Delay fetching to avoid excessive API calls
    hoverTimeoutRef.current = setTimeout(async () => {
      setIsLoadingHover(true);
      const article = await fetchArticleDetails(place.pageid, selectedLanguage);
      if (article) {
        hoverCacheRef.current.set(place.pageid, article);
        setHoveredArticle(article);
      }
      setIsLoadingHover(false);
    }, 300);
  }, [selectedLanguage]);

  const handleMarkerHoverEnd = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredArticle(null);
    setHoverPosition(null);
    setIsLoadingHover(false);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [41.0082, 28.9784], // Istanbul
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

    markersLayerRef.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    }).addTo(map);

    const triggerFetch = () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchPlacesForBounds();
      }, 500);
    };

    map.on('moveend', () => {
      triggerFetch();
      updateVisibleCount();
    });
    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
      triggerFetch();
      updateVisibleCount();
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
    updateVisibleCount();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [fetchPlacesForBounds]);

  // Update markers when places change
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // Leaflet wraps the world horizontally; near the dateline the map center lng might be e.g. 191
    // while Wikipedia returns lng in [-180, 180]. Wrap marker longitudes to the closest world copy.
    const centerLng = mapRef.current?.getCenter().lng ?? 0;
    const wrapLonToCenter = (lon: number, center: number) => {
      const wrapped = lon + 360 * Math.round((center - lon) / 360);
      return wrapped;
    };

    places.forEach((place) => {
      const lonForView = wrapLonToCenter(place.lon, centerLng);

      const marker = L.marker([place.lat, lonForView], {
        icon: createMarkerIcon(),
      });

      marker.on('click', () => handleMarkerClick(place));
      marker.on('mouseover', (e) => handleMarkerHover(place, e));
      marker.on('mouseout', handleMarkerHoverEnd);

      markersLayerRef.current?.addLayer(marker);
    });

    updateVisibleCount();
  }, [places, selectedPlace, updateVisibleCount, handleMarkerHover, handleMarkerHoverEnd]);

  const getLayerIcon = (layer: MapLayer) => {
    switch (layer) {
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
            
            {!isLoadingPlaces && !isScanDisabled && (
              <div className="bg-card/90 backdrop-blur-md px-4 py-2.5 border-2 border-border shadow-sm flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-card-foreground">
                  <span className="text-primary font-bold">{visibleCount}</span> places visible
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

        {/* Random Discover Button with theme dropdown */}
        <DropdownMenu open={showDiscoveryMenu} onOpenChange={setShowDiscoveryMenu}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="secondary"
              size="icon"
              className="h-10 w-10 bg-primary backdrop-blur-md border-2 border-border shadow-sm hover:bg-primary/90"
              title="Discover places"
            >
              <Compass className="w-4 h-4 text-primary-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="z-[2000] bg-card border-2 border-border shadow-md min-w-[160px]">
            {(Object.keys(DISCOVERY_THEMES) as DiscoveryTheme[]).map((theme) => (
              <DropdownMenuItem
                key={theme}
                onClick={() => handleThemedDiscover(theme)}
                className="flex items-center gap-3 cursor-pointer"
              >
                {DISCOVERY_THEMES[theme].icon}
                <span className="font-medium">{DISCOVERY_THEMES[theme].name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-3 cursor-pointer text-foreground"
            >
              <Search className="w-4 h-4" />
              <span className="font-medium">Search</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowLanguageMenu(true)}
              className="flex items-center gap-3 cursor-pointer text-foreground"
            >
              <Globe className="w-4 h-4" />
              <span className="font-medium flex-1">Language</span>
              <span className="text-xs text-muted-foreground">{selectedLanguage.toUpperCase()}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-3 cursor-pointer text-foreground"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowBookmarks(true)}
              className="flex items-center gap-3 cursor-pointer text-foreground"
            >
              <Bookmark className="w-4 h-4" />
              <span className="font-medium">Bookmarks ({bookmarks.length})</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Language Selection Popup */}
      {showLanguageMenu && (
        <div className="absolute bottom-4 left-4 z-[1001] bg-card/95 backdrop-blur-md border-2 border-border shadow-lg w-[140px]">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLanguageMenu(false)}
              className="h-7 w-7 hover:bg-accent"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium text-sm text-foreground">Language</span>
          </div>
          <div className="max-h-[250px] overflow-auto py-1">
            {(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ar', 'ko', 'nl', 'pl', 'sv', 'tr'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setSelectedLanguage(lang);
                  setShowLanguageMenu(false);
                  setTimeout(() => fetchPlacesForBounds(), 100);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-accent cursor-pointer transition-colors ${selectedLanguage === lang ? 'bg-accent font-semibold' : 'text-foreground'}`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Quick Facts Hover Card */}
      {(hoveredArticle || isLoadingHover) && hoverPosition && (
        <div 
          className="fixed z-[2000] pointer-events-none animate-scale-in"
          style={{
            left: Math.min(hoverPosition.x + 15, window.innerWidth - 280),
            top: Math.max(hoverPosition.y - 100, 10),
          }}
        >
          <div className="bg-card/95 backdrop-blur-md border-2 border-border shadow-lg w-[260px] overflow-hidden">
            {isLoadingHover && !hoveredArticle ? (
              <div className="p-4 flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : hoveredArticle ? (
              <>
                {hoveredArticle.thumbnail && (
                  <img 
                    src={hoveredArticle.thumbnail.source} 
                    alt={hoveredArticle.title}
                    className="w-full h-28 object-cover"
                  />
                )}
                <div className="p-3">
                  <h4 className="font-semibold text-card-foreground text-sm line-clamp-1">
                    {hoveredArticle.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                    {hoveredArticle.extract}
                  </p>
                  <p className="text-[10px] text-primary mt-2 font-medium">
                    Click for details →
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Search Panel */}
      <SearchPanel
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={handleSearch}
      />

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
