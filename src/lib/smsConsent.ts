import { asRecord, mobileJson } from '@/lib/mobileJson';

/** Must match the disclosure on screen. XOS rejects an older version with 400. */
export const SMS_DISCLOSURE_VERSION = '2026-11-06';

export type SmsCapability = {
  canGrant: boolean;
  canWithdraw: boolean;
  reason: string | null;
};

export type SmsConsentRecord = {
  granted: boolean;
  disclosureVersion: string | null;
  phone: string | null;
  eligibleOnFile: boolean;
  capability: SmsCapability;
};

export type SmsConsentResult =
  | { ok: true; record: SmsConsentRecord }
  | { ok: false; status: number; ineligible: boolean };

export async function loadSmsConsent(): Promise<SmsConsentResult> {
  return readSms(await mobileJson('GET', '/api/mobile/sms-marketing-consent'));
}

export async function grantSmsConsent(eventId?: string | null): Promise<SmsConsentResult> {
  return postSms('grant', eventId);
}

export async function withdrawSmsConsent(eventId?: string | null): Promise<SmsConsentResult> {
  return postSms('withdraw', eventId);
}

/** The server writes nothing for skip. Welcome does not call this. */
export async function skipSmsConsent(eventId?: string | null): Promise<SmsConsentResult> {
  return postSms('skip', eventId);
}

async function postSms(action: 'grant' | 'withdraw' | 'skip', eventId?: string | null): Promise<SmsConsentResult> {
  const body: Record<string, unknown> = {
    action,
    disclosureVersion: SMS_DISCLOSURE_VERSION,
    source: 'app',
  };
  if (eventId) body.eventId = eventId;
  return readSms(await mobileJson('POST', '/api/mobile/sms-marketing-consent', body));
}

function readSms(result: Awaited<ReturnType<typeof mobileJson>>): SmsConsentResult {
  if (!result.ok) {
    return { ok: false, status: result.status, ineligible: result.status === 403 };
  }
  return { ok: true, record: parseRecord(result.data) };
}

function parseCapability(value: unknown): SmsCapability {
  const row = asRecord(value);
  return {
    canGrant: row.canGrant === true,
    canWithdraw: row.canWithdraw === true,
    reason: typeof row.reason === 'string' ? row.reason : null,
  };
}

function parseRecord(data: unknown): SmsConsentRecord {
  const row = asRecord(data);
  const saved = asRecord(row.saved);
  const number = asRecord(row.eligibleNumber);
  const phone = typeof number.e164 === 'string' ? number.e164 : typeof saved.phone === 'string' ? saved.phone : null;
  return {
    granted: row.granted === true,
    disclosureVersion: typeof row.disclosureVersion === 'string' ? row.disclosureVersion : null,
    phone,
    eligibleOnFile: number.onFile === true,
    capability: parseCapability(row.capability),
  };
}
