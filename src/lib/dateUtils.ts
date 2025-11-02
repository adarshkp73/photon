/**
 * Compares two Date objects to see if they are on the same calendar day.
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Formats a date for the chat separator with "Today", "Yesterday", etc.
 */
export function formatDateSeparator(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) {
    return 'Today';
  }
  
  if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  }

  // For other dates, return a full date string
  // e.g., "October 30, 2025"
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}