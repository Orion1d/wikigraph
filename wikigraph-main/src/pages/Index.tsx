import { lazy, Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import OfflineIndicator from '@/components/OfflineIndicator';

const MapView = lazy(() => import('@/components/MapView'));

const SPLASH_LOGO_SRC = '/pwa-192x192.png';

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    document.title = 'WikiGraph - Discover Knowledge Everywhere';

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const prefetchMap = () => {
      if (!cancelled) void import('@/components/MapView');
    };

    if (typeof requestIdleCallback !== 'undefined') {
      idleId = requestIdleCallback(prefetchMap, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(prefetchMap, 400);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  if (showSplash) {
    return (
      <>
        <Helmet>
          <title>WikiGraph | Interactive Wikipedia Map Explorer</title>
          <meta name="description" content="Explore Wikipedia places on an interactive map. Discover landmarks, history, and nearby points of interest in multiple languages." />
          <link rel="canonical" href="https://wikigraph.app/" />
          <meta property="og:title" content="WikiGraph | Interactive Wikipedia Map Explorer" />
          <meta property="og:description" content="Explore Wikipedia places on an interactive map. Discover landmarks, history, and nearby points of interest in multiple languages." />
          <meta property="og:url" content="https://wikigraph.app/" />
          <meta name="twitter:title" content="WikiGraph | Interactive Wikipedia Map Explorer" />
          <meta name="twitter:description" content="Explore Wikipedia places on an interactive map and discover places worth learning about." />
        </Helmet>
        <div className="min-h-[100dvh] h-[100dvh] w-full flex flex-col items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-6 animate-fade-in motion-reduce:animate-none">
            <img
              src={SPLASH_LOGO_SRC}
              alt="WikiGraph Logo"
              className="w-24 h-24 object-contain animate-pulse motion-reduce:animate-none"
            />
            <div className="text-center">
              <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">
                Wiki<span className="text-primary">Graph</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2 font-sans">Discover knowledge everywhere</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>WikiGraph | Interactive Wikipedia Map Explorer</title>
        <meta name="description" content="Explore Wikipedia places on an interactive map. Discover landmarks, history, and nearby points of interest in multiple languages." />
        <link rel="canonical" href="https://wikigraph.app/" />
        <meta property="og:title" content="WikiGraph | Interactive Wikipedia Map Explorer" />
        <meta property="og:description" content="Explore Wikipedia places on an interactive map. Discover landmarks, history, and nearby points of interest in multiple languages." />
        <meta property="og:url" content="https://wikigraph.app/" />
        <meta name="twitter:title" content="WikiGraph | Interactive Wikipedia Map Explorer" />
        <meta name="twitter:description" content="Explore Wikipedia places on an interactive map and discover places worth learning about." />
      </Helmet>
      <div className="flex min-h-[100dvh] h-[100dvh] w-full flex-col overflow-hidden bg-background">
        <OfflineIndicator />
        <Suspense
          fallback={
            <div className="flex flex-1 min-h-0 w-full flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none text-primary" aria-hidden />
              <span className="text-sm font-medium">Loading map…</span>
            </div>
          }
        >
          <MapView />
        </Suspense>
      </div>
    </>
  );
};

export default Index;
