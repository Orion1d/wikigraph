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

export const MAX_VISIBLE_PLACES = 200;

export type WikiApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

type WikiJson = Record<string, unknown>;

function getQuery(data: WikiJson): WikiJson | undefined {
  const q = data.query;
  return q && typeof q === 'object' && !Array.isArray(q) ? (q as WikiJson) : undefined;
}

async function fetchWikiJson(url: string): Promise<WikiApiResult<WikiJson>> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return { ok: false, error: 'Network error. Check your connection and try again.' };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `Wikipedia returned HTTP ${response.status}. Try again in a moment.`,
    };
  }

  let data: WikiJson;
  try {
    data = (await response.json()) as WikiJson;
  } catch {
    return { ok: false, error: 'Could not read Wikipedia response.' };
  }

  const err = data.error;
  if (err && typeof err === 'object' && !Array.isArray(err)) {
    const e = err as { code?: unknown; info?: unknown };
    const info = typeof e.info === 'string' ? e.info : undefined;
    const code = typeof e.code === 'string' ? e.code : undefined;
    return {
      ok: false,
      error: info || code || 'Wikipedia API error.',
    };
  }

  return { ok: true, data };
}

export async function fetchNearbyPlaces(
  lat: number,
  lon: number,
  radius: number = 10000,
  language: string = 'en'
): Promise<WikiApiResult<WikiPlace[]>> {
  const safeRadius = Math.floor(Math.min(Math.max(radius, 10), 10000));
  const safeLat = Math.min(90, Math.max(-90, lat));
  const safeLon = ((((lon + 180) % 360) + 360) % 360) - 180;

  const perRequestLimit = 100;
  let gscontinue: string | undefined;
  const allPlaces: WikiPlace[] = [];
  const seenPageIds = new Set<number>();

  try {
    while (allPlaces.length < MAX_VISIBLE_PLACES) {
      const requestLimit = Math.min(perRequestLimit, MAX_VISIBLE_PLACES - allPlaces.length);
      const continueParam = gscontinue ? `&gscontinue=${encodeURIComponent(gscontinue)}` : '';
      const url = `https://${language}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${safeLat}|${safeLon}&gsradius=${safeRadius}&gslimit=${requestLimit}${continueParam}&format=json&origin=*`;

      const result = await fetchWikiJson(url);
      if (!result.ok) return result;

      const query = getQuery(result.data);
      const batch = (query?.geosearch as WikiPlace[] | undefined) || [];

      for (const place of batch) {
        if (seenPageIds.has(place.pageid)) continue;
        seenPageIds.add(place.pageid);
        allPlaces.push(place);
        if (allPlaces.length >= MAX_VISIBLE_PLACES) break;
      }

      const cont = result.data.continue as { gscontinue?: string } | undefined;
      gscontinue = cont?.gscontinue;
      if (!gscontinue || batch.length === 0) break;
    }

    return { ok: true, data: allPlaces };
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return { ok: false, error: 'Something went wrong loading nearby places.' };
  }
}

export async function fetchArticleDetails(
  pageid: number,
  language: string = 'en'
): Promise<WikiApiResult<WikiArticle | null>> {
  const url = `https://${language}.wikipedia.org/w/api.php?action=query&pageids=${pageid}&prop=extracts|pageimages|coordinates|info&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=400&inprop=url&format=json&origin=*`;

  const result = await fetchWikiJson(url);
  if (!result.ok) return result;

  const query = getQuery(result.data);
  const pages = query?.pages as Record<string, WikiJson> | undefined;
  const page = pages?.[String(pageid)];

  if (!page || typeof page !== 'object') {
    return { ok: true, data: null };
  }

  const missing = page.missing !== undefined;
  if (missing) {
    return { ok: true, data: null };
  }

  const coordsRaw = page.coordinates as Array<{ lat: number; lon: number }> | undefined;
  const thumbnail = page.thumbnail as WikiArticle['thumbnail'] | undefined;
  const fullurl = typeof page.fullurl === 'string' ? page.fullurl : '';

  return {
    ok: true,
    data: {
      pageid: typeof page.pageid === 'number' ? page.pageid : pageid,
      title: typeof page.title === 'string' ? page.title : '',
      extract: typeof page.extract === 'string' ? page.extract : 'No description available.',
      thumbnail,
      coordinates: coordsRaw?.[0],
      fullurl,
    },
  };
}

export async function fetchArticleImages(
  pageid: number,
  language: string = 'en'
): Promise<WikiApiResult<WikiImage[]>> {
  const url = `https://${language}.wikipedia.org/w/api.php?action=query&pageids=${pageid}&generator=images&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=800&gimlimit=20&format=json&origin=*`;

  const result = await fetchWikiJson(url);
  if (!result.ok) return result;

  const query = getQuery(result.data);
  const pages = query?.pages;
  if (!pages || typeof pages !== 'object') {
    return { ok: true, data: [] };
  }

  type WikiImageApiPage = {
    title?: string;
    imageinfo?: Array<{
      url?: string;
      thumburl?: string;
      mime?: string;
      width?: number;
      height?: number;
    }>;
  };

  const images: WikiImage[] = [];
  for (const page of Object.values(pages) as WikiImageApiPage[]) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const mime: string = info.mime || '';
    if (!mime.startsWith('image/') || mime === 'image/svg+xml') continue;
    if ((info.width ?? 0) < 100 || (info.height ?? 0) < 100) continue;

    images.push({
      title: page.title?.replace('File:', '') || '',
      url: info.url || '',
      thumbUrl: info.thumburl || info.url || '',
      width: info.width ?? 0,
      height: info.height ?? 0,
    });
  }

  return { ok: true, data: images };
}

export async function searchPlaceByName(
  query: string,
  language: string = 'en'
): Promise<WikiApiResult<{ lat: number; lon: number; title: string } | null>> {
  const url = `https://${language}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`;

  const searchRes = await fetchWikiJson(url);
  if (!searchRes.ok) return searchRes;

  const q1 = getQuery(searchRes.data);
  const searchList = q1?.search as Array<{ pageid: number; title: string }> | undefined;
  const first = searchList?.[0];

  if (!first) {
    return { ok: true, data: null };
  }

  const coordUrl = `https://${language}.wikipedia.org/w/api.php?action=query&pageids=${first.pageid}&prop=coordinates&format=json&origin=*`;
  const coordRes = await fetchWikiJson(coordUrl);
  if (!coordRes.ok) return coordRes;

  const q2 = getQuery(coordRes.data);
  const pages = q2?.pages as Record<string, WikiJson> | undefined;
  const page = pages?.[String(first.pageid)];
  const coords = page?.coordinates as Array<{ lat: number; lon: number }> | undefined;
  const coord = coords?.[0];

  if (!coord || typeof coord.lat !== 'number' || typeof coord.lon !== 'number') {
    return { ok: true, data: null };
  }

  return {
    ok: true,
    data: {
      lat: coord.lat,
      lon: coord.lon,
      title: first.title,
    },
  };
}
