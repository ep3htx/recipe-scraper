export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

export function toDateOnly(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Chicago";

// "Today" as the user's local calendar date (APP_TIMEZONE), encoded as
// UTC midnight of that date -- the same representation toDateOnly()
// produces, and the same one a client-sent "yyyy-MM-dd" string parses
// to. The server runs in UTC, so toDateOnly(new Date()) drifts a full
// day off the user's actual "today" for several hours every evening
// (US Central is behind UTC). Use this instead anywhere "today" needs
// to match a date-only value that originated from the browser.
export function todayDateOnly(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

// Real UTC instants for the start/end of the user's local ("today")
// calendar day (APP_TIMEZONE) -- for range-querying timestamp columns like
// eatenAt/recordedAt (as opposed to todayDateOnly(), which is for
// date-only columns). The server runs in UTC, so startOfDay/endOfDay
// (which use Date#setHours, i.e. server-local time) drift from the user's
// actual local day by several hours every evening. This instead measures
// how far "now" is past local midnight (via Intl in APP_TIMEZONE) and
// subtracts that from the real instant, so it's correct regardless of the
// server's own timezone.
export function todayLocalStart(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")!.value) % 24;
  const m = Number(parts.find((p) => p.type === "minute")!.value);
  const sec = Number(parts.find((p) => p.type === "second")!.value);
  const msSinceLocalMidnight = (h * 3600 + m * 60 + sec) * 1000 + now.getMilliseconds();
  return new Date(now.getTime() - msSinceLocalMidnight);
}

export function todayLocalEnd(): Date {
  return new Date(todayLocalStart().getTime() + 86_400_000 - 1);
}
