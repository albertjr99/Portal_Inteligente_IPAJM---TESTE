import { User, QuickLink, Event, Announcement } from '@/types';

export function filterByProfile(items: QuickLink[], user: User | null): QuickLink[] {
  if (!user) return [];
  return items.filter((item) => item.profiles.includes(user.profile));
}

export function filterBySector<T extends { sectors?: string[] }>(
  items: T[],
  sector: string
): T[] {
  return items.filter((item) => !item.sectors || item.sectors.length === 0 || item.sectors.includes(sector) || item.sectors.includes('personal'));
}

export function searchItems<T extends { title?: string; question?: string; answer?: string }>(
  items: T[],
  query: string
): T[] {
  const lowerQuery = query.toLowerCase();
  return items.filter((item) => {
    const searchText = [
      item.title,
      'question' in item ? item.question : '',
      'answer' in item ? item.answer : '',
    ]
      .join(' ')
      .toLowerCase();
    return searchText.includes(lowerQuery);
  });
}

// trackLinkClick de QuickLinksPage
const CLICK_KEY = (userId: string) => `ipajm-link-clicks-${userId}`;

export function trackLinkClick(userId: string, linkId: string) {
  if (!userId) return;

  const key = CLICK_KEY(userId);
  const data = JSON.parse(localStorage.getItem(key) || '{}');

  data[linkId] = (data[linkId] || 0) + 1;

  localStorage.setItem(key, JSON.stringify(data));
}

export function getTopLinks(userId: string, links: any[], limit = 4) {
  const key = CLICK_KEY(userId);
  const clickData = JSON.parse(localStorage.getItem(key) || '{}');

  return [...links]
    .sort((a, b) => {
    const diff = (clickData[b.id] || 0) - (clickData[a.id] || 0);
    if (diff !== 0) return diff;
    return 0;
    })
    .slice(0, limit);
}

// Usado em Dashboard; EventsPage...
export function parseDate(dateString: string): Date {
  return new Date(dateString.includes('T') ? dateString : `${dateString}T12:00:00`);
}

export function formatDate(dateString: string): string {
  const cleanDate = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
  const date = new Date(cleanDate);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string, timeString?: string): string {
  const formattedDate = formatDate(dateString);
  return timeString ? `${formattedDate} às ${timeString}` : formattedDate;
}

export function getUpcomingEvents(events: Event[]): Event[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  return events
    .filter((event) => {
      const eventDate = parseDate(event.date);
      const isSameMonth = eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
      
      // Zero out time for comparison
      const eventLocalDate = new Date(eventDate);
      eventLocalDate.setHours(0, 0, 0, 0);
      
      return isSameMonth && eventLocalDate >= today;
    })
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
}

export function getRecentAnnouncements(announcements: Announcement[], count: number = 5): Announcement[] {
  return announcements
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())
    .slice(0, count);
}

export function getDateLabel(dateString: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const date = parseDate(dateString);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) {
    return 'Hoje';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Amanhã';
  }
  return null;
}

export function formatRelativeTime(dateString: string): string {
  const date = parseDate(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Agora mesmo';
  if (diffInSeconds < 3600) return `Há ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Há ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 172800) return 'Ontem';
  
  return formatDate(dateString);
}