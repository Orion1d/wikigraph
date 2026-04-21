import { useEffect, useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { toast } from 'sonner';
import { fetchArticleDetails, searchPlaceByName, WikiPlace, WikiArticle, MAX_VISIBLE_PLACES } from '@/lib/wikipedia';
import { parseMapUrl, replaceMapUrl, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/mapUrlState';
import WikiInfoPanel from './WikiInfoPanel';
import SearchPanel, { WikiLanguage } from './SearchPanel';
import { Loader2, Layers, Navigation, Satellite, ZoomIn, ZoomOut, Menu, Moon, Sun, Search, Globe, ChevronRight, ArrowLeft, Compass, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useHoverPreview } from '@/hooks/useHoverPreview';
import { useMapPlaces } from '@/hooks/useMapPlaces';
import { useDiscovery } from '@/hooks/useDiscovery';
import {
  TILE_LAYERS,
  DISCOVERY_THEMES,
  AVAILABLE_LANGUAGES,
  type MapLayer,
  type DiscoveryTheme,
} from '@/lib/mapConstants';

const getBrowserWikiLanguage = (): WikiLanguage => {
  const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
  return (AVAILABLE_LANGUAGES as readonly string[]).includes(browserLang)
    ? (browserLang as WikiLanguage)
    : 'en';
};

const MapView = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const allowUrlSyncRef = useRef(false);
  const deepLinkRetryRef = useRef<{ pageid: number; lang: WikiLanguage } | null>(null);

  const { theme, setTheme } = useTheme();

  const [selectedPlace, setSelectedPlace] = useState<WikiPlace | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [articleLoadError, setArticleLoadError] = useState<string | null>(null);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<MapLayer>('standard');
  const [isLocating, setIsLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState<WikiLanguage>(() => {
    const fromUrl = parseMapUrl();
    if (fromUrl?.lang) return fromUrl.lang;
    return getBrowserWikiLanguage();
  });

  const [showSearch, setShowSearch] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showDiscoveryMenu, setShowDiscoveryMenu] = useState(false);

  const {
    hoveredArticle,
    hoverPosition,
    isLoadingHover,
    handleMarkerHover,
    handleMarkerHoverEnd,
  } = useHoverPreview(selectedLanguage);
  const {
    places,
    isLoadingPlaces,
    isScanDisabled,
    visibleCount,
    fetchPlacesForBounds,
    triggerImmediateFetch,
    updateVisibleCount,
  } = useMapPlaces(mapRef, markersLayerRef, selectedLanguage);
  const { handleThemedDiscover } = useDiscovery(mapRef);

  const articleAbortRef = useRef<AbortController | null>(null);

  const openArticleFromDeepLink = useCallback(async (pageid: number, lang: WikiLanguage, mapInstance: L.Map) => {
    deepLinkRetryRef.current = { pageid, lang };
    setIsPanelOpen(true);
    setIsLoadingArticle(true);
    setArticleLoadError(null);
    setSelectedArticle(null);
    setSelectedPlace(null);

    const result = await fetchArticleDetails(pageid, lang);
    setIsLoadingArticle(false);

    if (!result.ok) {
      setArticleLoadError(result.error);
      toast.error(result.error, {
        id: 'wiki-article-deeplink',
        action: {
          label: 'Retry',
          onClick: () => void openArticleFromDeepLink(pageid, lang, mapInstance),
        },
      });
      return;
    }

    if (!result.data) {
      const msg = 'Article not found or is not available in this Wikipedia.';
      setArticleLoadError(msg);
      toast.error(msg);
      return;
    }

    deepLinkRetryRef.current = null;
    const article = result.data;
    if (article.coordinates) {
      mapInstance.setView([article.coordinates.lat, article.coordinates.lon], Math.max(mapInstance.getZoom(), 14), {
        animate: false,
      });
    }

    setSelectedPlace({
      pageid: article.pageid,
      title: article.title,
      lat: article.coordinates?.lat ?? mapInstance.getCenter().lat,
      lon: article.coordinates?.lon ?? mapInstance.getCenter().lng,
    });
    setSelectedArticle(article);

    const c = mapInstance.getCenter();
    replaceMapUrl({
      lat: c.lat,
      lng: c.lng,
      zoom: mapInstance.getZoom(),
      lang,
      pageid: article.pageid,
    });
  }, []);

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

  const handleMarkerClick = useCallback(
    async (place: WikiPlace) => {
      if (articleAbortRef.current) {
        articleAbortRef.current.abort();
      }
      articleAbortRef.current = new AbortController();

      setSelectedPlace(place);
      setIsPanelOpen(true);
      setIsLoadingArticle(true);
      setArticleLoadError(null);

      const map = mapRef.current;
      if (map) {
        const mapSize = map.getSize();
        const offsetX = mapSize.x * 0.25;
        const targetPoint = map.latLngToContainerPoint([place.lat, place.lon]);
        const centeredPoint = L.point(targetPoint.x + offsetX, targetPoint.y);
        const newCenter = map.containerPointToLatLng(centeredPoint);
        map.panTo(newCenter, { animate: true, duration: 0.5 });
      }
      setSelectedArticle(null);

      try {
        const result = await fetchArticleDetails(place.pageid, selectedLanguage);
        if (articleAbortRef.current?.signal.aborted) {
          return;
        }
        if (!result.ok) {
          setArticleLoadError(result.error);
          setSelectedArticle(null);
          toast.error(result.error, {
            id: 'wiki-article-marker',
            action: {
              label: 'Retry',
              onClick: () => void handleMarkerClick(place),
            },
          });
          return;
        }
        if (!result.data) {
          const msg = 'Article not found or has no summary.';
          setArticleLoadError(msg);
          setSelectedArticle(null);
          toast.error(msg);
          return;
        }
        deepLinkRetryRef.current = null;
        setSelectedArticle(result.data);
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) {
          console.error('Error fetching article:', error);
          const msg = 'Something went wrong loading this article.';
          setArticleLoadError(msg);
          toast.error(msg);
        }
      } finally {
        if (!articleAbortRef.current?.signal.aborted) {
          setIsLoadingArticle(false);
        }
      }
    },
    [selectedLanguage]
  );

  const handleSearch = useCallback(
    async (query: string, coords?: { lat: number; lon: number }) => {
      const map = mapRef.current;
      if (!map) return;

      if (coords) {
        map.flyTo([coords.lat, coords.lon], 14, { duration: 2 });
        toast.success(`Flying to ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`);
        setShowSearch(false);
        return;
      }

      const result = await searchPlaceByName(query, selectedLanguage);
      if (!result.ok) {
        toast.error(result.error, {
          id: 'wiki-search-error',
          action: {
            label: 'Retry',
            onClick: () => void handleSearch(query),
          },
        });
        return;
      }
      if (!result.data) {
        toast.error('Place not found. Try a different search.');
        return;
      }
      map.flyTo([result.data.lat, result.data.lon], 14, { duration: 2 });
      toast.success(`Found: ${result.data.title}`);
      setShowSearch(false);
    },
    [selectedLanguage]
  );

  const handleClosePanel = useCallback(() => {
    if (articleAbortRef.current) {
      articleAbortRef.current.abort();
    }
    deepLinkRetryRef.current = null;
    setIsPanelOpen(false);
    setSelectedPlace(null);
    setSelectedArticle(null);
    setArticleLoadError(null);

    const map = mapRef.current;
    if (map && allowUrlSyncRef.current) {
      const c = map.getCenter();
      replaceMapUrl({
        lat: c.lat,
        lng: c.lng,
        zoom: map.getZoom(),
        lang: selectedLanguage,
      });
    }
  }, [selectedLanguage]);

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

  const handleLocateUser = useCallback(() => {
    if (!mapRef.current) return;
    setIsLocating(true);
    mapRef.current.locate({ setView: true, maxZoom: 16 });
  }, []);

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  const handleDiscoveryClick = useCallback(
    (theme: DiscoveryTheme) => {
      if (handleThemedDiscover(theme)) {
        setShowDiscoveryMenu(false);
      }
    },
    [handleThemedDiscover]
  );

  const handleLanguageChange = useCallback(
    (lang: WikiLanguage) => {
      setSelectedLanguage(lang);
      setShowLanguageMenu(false);
      setTimeout(() => triggerImmediateFetch(), 100);
    },
    [triggerImmediateFetch]
  );

  // Map instance is created once; do not depend on selectedLanguage or the map will reset on every language change.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const fromUrl = parseMapUrl();
    const center: L.LatLngTuple = fromUrl
      ? [fromUrl.lat, fromUrl.lng]
      : [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng];
    const zoom = fromUrl?.zoom ?? DEFAULT_MAP_ZOOM;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
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

    map.on('moveend', () => {
      fetchPlacesForBounds();
      updateVisibleCount();
    });

    map.on('zoomend', () => {
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
    setMapReady(true);

    const deepLinkLang = fromUrl?.lang ?? selectedLanguage;

    queueMicrotask(async () => {
      try {
        if (fromUrl?.pageid) {
          await openArticleFromDeepLink(fromUrl.pageid, deepLinkLang, map);
        }
      } finally {
        allowUrlSyncRef.current = true;
      }
    });

    return () => {
      allowUrlSyncRef.current = false;
      setMapReady(false);
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
    // Intentionally omit selectedLanguage: recreating the map on language change would reset the viewport.
  }, [fetchPlacesForBounds, updateVisibleCount, triggerImmediateFetch, openArticleFromDeepLink]); // eslint-disable-line react-hooks/exhaustive-deps -- see comment

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleSync = () => {
      if (!allowUrlSyncRef.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const c = map.getCenter();
        replaceMapUrl({
          lat: c.lat,
          lng: c.lng,
          zoom: map.getZoom(),
          lang: selectedLanguage,
          pageid: selectedPlace?.pageid,
        });
      }, 480);
    };

    map.on('moveend', scheduleSync);
    map.on('zoomend', scheduleSync);
    scheduleSync();

    return () => {
      if (timer) clearTimeout(timer);
      map.off('moveend', scheduleSync);
      map.off('zoomend', scheduleSync);
    };
  }, [mapReady, selectedLanguage, selectedPlace?.pageid]);

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

  const closeSearchPanel = useCallback(() => setShowSearch(false), []);

  const retryArticlePanel = useCallback(() => {
    if (selectedPlace) {
      void handleMarkerClick(selectedPlace);
      return;
    }
    const map = mapRef.current;
    const pending = deepLinkRetryRef.current;
    if (map && pending) {
      void openArticleFromDeepLink(pending.pageid, pending.lang, map);
    }
  }, [selectedPlace, handleMarkerClick, openArticleFromDeepLink]);

  const getLayerIcon = (layer: MapLayer) => {
    switch (layer) {
      case 'satellite':
        return <Satellite className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-background">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      <div className="absolute top-[max(1rem,env(safe-area-inset-top,0px))] left-[max(1rem,env(safe-area-inset-left,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[1000] pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="pointer-events-auto">
            {isLoadingPlaces && (
              <div className="bg-card/90 backdrop-blur-md px-4 py-2.5 border-2 border-border shadow-sm flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-primary" aria-hidden />
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
              <div className="bg-card/90 backdrop-blur-md px-4 py-2.5 border-2 border-border shadow-sm flex items-center gap-3 max-[500px]:max-w-[min(100%,calc(100vw-8rem))]">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse motion-reduce:animate-none shrink-0" aria-hidden />
                <span className="text-sm font-medium text-card-foreground">
                  <span className="text-primary font-bold">
                    {visibleCount >= MAX_VISIBLE_PLACES ? `${MAX_VISIBLE_PLACES}+` : visibleCount}
                  </span>{' '}
                  places visible
                </span>
              </div>
            )}
          </div>

          <div className="pointer-events-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-card/90 backdrop-blur-md border-2 border-border shadow-sm hover:bg-card gap-2 h-11 min-h-[44px] px-3"
                  aria-label={`Map layer, current: ${TILE_LAYERS[currentLayer].name}`}
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

      <div className="absolute bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[1000] flex flex-col gap-2">
        <div className="bg-card/90 backdrop-blur-md border-2 border-border shadow-sm flex flex-col overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-none border-b border-border hover:bg-accent"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-none hover:bg-accent"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" aria-hidden />
          </Button>
        </div>

        <Button
          variant="secondary"
          size="icon"
          className="h-11 w-11 min-h-[44px] min-w-[44px] bg-card/90 backdrop-blur-md border-2 border-border shadow-sm hover:bg-card"
          onClick={handleLocateUser}
          disabled={isLocating}
          aria-label="Center map on your location"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <Navigation className="w-4 h-4" aria-hidden />
          )}
        </Button>

        <DropdownMenu open={showDiscoveryMenu} onOpenChange={setShowDiscoveryMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-11 w-11 min-h-[44px] min-w-[44px] bg-primary backdrop-blur-md border-2 border-border shadow-sm hover:bg-primary/90"
              aria-label="Discover places"
            >
              <Compass className="w-4 h-4 text-primary-foreground" aria-hidden />
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

      <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-[max(1rem,env(safe-area-inset-left,0px))] z-[1000]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-11 w-11 min-h-[44px] min-w-[44px] bg-card/90 backdrop-blur-md border-2 border-border shadow-sm hover:bg-card"
              aria-label="Main menu"
            >
              <Menu className="w-4 h-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="z-[2000] bg-card border border-border shadow-md min-w-[160px]">
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
            <DropdownMenuItem asChild className="flex items-center gap-3 cursor-pointer text-foreground">
              <Link to="/about">
                <Info className="w-4 h-4" />
                <span className="font-medium">About</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showLanguageMenu && (
        <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-[max(1rem,env(safe-area-inset-left,0px))] z-[1001] bg-card/95 backdrop-blur-md border border-border shadow-lg w-[140px] rounded-md overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLanguageMenu(false)}
              className="h-11 w-11 min-h-[44px] min-w-[44px] hover:bg-accent shrink-0"
              aria-label="Back to main menu"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
            </Button>
            <span className="font-medium text-xs text-foreground">Language</span>
          </div>
          <div className="max-h-[220px] overflow-auto">
            {AVAILABLE_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => handleLanguageChange(lang)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent cursor-pointer transition-colors ${
                  selectedLanguage === lang ? 'bg-accent font-semibold' : 'text-foreground'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

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
                <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-primary" aria-hidden />
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
                  <h4 className="font-semibold text-card-foreground text-sm line-clamp-1">{hoveredArticle.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{hoveredArticle.extract}</p>
                  <p className="text-[10px] text-primary mt-2 font-medium">Click for details →</p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      <SearchPanel isOpen={showSearch} onClose={closeSearchPanel} onSearch={handleSearch} />

      {isPanelOpen && (
        <WikiInfoPanel
          article={selectedArticle}
          isLoading={isLoadingArticle}
          loadError={articleLoadError}
          onRetry={articleLoadError ? retryArticlePanel : undefined}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
};

export default MapView;
