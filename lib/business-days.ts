/**
 * Calculate business days (Mon-Fri) between two dates.
 * Excludes weekends but not holidays.
 */
export function businessDaysBetween(start: Date, end: Date): number {
  if (end <= start) return 0;

  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  const endNorm = new Date(end);
  endNorm.setHours(0, 0, 0, 0);

  while (current < endNorm) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
  }

  return count;
}
