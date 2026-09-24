import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { AdminProvider } from '@/context/admin-context';

export const metadata: Metadata = {
  title: 'Minxray Data Tracker',
  description: 'A comprehensive app to track equipment faults and clinical TB screening data.',
  icons: null,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-body antialiased', 'dark')} suppressHydrationWarning>
        <FirebaseClientProvider>
          <AdminProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className="flex justify-center bg-muted/20">
                <div className="w-full max-w-6xl bg-background lg:border-x border-border/50 min-h-screen shadow-sm flex flex-col overflow-hidden relative">
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
            <Toaster />
          </AdminProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
