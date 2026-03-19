export function formatTimeI18n(dateStr: string, t: any): string {
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (m < 1) return t.timeJustNow;
  if (m < 60) return (t.timeMinAgo as string).replace("{m}", String(m));
  const hh = Math.floor(m / 60);
  if (hh < 24) return (t.timeHourAgo as string).replace("{h}", String(hh));
  return (t.timeDayAgo as string).replace("{d}", String(Math.floor(hh / 24)));
}
