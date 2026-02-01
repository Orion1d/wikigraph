import { useEffect, useState } from 'react';
import MapView from '@/components/MapView';
import OfflineIndicator from '@/components/OfflineIndicator';
import wikiGraphLogo from '@/assets/WikiGraph.png';
const Index = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    document.title = 'WikiGraph - Discover Knowledge Everywhere';
    
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <img 
            src={wikiGraphLogo} 
            alt="WikiGraph Logo" 
            className="w-24 h-24 object-contain animate-pulse"
          />
          <div className="text-center">
            <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">
              Wiki<span className="text-primary">Graph</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 font-sans">Discover knowledge everywhere</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <OfflineIndicator />
      <MapView />
    </div>
  );
};

export default Index;
