'use client';
import { Button } from '@/components/ui/button';
import { useRTDBList } from '@/firebase';
import type { ImpactMonthlyReport } from '@/lib/types';
import { 
    ArrowLeft, 
    PanelLeft, 
    ClipboardList
} from 'lucide-react';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/sidebar';
import { ImpactMonthlyReportsManager } from '@/components/impact-monthly-reports-manager';

export default function ImpactMonthlyReportsPage() {
  const { toggleSidebar } = useSidebar();
  const { data: reports, isLoading } = useRTDBList<ImpactMonthlyReport>('impactMonthlyReports');

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-4 border-b gap-4 bg-background sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
              <PanelLeft />
          </Button>
          <Button asChild variant="outline" size="icon" className='hidden md:flex'>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className='flex items-center gap-2'>
              <ClipboardList className='h-6 w-6 text-primary' />
              <h1 className="text-2xl font-bold tracking-tight">IMPACT Monthly Audit Logs</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
        <ImpactMonthlyReportsManager reports={reports} isLoading={isLoading} />
      </div>
    </div>
  );
}
