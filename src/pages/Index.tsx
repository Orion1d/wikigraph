import { useEffect } from 'react';
import MapView from '@/components/MapView';
import { Globe, Info } from 'lucide-react';

const Index = () => {
  useEffect(() => {
    document.title = 'WikiGraph - Discover Knowledge Everywhere';
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
            <Globe className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-card-foreground tracking-tight">
              Wiki<span className="text-primary">Graph</span>
            </h1>
            <p className="text-xs text-muted-foreground">Discover knowledge everywhere</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4" />
          <span className="hidden sm:inline">Click markers to explore</span>
        </div>
      </header>

      {/* Map */}
      <main className="flex-1 relative">
        <MapView />
      </main>
    </div>
  );
};

export default Index;
