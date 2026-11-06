import { asRecord, mobileJson } from '@/lib/mobileJson';

/** Must match the notice the host confirms. XOS rejects an older version with 400. */
export const AI_CONSENT_POLICY_VERSION = '2026-11-06';

export type AiConsentRecord = {
  eventId: string;
  granted: boolean;
  grantedAt: string | null;
  withdrawnAt: string | null;
  policyVersion: string | null;
  source: string | null;
};

export type AiConsentResult =
  | { ok: true; record: AiConsentRecord }
  | { ok: false; status: number };

export async function loadAiConsent(eventId: string): Promise<AiConsentResult> {
  const result = await mobileJson('GET', `/api/mobile/ai-consent?eventId=${encodeURIComponent(eventId)}`);
  if (!result.ok) return { ok: false, status: result.status };
  return { ok: true, record: parseRecord(result.data, eventId) };
}

export async function grantAiConsent(eventId: string): Promise<AiConsentResult> {
  const result = await mobileJson('POST', '/api/mobile/ai-consent', {
    eventId,
    action: 'grant',
    policyVersion: AI_CONSENT_POLICY_VERSION,
    source: 'app',
  });
  if (!result.ok) return { ok: false, status: result.status };
  return { ok: true, record: parseRecord(result.data, eventId) };
}

export async function withdrawAiConsent(eventId: string): Promise<AiConsentResult> {
  const result = await mobileJson('POST', '/api/mobile/ai-consent', {
    eventId,
    action: 'withdraw',
  });
  if (!result.ok) return { ok: false, status: result.status };
  return { ok: true, record: parseRecord(result.data, eventId) };
}

function parseRecord(data: unknown, eventId: string): AiConsentRecord {
  const row = asRecord(data);
  return {
    eventId: typeof row.eventId === 'string' ? row.eventId : eventId,
    granted: row.granted === true,
    grantedAt: typeof row.grantedAt === 'string' ? row.grantedAt : null,
    withdrawnAt: typeof row.withdrawnAt === 'string' ? row.withdrawnAt : null,
    policyVersion: typeof row.policyVersion === 'string' ? row.policyVersion : null,
    source: typeof row.source === 'string' ? row.source : null,
  };
}
