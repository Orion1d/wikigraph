import { useState } from 'react';
import { Search, X, Globe, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export type WikiLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ja' | 'zh' | 'ar' | 'ko' | 'nl' | 'pl' | 'sv' | 'tr';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string, coords?: { lat: number; lon: number }) => void;
  selectedLanguage: WikiLanguage;
  onLanguageChange: (language: WikiLanguage) => void;
}

const LANGUAGES: { code: WikiLanguage; name: string; native: string }[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'sv', name: 'Swedish', native: 'Svenska' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
];

const SearchPanel = ({
  isOpen,
  onClose,
  onSearch,
  selectedLanguage,
  onLanguageChange,
}: SearchPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    // Check if query is coordinates (e.g., "48.8566, 2.3522" or "48.8566 2.3522")
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

  const currentLang = LANGUAGES.find(l => l.code === selectedLanguage) || LANGUAGES[0];

  if (!isOpen) return null;

  return (
    <div className="absolute inset-y-0 left-0 w-full sm:w-[360px] bg-card/95 backdrop-blur-xl border-r-2 border-border shadow-2xl z-[1001] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center">
            <Search className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-card-foreground">Search & Filters</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 border-2 border-border hover:bg-accent"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search place or enter coordinates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-10 bg-background border-2"
            />
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <Button onClick={handleSearch} className="px-4">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Search by name or enter coordinates (lat, lon)
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Language Section */}
        <Collapsible open={isLanguageOpen} onOpenChange={setIsLanguageOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors border-b border-border">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-card-foreground">Language</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {currentLang.native}
                </span>
                {isLanguageOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 space-y-1 bg-muted/30 max-h-[300px] overflow-auto">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onLanguageChange(lang.code)}
                  className={`w-full flex items-center justify-between p-3 transition-colors text-left ${
                    selectedLanguage === lang.code
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-card-foreground'
                  }`}
                >
                  <span className="font-medium">{lang.name}</span>
                  <span className={`text-sm ${selectedLanguage === lang.code ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {lang.native}
                  </span>
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t-2 border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Wikipedia content in <span className="font-semibold">{currentLang.name}</span>
        </p>
      </div>
    </div>
  );
};

export default SearchPanel;
