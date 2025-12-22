export interface WikiPlace {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist?: number;
}

export interface WikiArticle {
  pageid: number;
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  coordinates?: {
    lat: number;
    lon: number;
  };
  fullurl: string;
}

export async function fetchNearbyPlaces(
  lat: number,
  lon: number,
  radius: number = 10000
): Promise<WikiPlace[]> {
  const safeRadius = Math.floor(Math.min(Math.max(radius, 10), 10000));

  // Leaflet can return longitudes outside [-180, 180] when panning across the dateline.
  // Wikipedia expects valid coordinates, so normalize/clamp before requesting.
  const safeLat = Math.min(90, Math.max(-90, lat));
  const safeLon = ((((lon + 180) % 360) + 360) % 360) - 180;

  const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${safeLat}|${safeLon}&gsradius=${safeRadius}&gslimit=50&format=json&origin=*`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.query?.geosearch || [];
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return [];
  }
}

export async function fetchArticleDetails(pageid: number): Promise<WikiArticle | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageid}&prop=extracts|pageimages|coordinates|info&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=400&inprop=url&format=json&origin=*`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    const page = data.query?.pages?.[pageid];
    
    if (!page) return null;
    
    return {
      pageid: page.pageid,
      title: page.title,
      extract: page.extract || 'No description available.',
      thumbnail: page.thumbnail,
      coordinates: page.coordinates?.[0],
      fullurl: page.fullurl,
    };
  } catch (error) {
    console.error('Error fetching article details:', error);
    return null;
  }
}
