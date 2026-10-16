// Calendar dates and wall-clock times must use the agreement's timezone, including DST.
export function localDateTime(instant: string, timezone = "Asia/Jakarta"): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
  const get = (key: string) => parts.find((part) => part.type === key)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function zonedDateTime(day: string, time: string, timezone = "Asia/Jakarta"): string {
  const wall = `${day}T${time}`;
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(wall)) throw new RangeError("Choose a valid local date and time.");
  const target = Date.parse(`${wall}:00Z`);
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 16) !== wall) throw new RangeError("Choose a valid local date and time.");
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const shown = Date.parse(`${localDateTime(new Date(instant).toISOString(), timezone)}:00Z`);
    const correction = target - shown;
    if (!correction) break;
    instant += correction;
  }
  if (localDateTime(new Date(instant).toISOString(), timezone) !== wall) throw new RangeError("This local time does not exist in the selected timezone.");
  const offset = Math.round((target - instant) / 60000), absolute = Math.abs(offset);
  return `${wall}:00${offset >= 0 ? "+" : "-"}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}
