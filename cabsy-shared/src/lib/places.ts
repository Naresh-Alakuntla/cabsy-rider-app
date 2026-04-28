// Google Places API client.
//
// Why a hand-rolled fetch client and not `react-native-google-places-autocomplete`:
// the package is heavy, unmaintained, and ships its own UI. We only need the
// two endpoints below; the autocomplete + details cycle is small enough to
// implement directly and keep aligned with the Cabsy design system.
//
// Per master prompt §12: GOOGLE_MAPS_API_KEY is sourced from the app's
// .env via react-native-dotenv. The same key serves Places autocomplete +
// details (this file) and react-native-maps tile loading (configured in
// the iOS Info.plist / Android AndroidManifest.xml — those need separate
// build-time injection if you want a single source of truth).
import { GOOGLE_MAPS_API_KEY } from '@env';
const GOOGLE_PLACES_API_KEY: string = GOOGLE_MAPS_API_KEY;

const AUTOCOMPLETE_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

const COUNTRY_FILTER = 'country:in';
const DEFAULT_RADIUS_M = 50000;
const MAX_PREDICTIONS = 5;

export type PlacesErrorCode =
  | 'NO_KEY'
  | 'NETWORK'
  | 'API_ERROR'
  | 'NO_RESULTS';

export class PlacesError extends Error {
  public readonly code: PlacesErrorCode;

  constructor(code: PlacesErrorCode, message: string) {
    super(message);
    this.name = 'PlacesError';
    this.code = code;
  }
}

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
}

interface AutocompleteOptions {
  sessionToken?: string;
  nearLat?: number;
  nearLng?: number;
  radiusMeters?: number;
}

interface DetailsOptions {
  sessionToken?: string;
}

interface RawPredictionTerms {
  main_text?: string;
  secondary_text?: string;
}

interface RawPrediction {
  place_id?: string;
  description?: string;
  structured_formatting?: RawPredictionTerms;
}

interface RawAutocompleteResponse {
  status: string;
  error_message?: string;
  predictions?: RawPrediction[];
}

interface RawDetailsResponse {
  status: string;
  error_message?: string;
  result?: {
    place_id?: string;
    formatted_address?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  };
}

interface ProcessEnvShape {
  env?: Record<string, string | undefined>;
}

function readEnvKey(): string | undefined {
  // `process.env` is available in RN via Metro's transform but @types/node
  // is not in scope for this package; reach for it through a narrow shim.
  const g = globalThis as { process?: ProcessEnvShape };
  return g.process?.env?.GOOGLE_PLACES_API_KEY;
}

function getPlacesApiKey(): string {
  const fromEnv = readEnvKey();
  const key = fromEnv && fromEnv.length > 0 ? fromEnv : GOOGLE_PLACES_API_KEY;
  if (!key || key === '__SET_VIA_CONFIG__') {
    throw new PlacesError(
      'NO_KEY',
      'Google Places API key not configured. Set GOOGLE_PLACES_API_KEY in your build environment or via react-native-config.',
    );
  }
  return key;
}

export function makeSessionToken(): string {
  // Session tokens just need to be unique per booking session; Google does
  // not impose a format. Combine timestamp + random for collision resistance.
  const rand = Math.random().toString(36).slice(2, 12);
  const ts = Date.now().toString(36);
  return `${ts}-${rand}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new PlacesError(
      'NETWORK',
      e instanceof Error ? e.message : 'Network request failed',
    );
  }
  if (!res.ok) {
    throw new PlacesError(
      'NETWORK',
      `Places request failed with status ${res.status}`,
    );
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new PlacesError('API_ERROR', 'Invalid response from Places API');
  }
}

export async function autocomplete(
  input: string,
  opts?: AutocompleteOptions,
): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length === 0) return [];

  const key = getPlacesApiKey();
  const params = new URLSearchParams();
  params.set('input', trimmed);
  params.set('key', key);
  params.set('components', COUNTRY_FILTER);
  if (opts?.sessionToken) {
    params.set('sessiontoken', opts.sessionToken);
  }
  if (
    typeof opts?.nearLat === 'number' &&
    typeof opts?.nearLng === 'number'
  ) {
    params.set('location', `${opts.nearLat},${opts.nearLng}`);
    params.set(
      'radius',
      String(opts?.radiusMeters ?? DEFAULT_RADIUS_M),
    );
  }

  const data = await fetchJson<RawAutocompleteResponse>(
    `${AUTOCOMPLETE_URL}?${params.toString()}`,
  );

  if (data.status === 'ZERO_RESULTS') return [];
  if (data.status !== 'OK') {
    throw new PlacesError(
      'API_ERROR',
      data.error_message ?? `Places autocomplete error: ${data.status}`,
    );
  }

  const predictions = data.predictions ?? [];
  const out: PlacePrediction[] = [];
  for (const p of predictions) {
    if (!p.place_id || !p.description) continue;
    out.push({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? '',
    });
    if (out.length >= MAX_PREDICTIONS) break;
  }
  return out;
}

export async function placeDetails(
  placeId: string,
  opts?: DetailsOptions,
): Promise<PlaceDetails> {
  const key = getPlacesApiKey();
  const params = new URLSearchParams();
  params.set('place_id', placeId);
  params.set('key', key);
  params.set('fields', 'geometry,formatted_address,place_id');
  if (opts?.sessionToken) {
    params.set('sessiontoken', opts.sessionToken);
  }

  const data = await fetchJson<RawDetailsResponse>(
    `${DETAILS_URL}?${params.toString()}`,
  );

  if (data.status === 'ZERO_RESULTS' || !data.result) {
    throw new PlacesError('NO_RESULTS', 'No place found for the given id');
  }
  if (data.status !== 'OK') {
    throw new PlacesError(
      'API_ERROR',
      data.error_message ?? `Places details error: ${data.status}`,
    );
  }

  const lat = data.result.geometry?.location?.lat;
  const lng = data.result.geometry?.location?.lng;
  const address = data.result.formatted_address;
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    typeof address !== 'string'
  ) {
    throw new PlacesError(
      'API_ERROR',
      'Place details response missing geometry or address',
    );
  }

  return {
    placeId: data.result.place_id ?? placeId,
    address,
    lat,
    lng,
  };
}
