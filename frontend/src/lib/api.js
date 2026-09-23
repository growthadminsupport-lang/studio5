const baseUrl = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')).replace(/\/$/, '');
const REFRESH_KEY = 'growth_refresh_token';
let accessToken = null;
let refreshPromise = null;
let sessionGeneration = 0;

export class ApiError extends Error {
  constructor(status, detail) {
    const message = typeof detail === 'string' ? detail : detail?.message ||
      (Array.isArray(detail) ? detail.map((item) => item.msg).join(', ') : 'Request failed');
    super(message);
    this.status = status;
    this.code = detail?.code;
  }
}

export function storedRefreshToken() {
  return sessionStorage.getItem(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY);
}

export function clearSession() {
  sessionGeneration += 1;
  accessToken = null;
  sessionStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function saveSession(tokens, remember = false) {
  sessionGeneration += 1;
  accessToken = tokens.access_token;
  sessionStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(REFRESH_KEY);
  (remember ? localStorage : sessionStorage).setItem(REFRESH_KEY, tokens.refresh_token);
}

async function send(path, { method = 'GET', body, token = null } = {}) {
  if (import.meta.env.PROD && !baseUrl) throw new Error('VITE_API_URL is not configured');
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.detail);
  return data;
}

export function publicRequest(path, body) {
  return send(path, { method: 'POST', body });
}

export async function refreshAccess() {
  if (refreshPromise) return refreshPromise;
  const rotate = async () => {
    const previous = storedRefreshToken();
    if (!previous) return null;
    const generation = sessionGeneration;
    const remember = localStorage.getItem(REFRESH_KEY) === previous;
    try {
      const tokens = await publicRequest('/api/auth/refresh', { refresh_token: previous });
      if (generation !== sessionGeneration || storedRefreshToken() !== previous) return null;
      saveSession(tokens, remember);
      return accessToken;
    } catch (error) {
      // A different tab may have rotated the shared token. Never retry the stale value.
      if (generation === sessionGeneration && storedRefreshToken() === previous) clearSession();
      throw error;
    }
  };
  refreshPromise = (navigator.locks?.request
    ? navigator.locks.request('growth-refresh', rotate)
    : rotate()).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function authedRequest(path, { method = 'GET', body } = {}) {
  if (!accessToken) await refreshAccess();
  if (!accessToken) throw new ApiError(401, 'Session ended');
  try {
    return await send(path, { method, body, token: accessToken });
  } catch (error) {
    if (error.status !== 401 || path === '/api/auth/refresh') throw error;
    await refreshAccess();
    if (!accessToken) throw new ApiError(401, 'Session ended');
    return send(path, { method, body, token: accessToken });
  }
}
