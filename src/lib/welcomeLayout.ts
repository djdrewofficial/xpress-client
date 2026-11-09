/** The Welcome Continue control stays this tall. It is not squeezed to fit. */
export const WELCOME_BUTTON_HEIGHT = 54;

const SHEET_OVERLAP = 28;

/**
 * Phone Welcome at the system text size should show Continue without scrolling.
 * A larger text size may scroll. It does not clip the button.
 * Tablets keep the poster height they already use.
 */
export function welcomePosterLayout(input: {
  form: 'phone' | 'tablet';
  windowHeight: number;
  contentWidth: number;
  topInset: number;
  bottomInset: number;
  fontScale: number;
  copy: WelcomeMeasureCopy;
}): { posterMinHeight: number | null; scrolls: boolean } {
  if (input.form === 'tablet') return { posterMinHeight: null, scrolls: false };
  const scale = Number.isFinite(input.fontScale) && input.fontScale > 0 ? input.fontScale : 1;
  const sheet = Math.max(
    sheetHeight(input.copy, input.contentWidth, scale, false, input.bottomInset),
    sheetHeight(input.copy, input.contentWidth, scale, true, input.bottomInset),
  );
  const compact = input.windowHeight < 740;
  const posterContent = posterContentHeight(input.copy, input.contentWidth, scale, input.topInset, compact);
  const room = input.windowHeight - sheet + SHEET_OVERLAP;
  const floor = Math.round((compact ? 260 : 300) * Math.min(scale, 1.15));
  if (room >= Math.max(floor, posterContent)) {
    return { posterMinHeight: room, scrolls: false };
  }
  return { posterMinHeight: Math.max(floor, posterContent), scrolls: true };
}

export type WelcomeMeasureCopy = {
  invite: string;
  daysToGo: string;
  smsLine: string;
  phoneNote: string;
  agreement: string;
};

function sheetHeight(copy: WelcomeMeasureCopy, width: number, scale: number, locked: boolean, bottomInset: number): number {
  const foot = Math.round(18 * scale);
  const sub = Math.round(19 * scale);
  const textWidth = Math.max(120, width - (locked ? 0 : 64));
  const bodyLines = wrappedLines(copy.smsLine, textWidth, Math.round(13 * scale));
  // Welcome keeps the locked phone note on one line (see SmsConsentSetting).
  const noteLines = locked ? 1 : 0;
  const agreeLines = wrappedLines(copy.agreement, width, Math.round(13 * scale));
  const padBottom = Math.max(20, bottomInset);
  return (
    28 +
    Math.round(36 * scale) +
    22 +
    1 +
    22 +
    sub +
    4 +
    bodyLines * foot +
    4 +
    foot +
    (noteLines ? 6 + noteLines * foot : 0) +
    22 +
    agreeLines * foot +
    12 +
    WELCOME_BUTTON_HEIGHT +
    padBottom
  );
}

function posterContentHeight(
  copy: WelcomeMeasureCopy,
  width: number,
  scale: number,
  topInset: number,
  compact: boolean,
): number {
  const inviteLines = wrappedLines(copy.invite, Math.min(width, 460), Math.round((compact ? 16 : 17) * scale));
  const unitLines = wrappedLines(copy.daysToGo, width, Math.round((compact ? 20 : 22) * scale));
  // Greeting → logo → countdown pack with even gaps; leftover height stays above.
  const logo = compact ? 48 : 72;
  const logoGap = compact ? 8 : 16;
  const name = Math.round((compact ? 32 : 46) * scale);
  const numeral = Math.round((compact ? 48 : 72) * scale);
  const unit = Math.round((compact ? 20 : 28) * scale);
  const inviteLine = Math.round((compact ? 20 : 24) * scale);
  const padBottom = compact ? 20 : 36;
  const progress = compact ? 18 : 30;
  const greetingGap = compact ? 4 : 6;
  return (
    topInset +
    (compact ? 6 : 10) +
    Math.round(14 * scale) +
    greetingGap +
    name +
    greetingGap +
    inviteLines * inviteLine +
    logoGap +
    logo +
    logoGap +
    numeral +
    unitLines * unit +
    (compact ? 10 : 19) +
    Math.round(18 * scale) +
    progress +
    padBottom
  );
}

function wrappedLines(text: string, width: number, fontSize: number): number {
  const charWidth = Math.max(1, fontSize * 0.56);
  const perLine = Math.max(8, Math.floor(width / charWidth));
  return Math.max(1, Math.ceil(text.length / perLine));
}
