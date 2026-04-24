import { Outlet } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AuthGuard } from '@/routes/AuthGuard';

export function RootLayout() {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Outlet />
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
