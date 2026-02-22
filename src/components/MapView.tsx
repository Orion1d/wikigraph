import { useEffect, useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { toast } from 'sonner';
import { fetchArticleDetails, searchPlaceByName, WikiPlace, WikiArticle } from '@/lib/wikipedia';
import WikiInfoPanel from './WikiInfoPanel';
import SearchPanel, { WikiLanguage } from './SearchPanel';
import { Loader2, Layers, Navigation, Map, Satellite, ZoomIn, ZoomOut, Menu, Moon, Sun, Bookmark, Search, Globe, ChevronRight, ArrowLeft, Compass } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useBookmarks } from '@/hooks/useBookmarks';
import { useHoverPreview } from '@/hooks/useHoverPreview';
import { useMapPlaces } from '@/hooks/useMapPlaces';
import { useDiscovery } from '@/hooks/useDiscovery';
import { 
  TILE_LAYERS, 
  DISCOVERY_THEMES, 
  AVAILABLE_LANGUAGES,
  type MapLayer, 
  type DiscoveryTheme 
} from '@/lib/mapConstants';

const getInitialLanguage = (): WikiLanguage => {
  const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
  return (AVAILABLE_LANGUAGES as readonly string[]).includes(browserLang) 
    ? (browserLang as WikiLanguage) 
    : 'en';
};

const MapView = () => {
  // Refs
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  

  // Theme
  const { theme, setTheme } = useTheme();

  // Core state
  const [selectedPlace, setSelectedPlace] = useState<WikiPlace | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<MapLayer>('standard');
  const [isLocating, setIsLocating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(13);
  
  const [selectedLanguage, setSelectedLanguage] = useState<WikiLanguage>(getInitialLanguage);

  // UI state
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showDiscoveryMenu, setShowDiscoveryMenu] = useState(false);

  // Custom hooks
  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks();
  const { 
    hoveredArticle, 
    hoverPosition, 
    isLoadingHover, 
    handleMarkerHover, 
    handleMarkerHoverEnd 
  } = useHoverPreview(selectedLanguage);
  const { 
    places, 
    isLoadingPlaces, 
    isScanDisabled, 
    visibleCount, 
    fetchPlacesForBounds, 
    triggerImmediateFetch,
    updateVisibleCount 
  } = useMapPlaces(mapRef, markersLayerRef, selectedLanguage);
  const { handleThemedDiscover } = useDiscovery(mapRef);

  // Article fetch abort controller
  const articleAbortRef = useRef<AbortController | null>(null);

  // Marker icon creator
  const createMarkerIcon = useCallback(() => {
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
  }, []);

  // Handle marker click with abort support
  const handleMarkerClick = useCallback(async (place: WikiPlace) => {
    // Abort any pending article fetch
    if (articleAbortRef.current) {
      articleAbortRef.current.abort();
    }
    articleAbortRef.current = new AbortController();

    setSelectedPlace(place);
    setIsPanelOpen(true);
    setIsLoadingArticle(true);

    // Pan map so the pin sits in the left-center of the visible map area
    const map = mapRef.current;
    if (map) {
      const mapSize = map.getSize();
      // Offset by ~25% of map width to the right so pin ends up in left-center
      const offsetX = mapSize.x * 0.25;
      const targetPoint = map.latLngToContainerPoint([place.lat, place.lon]);
      const centeredPoint = L.point(targetPoint.x + offsetX, targetPoint.y);
      const newCenter = map.containerPointToLatLng(centeredPoint);
      map.panTo(newCenter, { animate: true, duration: 0.5 });
    }
    setSelectedArticle(null);

    try {
      const article = await fetchArticleDetails(place.pageid, selectedLanguage);
      if (!articleAbortRef.current?.signal.aborted) {
        setSelectedArticle(article);
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.error('Error fetching article:', error);
      }
    } finally {
      if (!articleAbortRef.current?.signal.aborted) {
        setIsLoadingArticle(false);
      }
    }
  }, [selectedLanguage]);

  // Handle search
  const handleSearch = useCallback(async (query: string, coords?: { lat: number; lon: number }) => {
    const map = mapRef.current;
    if (!map) return;

    if (coords) {
      map.flyTo([coords.lat, coords.lon], 14, { duration: 2 });
      toast.success(`Flying to ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`);
      setShowSearch(false);
      return;
    }

    // Search by name
    const result = await searchPlaceByName(query, selectedLanguage);
    if (result) {
      map.flyTo([result.lat, result.lon], 14, { duration: 2 });
      toast.success(`Found: ${result.title}`);
      setShowSearch(false);
    } else {
      toast.error('Place not found. Try a different search.');
    }
  }, [selectedLanguage]);

  const handleClosePanel = useCallback(() => {
    // Abort any pending fetch
    if (articleAbortRef.current) {
      articleAbortRef.current.abort();
    }
    setIsPanelOpen(false);
    setSelectedPlace(null);
    setSelectedArticle(null);
  }, []);

  // Map layer change
  const changeMapLayer = useCallback((layer: MapLayer) => {
    const map = mapRef.current;
    const tileLayer = tileLayerRef.current;
    if (!map || !tileLayer) return;

    map.removeLayer(tileLayer);
    const newLayer = L.tileLayer(TILE_LAYERS[layer].url, {
      attribution: TILE_LAYERS[layer].attribution,
      ...(TILE_LAYERS[layer].options || {}),
    }).addTo(map);

    newLayer.on('tileerror', () => {
      toast.error(`Failed to load ${TILE_LAYERS[layer].name} tiles`);
    });

    tileLayerRef.current = newLayer;
    setCurrentLayer(layer);
    toast.success(`${TILE_LAYERS[layer].name} view`);
  }, []);

  // Location handlers
  const handleLocateUser = useCallback(() => {
    if (!mapRef.current) return;
    setIsLocating(true);
    mapRef.current.locate({ setView: true, maxZoom: 16 });
  }, []);

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  // Bookmark fly-to
  const flyToBookmark = useCallback((bookmark: { lat: number; lon: number }) => {
    if (mapRef.current) {
      mapRef.current.flyTo([bookmark.lat, bookmark.lon], 15);
      setShowBookmarks(false);
    }
  }, []);

  // Discovery handler
  const handleDiscoveryClick = useCallback((theme: DiscoveryTheme) => {
    if (handleThemedDiscover(theme)) {
      setShowDiscoveryMenu(false);
    }
  }, [handleThemedDiscover]);

  // Language change handler
  const handleLanguageChange = useCallback((lang: WikiLanguage) => {
    setSelectedLanguage(lang);
    setShowLanguageMenu(false);
    // Trigger immediate fetch with new language
    setTimeout(() => triggerImmediateFetch(), 100);
  }, [triggerImmediateFetch]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [41.0082, 28.9784], // Istanbul
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    tileLayerRef.current = L.tileLayer(TILE_LAYERS.standard.url, {
      attribution: TILE_LAYERS.standard.attribution,
      ...(TILE_LAYERS.standard.options || {}),
    }).addTo(map);

    tileLayerRef.current.on('tileerror', () => {
      toast.error('Failed to load map tiles');
    });

    markersLayerRef.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    }).addTo(map);

    // Event listeners
    map.on('moveend', () => {
      fetchPlacesForBounds();
      updateVisibleCount();
    });

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
      fetchPlacesForBounds();
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
    triggerImmediateFetch();
    updateVisibleCount();

    // Cleanup
    return () => {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
      }
      if (articleAbortRef.current) {
        articleAbortRef.current.abort();
      }
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      tileLayerRef.current = null;
    };
  }, [fetchPlacesForBounds, updateVisibleCount, triggerImmediateFetch]);

  // Update markers and heatmap when places change
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    const map = mapRef.current;
    if (!markersLayer || !map) return;

    markersLayer.clearLayers();

    const centerLng = map.getCenter().lng ?? 0;
    const wrapLonToCenter = (lon: number, center: number) => {
      return lon + 360 * Math.round((center - lon) / 360);
    };

    places.forEach((place) => {
      const lonForView = wrapLonToCenter(place.lon, centerLng);

      const marker = L.marker([place.lat, lonForView], {
        icon: createMarkerIcon(),
      });

      marker.on('click', () => handleMarkerClick(place));
      marker.on('mouseover', (e) => {
        handleMarkerHover(place, e.originalEvent.clientX, e.originalEvent.clientY);
      });
      marker.on('mouseout', handleMarkerHoverEnd);

      markersLayer.addLayer(marker);
    });

    updateVisibleCount();
  }, [places, createMarkerIcon, handleMarkerClick, handleMarkerHover, handleMarkerHoverEnd, updateVisibleCount]);

  // Layer icon helper
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

      {/* Top Status Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
        <div className="flex items-center justify-between">
          {/* Left: Status */}
          <div className="pointer-events-auto">
            {isLoadingPlaces && (
              <div className="bg-card/90 backdrop-blur-md px-4 py-2.5 border-2 border-border shadow-sm flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
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
                  <span className="text-primary font-bold">{visibleCount >= 200 ? '200+' : visibleCount}</span> places visible
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

      {/* Right Side Controls */}
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

        {/* Discovery Button */}
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
            {(Object.keys(DISCOVERY_THEMES) as DiscoveryTheme[]).map((themeKey) => (
              <DropdownMenuItem
                key={themeKey}
                onClick={() => handleDiscoveryClick(themeKey)}
                className="flex items-center gap-3 cursor-pointer"
              >
                {DISCOVERY_THEMES[themeKey].icon}
                <span className="font-medium">{DISCOVERY_THEMES[themeKey].name}</span>
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
            {AVAILABLE_LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-accent cursor-pointer transition-colors ${
                  selectedLanguage === lang ? 'bg-accent font-semibold' : 'text-foreground'
                }`}
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
              bookmarks.map((b) => (
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
                    loading="lazy"
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
          language={selectedLanguage}
        />
      )}
    </div>
  );
};

export default MapView;
