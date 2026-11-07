/** How wide the couple app should lay out.
    Phones and a narrow iPad split stay full width.
    A tablet window centers a readable column instead of stretching the phone form. */

export type FrameForm = 'phone' | 'tablet';

export type Frame = {
  width: number;
  form: FrameForm;
  contentWidth: number;
  horizontalPadding: number;
  columns: number;
  /** Null when a sheet should span the screen. */
  sheetWidth: number | null;
};

/** Narrower than an iPad portrait, including a phone and a slim split view. */
export const TABLET_MIN_WIDTH = 700;

export function frameFor(width: number): Frame {
  const w = Number.isFinite(width) && width > 0 ? Math.round(width) : 0;
  if (w < TABLET_MIN_WIDTH) {
    return {
      width: w,
      form: 'phone',
      contentWidth: w,
      horizontalPadding: 20,
      columns: 2,
      sheetWidth: null,
    };
  }
  return {
    width: w,
    form: 'tablet',
    contentWidth: Math.min(720, w - 64),
    horizontalPadding: 24,
    columns: w >= 1000 ? 4 : 3,
    sheetWidth: Math.min(560, w - 64),
  };
}
