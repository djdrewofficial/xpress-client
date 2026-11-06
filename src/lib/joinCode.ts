import { asRecord, mobileJson, type MobileFailure } from '@/lib/mobileJson';

export type RedeemedCode = {
  eventId: string;
  role: string;
  alreadyMember: boolean;
};

/**
 * Partner join code. Same contract as the unmerged partner-access client:
 * POST /api/mobile/join-code/redeem { code } -> { eventId, role, alreadyMember }
 * `code` is `XXXX-XXXX`.
 */
export async function redeemJoinCode(code: string): Promise<{ ok: true; data: RedeemedCode } | MobileFailure> {
  const formatted = formatJoinCodeInput(code);
  const result = await mobileJson('POST', '/api/mobile/join-code/redeem', { code: formatted });
  if (!result.ok) return result;
  const record = asRecord(result.data);
  const eventId = typeof record.eventId === 'string' ? record.eventId : '';
  if (!eventId) return { ok: false, status: 500, error: '', retryAfter: null };
  return {
    ok: true,
    data: {
      eventId,
      role: typeof record.role === 'string' ? record.role : 'partner',
      alreadyMember: record.alreadyMember === true,
    },
  };
}

export function formatJoinCodeInput(raw: string): string {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (compact.length <= 4) return compact;
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

/** Keep a pasted link intact. A typed code is formatted as XXXX-XXXX. */
export function formatJoinEntry(raw: string): string {
  const trimmed = raw.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || /xos\.xpressdjs\.com/i.test(trimmed)) return trimmed;
  return formatJoinCodeInput(raw);
}
