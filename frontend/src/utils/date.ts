export const formatActivityDate = (dateInput?: string | Date | null): string => {
  if (!dateInput) return 'Unknown time';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Unknown time';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  // Future tolerance / drift check
  if (diffSecs < 10 && diffSecs >= -30) {
    return 'Just now';
  }

  if (diffSecs >= 0) {
    if (diffMins < 60) {
      if (diffMins === 0) return 'Just now';
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }
  }

  // Check if Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Yesterday, ${timeStr}`;
  }

  // Standard date formatting: e.g., "28 Jun 2026, 7:45 PM"
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return `${day} ${month} ${year}, ${timeStr}`;
};
