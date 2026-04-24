export function storageKey(username: string) {
  return `srh_nf_${username}`;
}

export function parseMinutes(s?: string): number {
  if (!s || s === '-' || !s.includes(':')) return 0;
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minsToLabel(m: number): string {
  const abs = Math.abs(m);
  const h = Math.floor(abs / 60);
  const min = abs % 60;
  return `${m < 0 ? '-' : ''}${h}h ${String(min).padStart(2, '0')}min`;
}

export function fmtDate(d?: string): string {
  if (!d) return '-';
  const [y, mo, day] = d.split('-');
  return `${day}/${mo}/${y}`;
}

export function daysUntil(d?: string): number | null {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tgt = new Date(d + 'T00:00:00');
  return Math.ceil((tgt.getTime() - today.getTime()) / 86400000);
}

export function prazoStatus(d?: string): 'ok' | 'warn' | 'danger' | 'expired' {
  const days = daysUntil(d);
  if (days === null) return 'ok';
  if (days < 0) return 'expired';
  if (days <= 15) return 'danger';
  if (days <= 30) return 'warn';
  return 'ok';
}