import { asRecord, mobileJson } from '@/lib/mobileJson';

/** Must match the notice the host confirms. XOS rejects an older version with 400. */
export const AI_CONSENT_POLICY_VERSION = '2026-11-06';

export type AiCapability = {
  canGrant: boolean;
  canWithdraw: boolean;
  reason: string | null;
};

export type AiConsentRecord = {
  eventId: string;
  granted: boolean;
  grantedAt: string | null;
  withdrawnAt: string | null;
  policyVersion: string | null;
  source: string | null;
  capability: AiCapability;
};

export type AiConsentResult =
  | { ok: true; record: AiConsentRecord }
  | { ok: false; status: number; ineligible: boolean };

export async function loadAiConsent(eventId: string): Promise<AiConsentResult> {
  return readAi(await mobileJson('GET', `/api/mobile/ai-consent?eventId=${encodeURIComponent(eventId)}`), eventId);
}

export async function grantAiConsent(eventId: string): Promise<AiConsentResult> {
  return readAi(await mobileJson('POST', '/api/mobile/ai-consent', {
    eventId,
    action: 'grant',
    policyVersion: AI_CONSENT_POLICY_VERSION,
    source: 'app',
  }), eventId);
}

export async function withdrawAiConsent(eventId: string): Promise<AiConsentResult> {
  return readAi(await mobileJson('POST', '/api/mobile/ai-consent', {
    eventId,
    action: 'withdraw',
  }), eventId);
}

function readAi(result: Awaited<ReturnType<typeof mobileJson>>, eventId: string): AiConsentResult {
  if (!result.ok) {
    const reason = parseCapability(asRecord(result.payload).capability).reason;
    const ineligible = result.status === 403 || result.error === 'not_contract_client' || reason === 'not_contract_client';
    return { ok: false, status: result.status, ineligible };
  }
  return { ok: true, record: parseRecord(result.data, eventId) };
}

function parseCapability(value: unknown): AiCapability {
  const row = asRecord(value);
  return {
    canGrant: row.canGrant === true,
    canWithdraw: row.canWithdraw === true,
    reason: typeof row.reason === 'string' ? row.reason : null,
  };
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
    capability: parseCapability(row.capability),
  };
}
