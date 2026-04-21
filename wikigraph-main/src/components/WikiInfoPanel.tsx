import { useRef } from 'react';
import { X, ExternalLink, MapPin, BookOpen, AlertCircle } from 'lucide-react';
import { WikiArticle } from '@/lib/wikipedia';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface WikiInfoPanelProps {
  article: WikiArticle | null;
  isLoading: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  onClose: () => void;
}

const WikiInfoPanel = ({ article, isLoading, loadError, onRetry, onClose }: WikiInfoPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const active = isLoading || !!article || !!loadError;

  useFocusTrap(active, panelRef);
  useEscapeKey(active, onClose);

  if (!isLoading && !article && !loadError) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wiki-panel-title"
      className="absolute inset-y-0 right-0 w-full sm:w-[400px] md:w-[440px] bg-card/95 backdrop-blur-xl border-l-2 border-border shadow-2xl z-[1001] flex flex-col pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="flex items-center justify-between p-4 border-b-2 border-border bg-card shrink-0 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 min-h-[44px] min-w-[44px] bg-primary flex items-center justify-center shrink-0" aria-hidden>
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-mono text-muted-foreground uppercase tracking-wider">Wikipedia</span>
            <span id="wiki-panel-title" className="block font-semibold text-card-foreground truncate">
              {isLoading ? 'Loading...' : loadError ? 'Could not load' : 'Place Details'}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-11 w-11 min-h-[44px] min-w-[44px] border-2 border-border hover:bg-accent shrink-0"
          aria-label="Close article panel"
        >
          <X className="w-5 h-5" aria-hidden />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div
              className="w-16 h-16 border-4 border-border border-t-primary motion-reduce:animate-none animate-spin"
              style={{ borderRadius: '0' }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Fetching article...</span>
        </div>
      ) : loadError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-destructive" aria-hidden />
          <p className="text-sm text-muted-foreground leading-relaxed">{loadError}</p>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry} className="border-2 border-border min-h-[44px]">
              Try again
            </Button>
          )}
        </div>
      ) : article ? (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-5">
            {article.thumbnail && (
              <div className="relative overflow-hidden border-2 border-border">
                <img src={article.thumbnail.source} alt={article.title} className="w-full h-52 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              </div>
            )}

            <h2 className="font-serif text-2xl font-bold text-card-foreground leading-tight tracking-tight">
              {article.title}
            </h2>

            {article.coordinates && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted border border-border text-xs font-mono text-muted-foreground">
                <MapPin className="w-3 h-3" aria-hidden />
                <span>
                  {article.coordinates.lat.toFixed(4)}° / {article.coordinates.lon.toFixed(4)}°
                </span>
              </div>
            )}
            <p className="text-card-foreground/85 leading-relaxed text-[15px]">{article.extract}</p>

            <a
              href={article.fullurl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-5 py-3 min-h-[44px] bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 transition-all font-semibold shadow-sm"
            >
              Read full article
              <ExternalLink
                className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
                aria-hidden
              />
            </a>
          </div>
        </ScrollArea>
      ) : null}

      <div className="p-3 border-t-2 border-border bg-muted/50 shrink-0">
        <p className="text-xs font-mono text-muted-foreground text-center tracking-wide">CC BY-SA 3.0 • WIKIPEDIA</p>
      </div>
    </div>
  );
};

export default WikiInfoPanel;
