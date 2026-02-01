import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { WikiPlace } from '@/lib/wikipedia';

export interface BookmarkedPlace {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  savedAt: number;
}

const STORAGE_KEY = 'wiki-bookmarks';
const MAX_BOOKMARKS = 100;

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkedPlace[]>([]);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate and limit bookmarks
        if (Array.isArray(parsed)) {
          setBookmarks(parsed.slice(0, MAX_BOOKMARKS));
        }
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  }, []);

  const saveToStorage = useCallback((updated: BookmarkedPlace[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
      toast.error('Failed to save bookmark');
    }
  }, []);

  const toggleBookmark = useCallback((place: WikiPlace) => {
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.pageid === place.pageid);
      let updated: BookmarkedPlace[];

      if (exists) {
        updated = prev.filter((b) => b.pageid !== place.pageid);
        toast.success('Bookmark removed');
      } else {
        if (prev.length >= MAX_BOOKMARKS) {
          toast.error(`Maximum ${MAX_BOOKMARKS} bookmarks allowed`);
          return prev;
        }
        updated = [
          ...prev,
          {
            pageid: place.pageid,
            title: place.title,
            lat: place.lat,
            lon: place.lon,
            savedAt: Date.now(),
          },
        ];
        toast.success('Bookmark added');
      }

      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const isBookmarked = useCallback(
    (pageid: number) => bookmarks.some((b) => b.pageid === pageid),
    [bookmarks]
  );

  const removeBookmark = useCallback((pageid: number) => {
    setBookmarks((prev) => {
      const updated = prev.filter((b) => b.pageid !== pageid);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  return {
    bookmarks,
    toggleBookmark,
    isBookmarked,
    removeBookmark,
  };
}
