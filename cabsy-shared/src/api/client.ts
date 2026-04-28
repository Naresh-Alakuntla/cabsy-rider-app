import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as ENV_API_BASE_URL } from '@env';

// Per master prompt §12: app env vars include API_BASE_URL.
// Android emulator: set API_BASE_URL=http://10.0.2.2:4000 in .env.
export const API_BASE_URL = ENV_API_BASE_URL;

const ACCESS_TOKEN_KEY = 'cabsy.accessToken';
const REFRESH_TOKEN_KEY = 'cabsy.refreshToken';

export type FetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export async function setTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, accessToken],
    [REFRESH_TOKEN_KEY, refreshToken],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

async function setAccessToken(accessToken: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as ErrorEnvelope;
    const code = parsed.error?.code ?? 'UNKNOWN';
    const message = parsed.error?.message ?? res.statusText ?? 'Request failed';
    return new ApiError(res.status, code, message, parsed.error?.details);
  } catch {
    return new ApiError(res.status, 'NETWORK', text || res.statusText || 'Request failed');
  }
}

async function buildHeaders(
  options: FetchOptions,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.auth !== false) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

async function rawFetch<T>(path: string, options: FetchOptions): Promise<T> {
  const headers = await buildHeaders(options);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

interface RefreshResponse {
  accessToken: string;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  try {
    const result = await rawFetch<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
    await setAccessToken(result.accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  try {
    return await rawFetch<T>(path, options);
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.statusCode === 401 &&
      options.auth !== false
    ) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return rawFetch<T>(path, options);
      }
      await clearTokens();
      throw err;
    }
    throw err;
  }
}
