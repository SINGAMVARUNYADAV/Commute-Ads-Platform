import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(dateString: string | undefined | null) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function formatNumber(num: number | undefined | null) {
  if (num === undefined || num === null) return "0";
  return new Intl.NumberFormat('en-IN').format(num);
}
