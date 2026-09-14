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
