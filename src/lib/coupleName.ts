/**
 * "Sample & Couple" style label for the welcome headline.
 * Prefers two first names. Otherwise an event name that already reads as a couple.
 */

export function coupleDisplayName(firstNames: string[], eventName: string | null | undefined): string {
  const unique: string[] = [];
  for (const raw of firstNames) {
    const name = raw.trim();
    if (!name) continue;
    if (unique.some((n) => n.toLowerCase() === name.toLowerCase())) continue;
    unique.push(name);
  }
  if (unique.length >= 2) return `${unique[0]} & ${unique[1]}`;
  const fromEvent = eventNameCouple(eventName);
  if (fromEvent) return fromEvent;
  if (unique.length === 1) return unique[0];
  return '';
}

function eventNameCouple(eventName: string | null | undefined): string | null {
  if (!eventName) return null;
  let s = eventName.trim();
  s = s.replace(/\s*'s\s+(wedding|event|celebration)\s*$/i, '');
  s = s.replace(/\s+(wedding|event|celebration)\s*$/i, '');
  s = s.replace(/\s+and\s+/gi, ' & ');
  s = s.trim();
  if (!s.includes('&')) return null;
  return s;
}
