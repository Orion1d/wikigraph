import { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useEscapeKey } from '@/hooks/useEscapeKey';

export type WikiLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ja' | 'zh' | 'ar' | 'ko' | 'nl' | 'pl' | 'sv' | 'tr';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string, coords?: { lat: number; lon: number }) => void;
}

const SearchPanel = ({ isOpen, onClose, onSearch }: SearchPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useFocusTrap(isOpen, panelRef);
  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    const coordPattern = /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/;
    const match = searchQuery.trim().match(coordPattern);

    if (match) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        onSearch(searchQuery, { lat, lon });
        return;
      }
    }

    onSearch(searchQuery.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-panel-title"
      className="absolute inset-y-0 left-0 w-full sm:w-[360px] bg-card/95 backdrop-blur-xl border-r-2 border-border shadow-2xl z-[1001] flex flex-col pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="flex items-center justify-between p-4 border-b-2 border-border bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 min-h-[44px] min-w-[44px] bg-primary flex items-center justify-center shrink-0" aria-hidden>
            <Search className="w-5 h-5 text-primary-foreground" />
          </div>
          <span id="search-panel-title" className="font-semibold text-card-foreground truncate">
            Search
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-11 w-11 min-h-[44px] min-w-[44px] border-2 border-border hover:bg-accent shrink-0"
          aria-label="Close search"
        >
          <X className="w-4 h-4" aria-hidden />
        </Button>
      </div>

      <div className="p-4 flex-1 min-h-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search place or enter coordinates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-10 bg-background border-2 min-h-[44px]"
              aria-label="Search by place name or coordinates"
            />
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden />
          </div>
          <Button
            type="button"
            onClick={handleSearch}
            className="px-4 min-h-[44px] min-w-[44px]"
            aria-label="Run search"
          >
            <Search className="w-4 h-4" aria-hidden />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Search by name or enter coordinates (lat, lon)</p>
      </div>
    </div>
  );
};

export default SearchPanel;
