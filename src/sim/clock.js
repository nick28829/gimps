const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function timeParts(total) {
  const day = Math.floor(total / 1440);
  const inDay = total - day * 1440;
  return {
    day: day + 1,
    weekday: WEEKDAYS[day % 7],
    hour: Math.floor(inDay / 60),
    minute: Math.floor(inDay % 60),
  };
}

/** Fractional hour of day, 0..24 */
export const hourOf = (total) => (total % 1440) / 60;
export const dayOf = (total) => Math.floor(total / 1440) + 1;

const pad = (n) => String(n).padStart(2, '0');

export function formatClock(total) {
  const p = timeParts(total);
  return `${p.weekday} · Day ${p.day} · ${pad(p.hour)}:${pad(p.minute)}`;
}

export const isNight = (total) => {
  const h = hourOf(total);
  return h >= 22 || h < 6;
};

/** 0 (full daylight) .. 1 (deep night) */
export function darkness(total) {
  const h = hourOf(total);
  if (h >= 7 && h < 18.5) return 0;
  if (h >= 18.5 && h < 21) return (h - 18.5) / 2.5;
  if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
  return 1;
}
