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

export interface WikiImage {
  title: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
}

export async function fetchNearbyPlaces(
  lat: number,
  lon: number,
  radius: number = 10000,
  language: string = 'en'
): Promise<WikiPlace[]> {
  const safeRadius = Math.floor(Math.min(Math.max(radius, 10), 10000));

  const safeLat = Math.min(90, Math.max(-90, lat));
  const safeLon = ((((lon + 180) % 360) + 360) % 360) - 180;

  const url = `https://${language}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${safeLat}|${safeLon}&gsradius=${safeRadius}&gslimit=200&format=json&origin=*`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.query?.geosearch || [];
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return [];
  }
}

export async function fetchArticleDetails(pageid: number, language: string = 'en'): Promise<WikiArticle | null> {
  const url = `https://${language}.wikipedia.org/w/api.php?action=query&pageids=${pageid}&prop=extracts|pageimages|coordinates|info&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=400&inprop=url&format=json&origin=*`;
  
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

export async function fetchArticleImages(pageid: number, language: string = 'en'): Promise<WikiImage[]> {
  const url = `https://${language}.wikipedia.org/w/api.php?action=query&pageids=${pageid}&generator=images&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=800&gimlimit=20&format=json&origin=*`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const pages = data.query?.pages;

    if (!pages) return [];

    const images: WikiImage[] = [];
    for (const page of Object.values(pages) as any[]) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      // Filter out SVGs, icons, and tiny images
      const mime: string = info.mime || '';
      if (!mime.startsWith('image/') || mime === 'image/svg+xml') continue;
      if (info.width < 100 || info.height < 100) continue;

      images.push({
        title: page.title?.replace('File:', '') || '',
        url: info.url,
        thumbUrl: info.thumburl || info.url,
        width: info.width,
        height: info.height,
      });
    }

    return images;
  } catch (error) {
    console.error('Error fetching article images:', error);
    return [];
  }
}

export async function searchPlaceByName(
  query: string,
  language: string = 'en'
): Promise<{ lat: number; lon: number; title: string } | null> {
  const url = `https://${language}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    const result = data.query?.search?.[0];
    
    if (!result) return null;
    
    const coordUrl = `https://${language}.wikipedia.org/w/api.php?action=query&pageids=${result.pageid}&prop=coordinates&format=json&origin=*`;
    const coordResponse = await fetch(coordUrl);
    const coordData = await coordResponse.json();
    const coords = coordData.query?.pages?.[result.pageid]?.coordinates?.[0];
    
    if (!coords) return null;
    
    return {
      lat: coords.lat,
      lon: coords.lon,
      title: result.title,
    };
  } catch (error) {
    console.error('Error searching for place:', error);
    return null;
  }
}
