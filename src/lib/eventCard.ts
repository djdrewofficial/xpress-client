import { asRecord, mobileJson } from '@/lib/mobileJson';

export type EventAccessRole = 'host' | 'guest' | 'staff';

export type EventCard = {
  role: EventAccessRole;
  id: string;
  name: string;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  guestCount: number | null;
  coverPhotoUrl: string | null;
  eventTypeId: string | null;
  eventType: string | null;
  venueName: string | null;
};

/**
 * GET /api/mobile/events/:eventId
 * 200: { role, event: { id, name, eventDate, startTime, endTime, guestCount, coverPhotoUrl, eventTypeId, eventType, venueName } }
 * 401 no session. 403 not on the event. 404 unknown id.
 * This card has no prices, pay link, notes, or client ids.
 */
export async function fetchEventCard(eventId: string): Promise<EventCard | null> {
  const result = await mobileJson('GET', `/api/mobile/events/${encodeURIComponent(eventId)}`);
  if (!result.ok) return null;
  const record = asRecord(result.data);
  const role = record.role === 'host' || record.role === 'guest' || record.role === 'staff' ? record.role : null;
  const event = asRecord(record.event);
  const id = typeof event.id === 'string' ? event.id : '';
  if (!role || !id) return null;
  return {
    role,
    id,
    name: typeof event.name === 'string' ? event.name : '',
    eventDate: typeof event.eventDate === 'string' ? event.eventDate : null,
    startTime: typeof event.startTime === 'string' ? event.startTime : null,
    endTime: typeof event.endTime === 'string' ? event.endTime : null,
    guestCount: typeof event.guestCount === 'number' ? event.guestCount : null,
    coverPhotoUrl: typeof event.coverPhotoUrl === 'string' ? event.coverPhotoUrl : null,
    eventTypeId: typeof event.eventTypeId === 'string' ? event.eventTypeId : null,
    eventType: typeof event.eventType === 'string' ? event.eventType : null,
    venueName: typeof event.venueName === 'string' ? event.venueName : null,
  };
}
