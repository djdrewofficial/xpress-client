/** Who added a song, note, or answer. A removed login keeps a role and loses the name. */

export type RemovedAuthor = 'guest' | 'host';

export type AuthorCredit = {
  name: string | null;
  removed: RemovedAuthor | null;
};

const NAME_KEYS = ['author_name', 'contributor_name', 'requested_by_name', 'answered_by_name', 'author_label'];
const ROLE_KEYS = ['author_role', 'contributor_role', 'requested_by_role', 'answered_by_role'];
const ID_KEYS = ['requested_by', 'answered_by', 'author_id'];

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function nestedName(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const joined = [text(row.first_name), text(row.last_name)].filter(Boolean).join(' ').trim();
  return joined || text(row.name) || text(row.display_name);
}

function roleOf(value: unknown): RemovedAuthor | null {
  const raw = text(value)?.toLowerCase().replace(/[_-]+/g, ' ');
  if (!raw) return null;
  if (raw === 'guest' || raw === 'event guest' || raw === 'former guest') return 'guest';
  if (raw === 'host' || raw === 'client' || raw === 'co host' || raw === 'cohost' || raw === 'former host') return 'host';
  return null;
}

export function authorCredit(row: unknown): AuthorCredit {
  if (!row || typeof row !== 'object') return { name: null, removed: null };
  const record = row as Record<string, unknown>;
  let name: string | null = null;
  for (const key of NAME_KEYS) {
    name = text(record[key]);
    if (name) break;
  }
  if (!name) {
    name = nestedName(record.author) ?? nestedName(record.contributor) ?? nestedName(record.account) ?? nestedName(record.requested_by_account);
  }
  let role: RemovedAuthor | null = null;
  for (const key of ROLE_KEYS) {
    role = roleOf(record[key]);
    if (role) break;
  }
  const id = ID_KEYS.map((key) => text(record[key])).find((value) => !!value) ?? null;
  if (name) return { name, removed: null };
  if (!id && role) return { name: null, removed: role };
  return { name: null, removed: null };
}

export function authorLabel(
  credit: AuthorCredit | null | undefined,
  labels: { guest: string; host: string },
): string | null {
  if (!credit) return null;
  if (credit.name) return credit.name;
  if (credit.removed === 'guest') return labels.guest;
  if (credit.removed === 'host') return labels.host;
  return null;
}
