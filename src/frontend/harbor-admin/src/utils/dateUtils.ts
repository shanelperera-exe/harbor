const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function format(dateInput: Date | string | number, formatStr: string): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const pad = (n: number) => n.toString().padStart(2, '0');

  const yyyy = d.getFullYear().toString();
  const MM = pad(d.getMonth() + 1);
  const MMM = MONTH_NAMES[d.getMonth()] || '';
  const dNum = d.getDate().toString();
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  return formatStr
    .replace('yyyy', yyyy)
    .replace('MMM', MMM)
    .replace('MM', MM)
    .replace('dd', dd)
    .replace(/\bd\b/g, dNum)
    .replace('HH', HH)
    .replace('mm', mm)
    .replace('ss', ss);
}

export function formatDistanceToNow(dateInput: Date | string | number, options?: { addSuffix?: boolean }): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 0) return 'just now';

  let result = '';
  if (diffInSeconds < 60) {
    result = `${diffInSeconds} seconds`;
  } else if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    result = `${mins} minute${mins === 1 ? '' : 's'}`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    result = `${hours} hour${hours === 1 ? '' : 's'}`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    result = `${days} day${days === 1 ? '' : 's'}`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    result = `${months} month${months === 1 ? '' : 's'}`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    result = `${years} year${years === 1 ? '' : 's'}`;
  }

  if (options?.addSuffix) {
    return `${result} ago`;
  }
  return result;
}
