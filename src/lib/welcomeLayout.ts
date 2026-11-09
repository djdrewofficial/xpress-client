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
  const posterContent = posterContentHeight(input.copy, input.contentWidth, scale, input.topInset);
  const room = input.windowHeight - sheet + SHEET_OVERLAP;
  const floor = Math.round(300 * Math.min(scale, 1.15));
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
  const noteLines = locked ? wrappedLines(copy.phoneNote, width, Math.round(13 * scale)) : 0;
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

function posterContentHeight(copy: WelcomeMeasureCopy, width: number, scale: number, topInset: number): number {
  const inviteLines = wrappedLines(copy.invite, Math.min(width, 460), Math.round(17 * scale));
  const unitLines = wrappedLines(copy.daysToGo, width, Math.round(22 * scale));
  return (
    topInset +
    12 +
    Math.round(14 * scale) +
    10 +
    Math.round(48 * scale) +
    10 +
    inviteLines * Math.round(24 * scale) +
    16 +
    Math.round(84 * scale) +
    unitLines * Math.round(28 * scale) +
    19 +
    Math.round(18 * scale) +
    30 +
    48
  );
}

function wrappedLines(text: string, width: number, fontSize: number): number {
  const charWidth = Math.max(1, fontSize * 0.56);
  const perLine = Math.max(8, Math.floor(width / charWidth));
  return Math.max(1, Math.ceil(text.length / perLine));
}
