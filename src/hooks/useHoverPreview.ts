import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchArticleDetails, WikiPlace, WikiArticle } from '@/lib/wikipedia';
import type { WikiLanguage } from '@/components/SearchPanel';

const MAX_CACHE_SIZE = 50;
const HOVER_DELAY_MS = 300;

export interface HoverState {
  article: WikiArticle | null;
  position: { x: number; y: number } | null;
  isLoading: boolean;
}

export function useHoverPreview(language: WikiLanguage) {
  const [hoveredArticle, setHoveredArticle] = useState<WikiArticle | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [isLoadingHover, setIsLoadingHover] = useState(false);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, WikiArticle>>(new Map());
  const cacheOrderRef = useRef<string[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Clear cache when language changes
  useEffect(() => {
    cacheRef.current.clear();
    cacheOrderRef.current = [];
  }, [language]);

  const getCacheKey = (pageid: number, lang: string) => `${lang}:${pageid}`;

  const addToCache = useCallback((key: string, article: WikiArticle) => {
    // Evict oldest entries if cache is full
    while (cacheOrderRef.current.length >= MAX_CACHE_SIZE) {
      const oldestKey = cacheOrderRef.current.shift();
      if (oldestKey) {
        cacheRef.current.delete(oldestKey);
      }
    }
    cacheRef.current.set(key, article);
    cacheOrderRef.current.push(key);
  }, []);

  const handleMarkerHover = useCallback(
    async (place: WikiPlace, clientX: number, clientY: number) => {
      // Clear any pending operations
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Set position immediately
      setHoverPosition({ x: clientX, y: clientY });

      const cacheKey = getCacheKey(place.pageid, language);

      // Check cache first
      if (cacheRef.current.has(cacheKey)) {
        setHoveredArticle(cacheRef.current.get(cacheKey)!);
        setIsLoadingHover(false);
        return;
      }

      // Delay fetching to avoid excessive API calls
      hoverTimeoutRef.current = setTimeout(async () => {
        setIsLoadingHover(true);

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        try {
          const article = await fetchArticleDetails(place.pageid, language);
          
          // Check if request was aborted
          if (abortControllerRef.current?.signal.aborted) {
            return;
          }

          if (article) {
            addToCache(cacheKey, article);
            setHoveredArticle(article);
          }
        } catch (error) {
          // Ignore abort errors
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          console.error('Error fetching hover preview:', error);
        } finally {
          setIsLoadingHover(false);
        }
      }, HOVER_DELAY_MS);
    },
    [language, addToCache]
  );

  const handleMarkerHoverEnd = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setHoveredArticle(null);
    setHoverPosition(null);
    setIsLoadingHover(false);
  }, []);

  return {
    hoveredArticle,
    hoverPosition,
    isLoadingHover,
    handleMarkerHover,
    handleMarkerHoverEnd,
  };
}
