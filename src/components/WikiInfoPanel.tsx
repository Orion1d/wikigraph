import { X, ExternalLink, MapPin, Loader2, BookOpen } from 'lucide-react';
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
    <div className="absolute inset-y-0 right-0 w-full sm:w-[400px] md:w-[440px] bg-card/95 backdrop-blur-xl border-l-2 border-border shadow-2xl z-[1001] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="block text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Wikipedia
            </span>
            <span className="block font-semibold text-card-foreground">
              {isLoading ? 'Loading...' : 'Place Details'}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 border-2 border-border hover:bg-accent"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-border border-t-primary animate-spin" style={{ borderRadius: '0' }} />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Fetching article...</span>
        </div>
      ) : article ? (
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {/* Thumbnail */}
            {article.thumbnail && (
              <div className="relative overflow-hidden border-2 border-border">
                <img
                  src={article.thumbnail.source}
                  alt={article.title}
                  className="w-full h-52 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              </div>
            )}

            {/* Title */}
            <h2 className="font-serif text-2xl font-bold text-card-foreground leading-tight tracking-tight">
              {article.title}
            </h2>

            {/* Coordinates Badge */}
            {article.coordinates && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted border border-border text-xs font-mono text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>
                  {article.coordinates.lat.toFixed(4)}° / {article.coordinates.lon.toFixed(4)}°
                </span>
              </div>
            )}

            {/* Extract */}
            <p className="text-card-foreground/85 leading-relaxed text-[15px]">
              {article.extract}
            </p>

            {/* Read More Button */}
            <a
              href={article.fullurl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-5 py-3 bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 transition-all font-semibold shadow-sm"
            >
              Read full article
              <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </ScrollArea>
      ) : null}

      {/* Footer */}
      <div className="p-3 border-t-2 border-border bg-muted/50">
        <p className="text-xs font-mono text-muted-foreground text-center tracking-wide">
          CC BY-SA 3.0 • WIKIPEDIA
        </p>
      </div>
    </div>
  );
};

export default WikiInfoPanel;
