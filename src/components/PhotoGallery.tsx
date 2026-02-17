import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Images, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchArticleImages, WikiImage } from '@/lib/wikipedia';

interface PhotoGalleryProps {
  pageid: number;
  language: string;
  isOpen: boolean;
  onClose: () => void;
}

const PhotoGallery = ({ pageid, language, isOpen, onClose }: PhotoGalleryProps) => {
  const [images, setImages] = useState<WikiImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setImages([]);
    setSelectedIndex(null);

    fetchArticleImages(pageid, language)
      .then(setImages)
      .finally(() => setIsLoading(false));
  }, [pageid, language, isOpen]);

  if (!isOpen) return null;

  const handlePrev = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : images.length - 1);
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex < images.length - 1 ? selectedIndex + 1 : 0);
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Images className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-card-foreground">Photos</span>
          {!isLoading && images.length > 0 && (
            <span className="text-xs text-muted-foreground">({images.length})</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading photos...</span>
          </div>
        ) : images.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No photos available</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                className="relative aspect-square overflow-hidden border border-border hover:border-primary transition-colors cursor-pointer group"
              >
                <img
                  src={img.thumbUrl}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && images[selectedIndex] && (
        <div
          className="fixed inset-0 z-[3000] bg-background/95 backdrop-blur-md flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onClose(); setSelectedIndex(null); }}
            className="absolute top-4 right-4 h-10 w-10 border-2 border-border bg-card/80 hover:bg-card z-10"
          >
            <X className="w-5 h-5" />
          </Button>

          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-4 h-10 w-10 border-2 border-border bg-card/80 hover:bg-card z-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-4 h-10 w-10 border-2 border-border bg-card/80 hover:bg-card z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}

          <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[selectedIndex].url}
              alt={images[selectedIndex].title}
              className="max-w-full max-h-[75vh] object-contain border-2 border-border"
            />
            <div className="text-center">
              <p className="text-sm text-card-foreground font-medium line-clamp-1">
                {images[selectedIndex].title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedIndex + 1} / {images.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGallery;
