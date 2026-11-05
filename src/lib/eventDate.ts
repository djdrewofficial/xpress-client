import type { Locale } from '@/lib/i18n';

const WEEK_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const WEEK_ES = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'] as const;
const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'] as const;
const MONTH_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const;

/** "SAT · JUNE 12, 2027" / "SAB · 12 JUN 2027". `date` is YYYY-MM-DD. */
export function formatEventEyebrow(date: string, locale: Locale): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  if (locale === 'es') {
    return `${WEEK_ES[d.getDay()]} · ${d.getDate()} ${MONTH_ES[d.getMonth()]} ${d.getFullYear()}`;
  }
  return `${WEEK_EN[d.getDay()]} · ${MONTH_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
