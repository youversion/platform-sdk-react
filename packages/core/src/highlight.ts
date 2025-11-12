import type { HighlightColor } from './types';

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  { id: 0, color: '#fffe00', label: 'Yellow' },
  { id: 1, color: '#5dff79', label: 'Green' },
  { id: 2, color: '#00d6ff', label: 'Blue' },
  { id: 3, color: '#ffc66f', label: 'Orange' },
  { id: 4, color: '#ff95ef', label: 'Pink' },
] as const;

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
