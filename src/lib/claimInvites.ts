import { asRecord, mobileJson } from '@/lib/mobileJson';

export type ClaimResult = {
  reason: 'linked' | 'none' | 'staff' | 'guest' | 'unavailable';
  eventIds: string[];
};

/**
 * Link any open invite for this login.
 * POST /api/mobile/invites/claim -> { reason, eventIds }
 * Same route as the partner-access work. A 503 means that migration is not applied yet.
 */
export async function claimEventInvites(): Promise<ClaimResult> {
  const result = await mobileJson('POST', '/api/mobile/invites/claim', {});
  if (!result.ok) return { reason: 'unavailable', eventIds: [] };
  const record = asRecord(result.data);
  const eventIds = Array.isArray(record.eventIds)
    ? record.eventIds.filter((id): id is string => typeof id === 'string')
    : [];
  if (record.reason === 'linked' || record.reason === 'none' || record.reason === 'staff' || record.reason === 'guest') {
    return { reason: record.reason, eventIds };
  }
  return { reason: 'unavailable', eventIds };
}
