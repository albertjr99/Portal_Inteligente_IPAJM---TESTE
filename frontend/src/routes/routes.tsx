import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';
import { RootLayout } from '@/layouts/RootLayout';
import { AdminRoute } from './AdminRoute';

const Dashboard = lazy(() =>
  import('@/app/pages/Dashboard').then(module => ({ default: module.Dashboard }))
);

const EventsPage = lazy(() =>
  import('@/app/pages/EventsPage').then(module => ({ default: module.EventsPage }))
);

const AnnouncementsPage = lazy(() =>
  import('@/app/pages/AnnouncementsPage').then(module => ({ default: module.AnnouncementsPage }))
);

const FAQPage = lazy(() =>
  import('@/app/pages/FAQPage').then(module => ({ default: module.FAQPage }))
);

const DocumentsPage = lazy(() =>
  import('@/app/pages/DocumentsPage').then(module => ({ default: module.DocumentsPage }))
);

const HRPage = lazy(() =>
  import('@/app/pages/HRPage').then(module => ({ default: module.HRPage }))
);

const TimeManagementPage = lazy(() =>
  import('@/app/pages/TimeManagement').then(module => ({ default: module.TimeManagementPage }))
);

const GerenciarRHPage = lazy(() =>
  import('@/app/pages/GerenciarRHPage').then(module => ({ default: module.GerenciarRHPage }))
);

const QuickLinksPage = lazy(() =>
  import('@/app/pages/QuickLinksPage').then(module => ({ default: module.QuickLinksPage }))
);

const NotFoundPage = lazy(() =>
  import('@/app/pages/NotFoundPage').then(module => ({ default: module.NotFoundPage }))
);

const Login = lazy(() =>
  import('@/app/pages/LoginPage').then(module => ({ default: module.Login }))
);

const AdminDashboard = lazy(() =>
  import('@/app/pages/AdminDashboard').then(module => ({ default: module.AdminDashboard }))
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'announcements', element: <AnnouncementsPage /> },
      { path: 'quick-links', element: <QuickLinksPage /> },
      { path: 'faq', element: <FAQPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'rh/banco-de-horas', element: <TimeManagementPage /> },
      { path: 'rh/gerenciar', element: <GerenciarRHPage /> },
      { path: 'hr', element: <HRPage /> },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        )
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);