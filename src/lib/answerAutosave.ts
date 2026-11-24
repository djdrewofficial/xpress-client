/** Debounce for free-text question answers (matches section notes). */
export const ANSWER_SAVE_MS = 700;

export type AnswerSaveState = 'idle' | 'saving' | 'saved' | 'failed';

/** Subtle saved/saving line under an inline question. Idle stays quiet. */
export function answerSaveVisible(state: AnswerSaveState): boolean {
  return state === 'saving' || state === 'saved' || state === 'failed';
}

/**
 * Every visible question stays expanded with its control open.
 * Folded/pencil/single-active editors are gone — this always returns the full list.
 */
export function inlineQuestionIds(visibleIds: readonly string[]): string[] {
  return [...visibleIds];
}
