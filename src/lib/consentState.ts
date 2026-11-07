/** How a consent switch may be shown. `granted` is null until a server read confirms it. */

export type ConsentSnapshot = {
  granted: boolean;
  canGrant: boolean;
  canWithdraw: boolean;
  reason: string | null;
};

export type ConsentRead =
  | { ok: true; record: ConsentSnapshot }
  | { ok: false; status: number; ineligible: boolean };

export type ConsentNotice =
  | 'needPhone'
  | 'unavailable'
  | 'ineligible'
  | 'blocked'
  | 'failed'
  | 'unconfirmed'
  | 'unread'
  | null;

export type ConsentUi = {
  phase: 'loading' | 'unknown' | 'known';
  /** Null while loading or unconfirmed. A known false is a server record, not a failed read. */
  granted: boolean | null;
  canGrant: boolean;
  canWithdraw: boolean;
  notice: ConsentNotice;
};

export type ConsentKind = 'sms' | 'ai';

export function loadingConsent(): ConsentUi {
  return { phase: 'loading', granted: null, canGrant: false, canWithdraw: false, notice: null };
}

function knownFrom(record: ConsentSnapshot, kind: ConsentKind): ConsentUi {
  let notice: ConsentNotice = null;
  if (kind === 'sms' && record.reason === 'no_mobile_number') notice = 'needPhone';
  if (kind === 'ai' && record.reason === 'not_contract_client') notice = 'blocked';
  return {
    phase: 'known',
    granted: record.granted === true,
    canGrant: record.canGrant === true,
    canWithdraw: record.canWithdraw === true,
    notice,
  };
}

/** A failed read is unknown. It is not stored as a decline. */
export function consentFromRead(result: ConsentRead, kind: ConsentKind): ConsentUi {
  if (!result.ok) {
    if (result.ineligible || result.status === 403) {
      return {
        phase: 'known',
        granted: false,
        canGrant: false,
        canWithdraw: false,
        notice: kind === 'ai' ? 'blocked' : 'ineligible',
      };
    }
    return { phase: 'unknown', granted: null, canGrant: false, canWithdraw: false, notice: 'unread' };
  }
  return knownFrom(result.record, kind);
}

/**
 * A missing response (status 0) may already be saved.
 * AI consent saves first, then reads the row back. A 503 from that read means the
 * grant or withdrawal is already committed, so it is unconfirmed until GET succeeds.
 * SMS returns 503 before it writes, when the table is missing, so that 503 keeps
 * the last known switch and does not pretend the choice changed.
 * `reconcile` means the caller should GET and then use `consentAfterReconcile`.
 */
function writeMayHaveCommitted(kind: ConsentKind, status: number): boolean {
  if (status === 0) return true;
  return kind === 'ai' && status === 503;
}

export function consentAfterWrite(
  previous: ConsentUi,
  result: ConsentRead,
  kind: ConsentKind,
  intent: 'grant' | 'withdraw',
): { ui: ConsentUi; reconcile: boolean } {
  if (!result.ok) {
    if (writeMayHaveCommitted(kind, result.status)) {
      return {
        ui: { phase: 'unknown', granted: null, canGrant: false, canWithdraw: false, notice: 'unconfirmed' },
        reconcile: true,
      };
    }
    if (result.ineligible || result.status === 403) {
      return {
        ui: {
          phase: 'known',
          granted: previous.phase === 'known' ? previous.granted === true : false,
          canGrant: false,
          canWithdraw: false,
          notice: kind === 'ai' ? 'blocked' : 'ineligible',
        },
        reconcile: false,
      };
    }
    return {
      ui: {
        phase: previous.phase === 'known' ? 'known' : 'unknown',
        granted: previous.phase === 'known' ? previous.granted === true : null,
        canGrant: previous.canGrant,
        canWithdraw: previous.canWithdraw,
        notice: result.status === 503 || result.status === 400 ? 'unavailable' : 'failed',
      },
      reconcile: false,
    };
  }
  const next = knownFrom(result.record, kind);
  if (intent === 'grant' && result.record.granted !== true && next.notice == null) next.notice = 'failed';
  if (intent === 'withdraw' && result.record.granted !== false && next.notice == null) next.notice = 'failed';
  return { ui: next, reconcile: false };
}

/** After a lost write, a successful read replaces the unknown state. A failed read stays unknown. */
export function consentAfterReconcile(result: ConsentRead, kind: ConsentKind): ConsentUi {
  if (!result.ok) {
    return { phase: 'unknown', granted: null, canGrant: false, canWithdraw: false, notice: 'unconfirmed' };
  }
  return knownFrom(result.record, kind);
}
