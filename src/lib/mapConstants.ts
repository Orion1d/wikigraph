import L from 'leaflet';
import { Castle, Mountain, Landmark, Church, Trees, Shuffle } from 'lucide-react';
import React from 'react';

export type MapLayer = 'standard' | 'satellite' | 'topo';

export type TileLayerDef = {
  url: string;
  attribution: string;
  name: string;
  options?: L.TileLayerOptions;
};

export const TILE_LAYERS: Record<MapLayer, TileLayerDef> = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    name: 'Standard',
    options: { maxZoom: 19, maxNativeZoom: 19, subdomains: 'abc' },
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    name: 'Satellite',
    options: { maxZoom: 19, maxNativeZoom: 19 },
  },
  topo: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; HOT OSM',
    name: 'Detailed',
    options: { maxZoom: 19, maxNativeZoom: 19, subdomains: 'abc' },
  },
} as const;

export const MIN_SCAN_ZOOM = 11;

export type DiscoveryTheme = 'random' | 'castles' | 'ruins' | 'nature' | 'religious' | 'landmarks';

export interface DiscoveryLocation {
  name: string;
  lat: number;
  lon: number;
}

export interface DiscoveryThemeConfig {
  name: string;
  icon: React.ReactNode;
  locations: DiscoveryLocation[];
}

export const DISCOVERY_THEMES: Record<DiscoveryTheme, DiscoveryThemeConfig> = {
  random: {
    name: 'Random',
    icon: React.createElement(Shuffle, { className: 'w-4 h-4' }),
    locations: [
      { name: 'Rome, Italy', lat: 41.9028, lon: 12.4964 },
      { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
      { name: 'New York, USA', lat: 40.7128, lon: -74.0060 },
      { name: 'Cairo, Egypt', lat: 30.0444, lon: 31.2357 },
      { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093 },
      { name: 'Paris, France', lat: 48.8566, lon: 2.3522 },
      { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
      { name: 'Barcelona, Spain', lat: 41.3851, lon: 2.1734 },
      { name: 'Istanbul, Turkey', lat: 41.0082, lon: 28.9784 },
      { name: 'Kyoto, Japan', lat: 35.0116, lon: 135.7681 },
      { name: 'Prague, Czech Republic', lat: 50.0755, lon: 14.4378 },
      { name: 'Vienna, Austria', lat: 48.2082, lon: 16.3738 },
      { name: 'Amsterdam, Netherlands', lat: 52.3676, lon: 4.9041 },
      { name: 'Berlin, Germany', lat: 52.5200, lon: 13.4050 },
      { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
    ],
  },
  castles: {
    name: 'Castles',
    icon: React.createElement(Castle, { className: 'w-4 h-4' }),
    locations: [
      { name: 'Neuschwanstein Castle, Germany', lat: 47.5576, lon: 10.7498 },
      { name: 'Edinburgh Castle, Scotland', lat: 55.9486, lon: -3.1999 },
      { name: 'Prague Castle, Czech Republic', lat: 50.0909, lon: 14.4010 },
      { name: 'Windsor Castle, UK', lat: 51.4839, lon: -0.6044 },
      { name: 'Château de Chambord, France', lat: 47.6162, lon: 1.5170 },
      { name: 'Alhambra, Spain', lat: 37.1760, lon: -3.5881 },
      { name: 'Bran Castle, Romania', lat: 45.5150, lon: 25.3672 },
      { name: 'Warwick Castle, UK', lat: 52.2795, lon: -1.5849 },
      { name: 'Hohenzollern Castle, Germany', lat: 48.3232, lon: 8.9673 },
      { name: 'Château de Versailles, France', lat: 48.8049, lon: 2.1204 },
    ],
  },
  ruins: {
    name: 'Ancient Ruins',
    icon: React.createElement(Landmark, { className: 'w-4 h-4' }),
    locations: [
      { name: 'Machu Picchu, Peru', lat: -13.1631, lon: -72.5450 },
      { name: 'Colosseum, Rome', lat: 41.8902, lon: 12.4922 },
      { name: 'Petra, Jordan', lat: 30.3285, lon: 35.4444 },
      { name: 'Angkor Wat, Cambodia', lat: 13.4125, lon: 103.8670 },
      { name: 'Chichen Itza, Mexico', lat: 20.6843, lon: -88.5678 },
      { name: 'Acropolis, Athens', lat: 37.9715, lon: 23.7257 },
      { name: 'Pompeii, Italy', lat: 40.7462, lon: 14.4989 },
      { name: 'Ephesus, Turkey', lat: 37.9490, lon: 27.3680 },
      { name: 'Great Wall, China', lat: 40.4319, lon: 116.5704 },
      { name: 'Teotihuacan, Mexico', lat: 19.6925, lon: -98.8438 },
    ],
  },
  nature: {
    name: 'Nature Wonders',
    icon: React.createElement(Mountain, { className: 'w-4 h-4' }),
    locations: [
      { name: 'Grand Canyon, USA', lat: 36.1069, lon: -112.1129 },
      { name: 'Victoria Falls, Zimbabwe', lat: -17.9243, lon: 25.8572 },
      { name: 'Niagara Falls, Canada', lat: 43.0962, lon: -79.0377 },
      { name: 'Yosemite, USA', lat: 37.8651, lon: -119.5383 },
      { name: 'Galápagos Islands, Ecuador', lat: -0.9538, lon: -90.9656 },
      { name: 'Ha Long Bay, Vietnam', lat: 20.9101, lon: 107.1839 },
      { name: 'Plitvice Lakes, Croatia', lat: 44.8654, lon: 15.5820 },
      { name: 'Yellowstone, USA', lat: 44.4280, lon: -110.5885 },
      { name: 'Swiss Alps, Switzerland', lat: 46.5197, lon: 7.9596 },
      { name: 'Zhangjiajie, China', lat: 29.3177, lon: 110.4343 },
    ],
  },
  religious: {
    name: 'Sacred Sites',
    icon: React.createElement(Church, { className: 'w-4 h-4' }),
    locations: [
      { name: 'Vatican City', lat: 41.9029, lon: 12.4534 },
      { name: 'Notre-Dame, Paris', lat: 48.8530, lon: 2.3499 },
      { name: 'Hagia Sophia, Istanbul', lat: 41.0086, lon: 28.9802 },
      { name: 'Sagrada Familia, Barcelona', lat: 41.4036, lon: 2.1744 },
      { name: 'Blue Mosque, Istanbul', lat: 41.0054, lon: 28.9768 },
      { name: 'Golden Temple, India', lat: 31.6200, lon: 74.8765 },
      { name: 'Wat Phra Kaew, Bangkok', lat: 13.7516, lon: 100.4927 },
      { name: "St. Peter's Basilica, Vatican", lat: 41.9022, lon: 12.4539 },
      { name: 'Sensoji Temple, Tokyo', lat: 35.7148, lon: 139.7967 },
      { name: 'Westminster Abbey, London', lat: 51.4994, lon: -0.1273 },
    ],
  },
  landmarks: {
    name: 'Famous Landmarks',
    icon: React.createElement(Trees, { className: 'w-4 h-4' }),
    locations: [
      { name: 'Eiffel Tower, Paris', lat: 48.8584, lon: 2.2945 },
      { name: 'Statue of Liberty, USA', lat: 40.6892, lon: -74.0445 },
      { name: 'Big Ben, London', lat: 51.5007, lon: -0.1246 },
      { name: 'Sydney Opera House', lat: -33.8568, lon: 151.2153 },
      { name: 'Taj Mahal, India', lat: 27.1751, lon: 78.0421 },
      { name: 'Christ the Redeemer, Brazil', lat: -22.9519, lon: -43.2105 },
      { name: 'Burj Khalifa, Dubai', lat: 25.1972, lon: 55.2744 },
      { name: 'Tower Bridge, London', lat: 51.5055, lon: -0.0754 },
      { name: 'Golden Gate Bridge, USA', lat: 37.8199, lon: -122.4783 },
      { name: 'Leaning Tower of Pisa, Italy', lat: 43.7230, lon: 10.3966 },
    ],
  },
} as const;

export const AVAILABLE_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ar', 'ko', 'nl', 'pl', 'sv', 'tr'] as const;
