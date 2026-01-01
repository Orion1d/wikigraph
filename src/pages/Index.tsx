import { useEffect, useState } from 'react';
import MapView from '@/components/MapView';
import { Globe } from 'lucide-react';

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
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
            <Globe className="w-10 h-10 text-primary-foreground animate-pulse" />
          </div>
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-foreground tracking-tight">
              Wiki<span className="text-primary">Graph</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2">Discover knowledge everywhere</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <MapView />
    </div>
  );
};

export default Index;
