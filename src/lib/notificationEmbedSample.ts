/**
 * Static booking-widget HTML for screenshots / dev preview.
 * No external network calls — everything is inline so headless Chrome can paint it.
 */
export function sampleBookingEmbedHtml(opts?: { djName?: string; ink?: string; ink2?: string; surface?: string }): string {
  const dj = opts?.djName?.trim() || 'Your DJ';
  const ink = opts?.ink ?? '#120c1e';
  const ink2 = opts?.ink2 ?? '#5a4f6e';
  const surface = opts?.surface ?? '#ffffff';
  return `<div class="cal" style="
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    background:${surface};
    color:${ink};
    border-radius:16px;
    overflow:hidden;
  ">
    <div style="background:linear-gradient(135deg,#4b328e,#6a4fb8);padding:16px 18px;color:#fff;">
      <div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;opacity:.8;font-weight:700;">Planning meeting</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px;">Book with ${escapeHtml(dj)}</div>
      <div style="width:28px;height:4px;border-radius:2px;background:#fe3a3b;margin-top:10px;"></div>
    </div>
    <div style="padding:14px 16px 8px;color:${ink2};font-size:13px;">Pick a time that works for you</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;padding:8px 14px 16px;text-align:center;font-size:12px;">
      ${weekdayRow(ink2)}
      ${dayCells(ink, ink2)}
    </div>
    <div style="padding:0 14px 16px;display:flex;flex-direction:column;gap:8px;">
      ${slot('Thu 6:00 PM')}
      ${slot('Thu 7:30 PM')}
      ${slot('Fri 5:00 PM', true)}
    </div>
  </div>`;
}

export function sampleBookingBodyHtml(): string {
  return '<p>Choose a planning-meeting time below. This calendar is just for your event.</p>';
}

function weekdayRow(ink2: string): string {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    .map(
      (d) =>
        `<div style="color:${ink2};font-weight:600;padding:4px 0;">${d}</div>`,
    )
    .join('');
}

function dayCells(ink: string, ink2: string): string {
  const cells: string[] = [];
  for (let i = 0; i < 2; i++) cells.push('<div></div>');
  for (let d = 1; d <= 30; d++) {
    const selected = d === 12;
    cells.push(
      `<div style="
        padding:8px 0;border-radius:10px;font-weight:${selected ? 700 : 500};
        background:${selected ? '#4b328e' : 'transparent'};
        color:${selected ? '#fff' : d < 10 ? ink2 : ink};
      ">${d}</div>`,
    );
  }
  return cells.join('');
}

function slot(label: string, selected = false): string {
  return `<div style="
    border:1.5px solid ${selected ? '#4b328e' : '#e4dcf1'};
    background:${selected ? 'rgba(75,50,142,0.08)' : 'transparent'};
    border-radius:12px;padding:12px 14px;font-size:14px;font-weight:600;
    color:${selected ? '#4b328e' : '#120c1e'};
  ">${label}</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
