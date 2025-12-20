import { X, ExternalLink, MapPin, Loader2 } from 'lucide-react';
import { WikiArticle } from '@/lib/wikipedia';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WikiInfoPanelProps {
  article: WikiArticle | null;
  isLoading: boolean;
  onClose: () => void;
}

const WikiInfoPanel = ({ article, isLoading, onClose }: WikiInfoPanelProps) => {
  if (!article && !isLoading) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-full sm:w-[380px] md:w-[420px] bg-card border-l border-border shadow-xl z-[1000] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <span className="font-serif text-lg font-semibold text-card-foreground">
            {isLoading ? 'Loading...' : 'Place Details'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-muted/50"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : article ? (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Thumbnail */}
            {article.thumbnail && (
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src={article.thumbnail.source}
                  alt={article.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              </div>
            )}

            {/* Title */}
            <h2 className="font-serif text-2xl font-bold text-card-foreground leading-tight">
              {article.title}
            </h2>

            {/* Coordinates */}
            {article.coordinates && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>
                  {article.coordinates.lat.toFixed(4)}°, {article.coordinates.lon.toFixed(4)}°
                </span>
              </div>
            )}

            {/* Extract */}
            <p className="text-card-foreground/80 leading-relaxed">
              {article.extract}
            </p>

            {/* Read More Button */}
            <a
              href={article.fullurl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Read on Wikipedia
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </ScrollArea>
      ) : null}

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Content from Wikipedia • CC BY-SA 3.0
        </p>
      </div>
    </div>
  );
};

export default WikiInfoPanel;
