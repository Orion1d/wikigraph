import { Helmet } from 'react-helmet-async';
import MapView from '@/components/MapView';
import { Globe, Info } from 'lucide-react';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>WikiMap - Explore Places with Wikipedia</title>
        <meta name="description" content="Discover interesting places around the world with WikiMap. Explore interactive maps and learn about locations through Wikipedia articles." />
      </Helmet>
      
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-card-foreground">WikiMap</h1>
              <p className="text-xs text-muted-foreground">Explore places • Learn history</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Click markers to learn more</span>
          </div>
        </header>

        {/* Map */}
        <main className="flex-1 relative">
          <MapView />
        </main>
      </div>
    </>
  );
};

export default Index;
