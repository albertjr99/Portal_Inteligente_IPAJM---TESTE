export type UserProfile = 'super-admin' | 'admin' | 'usuário' | string;

export interface User {
  id: string;
  username: string;
  fullName: string;
  firstName: string;
  email: string;
  profile: UserProfile;
  sector: string;
  department: string;
  avatar?: string;
  
  // Dados do Active Directory
  title?: string;
  roles?: string[];
}

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  profiles: UserProfile[];
  sectors?: string[];
  external?: boolean;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  description: string;
  type: 'meeting' | 'deadline' | 'holiday' | 'training' | 'personal';
  sectors?: string[];
  owner_username?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  author: string;
  sectors?: string[];
  attachments?: string[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  sectors?: string[];
}

export interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  uploadDate: string;
  size: string;
  sectors?: string[];
}

export interface HRHighlight {
  id: string;
  title: string;
  description: string;
  link?: string;
  date: string;
  type: 'benefit' | 'vacancy' | 'training' | 'news';
}