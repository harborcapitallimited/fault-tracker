'use client';
import { SystemDevicesTable } from '@/components/system-devices-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRTDBList } from '@/firebase/database/use-db';
import type { SystemReport } from '@/lib/types';
import { PanelLeft, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/sidebar';
import { useMemo } from 'react';

export default function TotalSystemsPage() {
  const { toggleSidebar } = useSidebar();
  const { data: allDevices, isLoading } = useRTDBList<SystemReport>('systemReports');

  const devices = useMemo(() => (allDevices || []).filter(d => !d.deleted), [allDevices]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-4 border-b gap-4">
        <div className="flex items-center gap-4">
          <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="md:hidden"
            >
              <PanelLeft />
              <span className="sr-only">Toggle Sidebar</span>
          </Button>
          <Button asChild variant="outline" size="icon" className='hidden md:flex'>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Total Systems
          </h1>
        </div>
      </header>
      <div className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>All System Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <SystemDevicesTable devices={devices || []} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
