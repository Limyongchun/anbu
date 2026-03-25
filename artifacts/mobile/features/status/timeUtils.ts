export function getNow(): number {
  return Date.now();
}

export function safeParseDate(value: number | string | Date | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    if (!isFinite(value) || value <= 0) return null;
    return value;
  }
  if (value instanceof Date) {
    const t = value.getTime();
    if (!isFinite(t) || t <= 0) return null;
    return t;
  }
  if (typeof value === "string") {
    const t = new Date(value).getTime();
    if (!isFinite(t) || t <= 0) return null;
    return t;
  }
  return null;
}

export function diffMinutes(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.floor(diff / 60000);
}

export function isWithinSleepWindow(
  now: number,
  sleepStartHour: number,
  sleepEndHour: number
): boolean {
  const d = new Date(now);
  const h = d.getHours();

  if (sleepStartHour > sleepEndHour) {
    return h >= sleepStartHour || h < sleepEndHour;
  }
  return h >= sleepStartHour && h < sleepEndHour;
}

export function getExpectedWakeDate(now: number, expectedWakeHour: number): Date {
  const d = new Date(now);
  const wakeToday = new Date(d.getTime());
  wakeToday.setHours(expectedWakeHour, 0, 0, 0);

  if (d.getTime() >= wakeToday.getTime()) {
    return wakeToday;
  }

  const wakeYesterday = new Date(wakeToday.getTime());
  wakeYesterday.setDate(wakeYesterday.getDate() - 1);
  return wakeYesterday;
}

export function minutesSinceWake(now: number, expectedWakeHour: number): number {
  const wakeDate = getExpectedWakeDate(now, expectedWakeHour);
  const diff = now - wakeDate.getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / 60000);
}
