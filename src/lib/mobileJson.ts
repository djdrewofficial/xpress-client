import { apiBase, authorizedFetch } from '@/lib/api';

const TIMEOUT_MS = 12000;

export type MobileFailure = {
  ok: false;
  status: number;
  error: string;
  retryAfter: number | null;
  /** Response JSON, including capability on a 403. Null when there was no response. */
  payload: unknown;
};

export type MobileResult<T = unknown> = { ok: true; data: T } | MobileFailure;

/** JSON call to XOS /api/mobile. Uses authorizedFetch so a 401 refreshes once. */
export async function mobileJson(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  body?: Record<string, unknown>,
): Promise<MobileResult> {
  const base = apiBase();
  if (!base) return { ok: false, status: 0, error: '', retryAfter: null, payload: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await authorizedFetch(`${base}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const record = json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
      return {
        ok: false,
        status: res.status,
        error: typeof record.error === 'string' ? record.error : '',
        retryAfter: retryAfterSeconds(res),
        payload: json,
      };
    }
    return { ok: true, data: json as never };
  } catch {
    return { ok: false, status: 0, error: '', retryAfter: null, payload: null };
  } finally {
    clearTimeout(timer);
  }
}

function retryAfterSeconds(res: Response): number | null {
  const raw = res.headers.get('Retry-After');
  if (!raw) return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}
